import { Network, UtxoI, Wallet } from 'mainnet-js'
import { MintingCovenantI, QuasarNotify } from './interfaces'
import { Contract } from '@mainnet-cash/contract'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, SignatureTemplate, Utxo } from 'cashscript'
import getWalletClass from 'src/utils/getWalletClass'
import { TransactionCommon, binToHex, cashAddressToLockingBytecode, decodeTransaction, hexToBin } from '@bitauth/libauth'
import { scriptToBytecode } from '@cashscript/utils'
import { Notify } from 'quasar'
import assert from 'assert'

export default class MintingCovenant implements MintingCovenantI {

  readonly contract: Contract

  constructor(readonly tokenId: string, readonly network: Network = Network.MAINNET, readonly notify: QuasarNotify) {
    this.contract = new Contract(
      this.script(),
      [`0x${tokenId.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
      network
    )
  }

  static getInstance(tokenId: string, network: Network = Network.MAINNET, notify: QuasarNotify): MintingCovenantI {
    return new MintingCovenant(tokenId, network, notify)
  }


  async unlockWithNft(p: {contractOwner:string, to: string, ftAmountToUnlock: bigint|string|number }): Promise<string | undefined> {
    const contractWallet = await getWalletClass().watchOnly(this.contract.getTokenDepositAddress())
    const fungibleReservesUtxo = (await contractWallet.getAddressUtxos()).find((u: UtxoI) => u.token?.tokenId === this.tokenId && u.token.amount > 0)
    if(!fungibleReservesUtxo){
      throw new Error('Contract owner does not have fungible reserves!')
    }
    const toWallet = await getWalletClass().watchOnly(p.to)
    const contractOwnersWallet = await getWalletClass().watchOnly(p.contractOwner)
    const contractOwnersUtxos = (await contractOwnersWallet.getAddressUtxos())
    const mintingBatonUtxo = contractOwnersUtxos.find((u:UtxoI) => u.token?.tokenId === this.tokenId && u.token.commitment === '00')
    if (!mintingBatonUtxo) {
      throw new Error('Unauthorized to unlock fungible reserves')
    }
    const funderInput:UtxoI[] = contractOwnersUtxos.filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > 4000)
    if (!funderInput) {
      throw new Error('Insufficient balance to fund the transaction')
    }
    const inputs = [fungibleReservesUtxo, mintingBatonUtxo, funderInput[0]].map(toCashScript)
    console.log('FT RESERVES', inputs[0])
    console.log('MINTING BATON', inputs[1])
    console.log('FUNDER', inputs[2])
    const minerFee = 1500
    let transaction
    let decoded
    const sig1 = new SignatureTemplate(Uint8Array.from(Array(32)))
    const sig2 = new SignatureTemplate(Uint8Array.from(Array(32)))
    const f = this.contract.getContractFunction('unlockWithNft')
    try {
      transaction =
          f().from(inputs[0])
          .fromP2PKH(inputs[1], sig1)
          .fromP2PKH(inputs[2], sig1)
          .to([{
            // Return fungible reserves to minting covenant contract
            to: this.contract.getTokenDepositAddress(),
            amount: inputs[0].satoshis,
            token: {
              category: inputs[0].token!.category,
              amount: BigInt(inputs[0].token!.amount) - BigInt(p.ftAmountToUnlock)
            }
          }])
          .to([{
            // Return minting baton to owner
            to: contractOwnersWallet.getTokenDepositAddress(),
            amount: inputs[1].satoshis,
            token: {
              category: inputs[1].token!.category,
              amount: BigInt(0),
              nft: inputs[1].token!.nft
            }
          }])
          .to([{
            // fungible token recipient
            to: toWallet.getTokenDepositAddress(),
            amount: BigInt(1000),
            token: {
              category: inputs[0].token!.category,
              amount: BigInt(p.ftAmountToUnlock)
            }
          }])
          .to([{
            // change
            to: p.contractOwner,
            amount: inputs[2].satoshis - BigInt(minerFee) - BigInt(1000)
          }])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))
      console.log('TX', await transaction.build())
      decoded = decodeTransaction(hexToBin(await transaction.build()));
      console.log(decoded)
      if (typeof decoded === 'string') {
        console.log('decoded:', decoded)
        throw new Error('Failed to decode transaction')
      }
    } catch (error) {
      console.log(error)
      throw new Error('Error building transaction')
    }

    // initiate signature request
    let endNotif = this.notify({message: 'Waiting for signature', timeout: 0})
    let signingResult
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = {...this.contract.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this.contract.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(inputs[0].satoshis),
          token: inputs[0].token && {
            ...inputs[0].token,
            category: hexToBin(inputs[0].token.category),
            // nft: inputs[0].token.nft && {
            //   ...inputs[0].token.nft,
            //   commitment: hexToBin(inputs[0].token.nft.commitment),
            // },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        },
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(contractOwnersWallet.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(inputs[1].satoshis),
          token: inputs[1].token && {
            ...inputs[1].token,
            category: hexToBin(inputs[1].token.category),
            nft: inputs[1].token.nft && {
              ...inputs[1].token.nft,
              commitment: hexToBin(inputs[1].token.nft.commitment),
            },
          }
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(p.contractOwner) as any).bytecode,
          valueSatoshis: inputs[2].satoshis
        }],
        broadcast: false,
        userPrompt: `Release ${p.ftAmountToUnlock} tokens to ${p.contractOwner}`
      });

    } catch (error) {
      console.log(error)
      throw new Error('Error signing transaction')
    }
    // console.log('SIGNED', signingResult.signedTransaction)
    // console.log('CONTRACT INPUT LOCKING BYTECODE', binToHex((cashAddressToLockingBytecode(this.contract.getTokenDepositAddress()) as any).bytecode))
    const decodedSigned:TransactionCommon | string = decodeTransaction(hexToBin(signingResult.signedTransaction)) as TransactionCommon
    // console.log('DECODED SIGNED OUTPUT[0] LOCKING BYTECODE', binToHex(decodedSigned.outputs[0].lockingBytecode))
    // console.log('DECODED SIGNED INPUTS[1] NFT COMMITMENT', inputs[1].token?.nft?.commitment)
    // console.log('DECODED SIGNED OUTPUTS[1] NFT COMMITMENT', binToHex(decodedSigned!.outputs[1]!.token!.nft!.commitment))
    assert(inputs[1].token!.category === this.tokenId)
    assert(binToHex((cashAddressToLockingBytecode(this.contract.getTokenDepositAddress()) as any).bytecode) === binToHex(decodedSigned.outputs[0].lockingBytecode))
    assert(inputs[1].token?.nft?.commitment === binToHex(decodedSigned!.outputs[1]!.token!.nft!.commitment))
    endNotif && endNotif()
    endNotif = this.notify({message: 'Submitting transaction', timeout: 0})
    // Tx signing success, submitting transaction
    try {
      const tx = await contractOwnersWallet.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      return tx
    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
    } finally{
      endNotif && endNotif()
    }
  }

  script(): string {
    return `
    pragma cashscript ^0.8.0;

    // covenant of the CCI token standard
    // Covenant unlocked by a specific NFT

    // Opcode count: 8 (max 201)
    // Bytesize: 46 (max 520)

    contract mintingCovenant(
        bytes tokenId
    ) {
        function unlockWithNft() {
            // Check that the first input holds the minting baton
            require(tx.inputs[1].tokenCategory == tokenId);
            require(tx.inputs[1].nftCommitment == 0x00);
            // Self preservation of the minting covenant as the first output
            require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
        }
    }`
  }

}
