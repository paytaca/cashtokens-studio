import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin, sha256 } from '@bitauth/libauth'
import CashStudioToken from "./CashStudioToken"
import { AuthChainGuard, CashStudioTokenI, MBC, Message, Registry } from "./interfaces"
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/utils/getWalletClass'
import constants from 'src/constants'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, SignatureTemplate, Utxo } from 'cashscript'
import { scriptToBytecode } from '@cashscript/utils'
import getByteCount from 'src/utils/getByteCount'

export default class MintingCovenant implements CashStudioTokenI, MBC {
  tokenId?: string
  amount?: string
  capability?: NFTCapability
  commitment?: string
  registry?: Registry
  ownerWallet?: Wallet
  satoshis: string
  baton?: UtxoI
  protected _processing?: string
  protected _message?: Message
  private _contract?: Contract
  constructor(p: {tokenId?:string, amount?:string, capability?: NFTCapability, commitment?:string, satoshis?:string, ownerWallet?: Wallet}) {
    this.tokenId = p.tokenId
    this.amount = p.amount
    this.capability = p.capability
    this.commitment = p.commitment
    this.satoshis = p.satoshis?.toString() || ''
    this.ownerWallet = p.ownerWallet
    this.createContract()
  }

  createContract() {
    if (this.ownerWallet) {
      this._contract = new Contract(
        this.contractScript,
        [this.ownerWallet.getPublicKeyHash()],
        this.ownerWallet.network
      )
    }
  }

  protected ensureTokenId() {
    if (!this.tokenId) {
      throw new Error('Invalid token id')
    }
  }

  protected ensureContract(){
    if (!this.contract) {
      throw new Error('Contract not properly initialized, make sure the ownerWallet is set')
    }
  }

  protected ensureOwnerWallet(){
    if (!this.ownerWallet) {
      throw new Error('Owner wallet not set')
    }
  }

  get processing(): string | undefined {
    return this._processing
  }
  get message(): Message | undefined {
    return this._message
  }

  get contract(): Contract | undefined {
    return this._contract
  }

  /**
   * Alias to the authchain guard function, it has a single function so we can use
   * this for any authchain guard interaction
   */
  get unlockWithNft():any {
    return this._contract?.getContractFunction('unlockWithNft')
  }

  async releaseTokens(p: {contractOwner:string, to: string, ftAmountToUnlock: bigint|string|number }): Promise<string | undefined> {
    this.ensureOwnerWallet()
    this.ensureContract()
    this.ensureTokenId()
    this._processing = 'Processing'
    const contractWallet = await getWalletClass().watchOnly(this._contract!.getTokenDepositAddress())
    const mbcUtxo = (await contractWallet.getAddressUtxos()).find((u: UtxoI) => u.token && u.token?.tokenId === this.tokenId && u.token?.amount > 0)
    if(!mbcUtxo){
      throw new Error('No MBC utxo found!')
    }
    const toWallet = await getWalletClass().watchOnly(p.to)
    const contractOwnersWallet = await getWalletClass().watchOnly(p.contractOwner)
    const contractOwnersUtxos = (await contractOwnersWallet.getAddressUtxos())
    this.baton = contractOwnersUtxos.find((u:UtxoI) => u.token && u.token.tokenId === this.tokenId && u.token.commitment === '00')
    if (!this.baton) {
      throw new Error('Unauthorized!Spender does not own baton')
    }
    const funderInput:UtxoI[] = contractOwnersUtxos.filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > 4000)
    if (!funderInput) {
      throw new Error('Insufficient balance to fund the txn')
    }

    const inputs = [mbcUtxo, this.baton, funderInput[0]].map(toCashScript)
    const minerFee = 1500
    let transaction
    let decoded
    const sig1 = new SignatureTemplate(Uint8Array.from(Array(32)))
    const sig2 = new SignatureTemplate(Uint8Array.from(Array(32)))
    try {
      transaction =
          this.unlockWithNft().from(inputs[0])
          .fromP2PKH(inputs[1], sig1)
          .fromP2PKH(inputs[2], sig1)
          .to([{
            // Return fungible reserves to minting covenant contract
            to: this._contract!.getTokenDepositAddress(),
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
      decoded = decodeTransaction(hexToBin(await transaction.build()));
      if (typeof decoded === 'string') {
        console.log('decoded:', decoded)
        throw new Error('Failed to decode transaction')
      }
    } catch (error) {
      console.log(error)
      throw new Error('Error building transaction')
    }

    this._processing = 'Waiting for signature'
    let signingResult
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = {...this._contract!.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this._contract!.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(inputs[0].satoshis),
          token: inputs[0].token && {
            ...inputs[0].token,
            category: hexToBin(inputs[0].token.category),
            nft: inputs[0].token.nft && {
              ...inputs[0].token.nft,
              commitment: hexToBin(inputs[0].token.nft.commitment),
            },
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

    if (!signingResult) {
      delete this._processing
      return
    }
    this._processing = 'Waiting for signature'
    try {
      const tx = await contractOwnersWallet.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      this._message = { type: 'success', text: `${this.amount} token issued to ${p.to.replace(p.to.substring(10,28),'...')}`}
      return tx
    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
    } finally {
      delete this._processing
    }
  }


  get contractScript(): string {
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
