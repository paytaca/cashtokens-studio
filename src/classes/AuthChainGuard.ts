import { scriptToBytecode } from '@cashscript/utils';
import { cashAddressToLockingBytecode, decodeTransaction, sha256, utf8ToBin } from '@bitauth/libauth';
import { Contract } from '@mainnet-cash/contract'
import { hexToBin, Network, UtxoI, binToHex, BCMR } from 'mainnet-js'
import { Argument, Artifact, SignatureTemplate } from 'cashscript';

import getWalletClass from 'src/utils/getWalletClass';
import { AuthChainGuardI } from './interfaces'
import toCashScript from 'src/utils/toCashScript';


export default class AuthChainGuard implements AuthChainGuardI {

  readonly contract: Contract;

  constructor(readonly ownerAddress: string, readonly ownerPubKey: unknown, readonly network: Network) {
    console.log('ownerPubKey', ownerPubKey)
    this.contract = new Contract(
      this.script(),
      [ownerPubKey],
      network
    )
  }

  /**
   * Publishes a BCMR update
   * @param {string} bcmrRawString - The updated hash of BCMR
   * @param {string} bcmrUrl - The updated url of the BCMR hash
   * @param {string} [tokenId] - If present, will try to build authchain in chaingraph
   * @returns {Promise<string|undefined>} Promise that resolves to tx or undefined if transaction signing request was cancelled
   */
  async updateBcmr(bcmrRawString: string, bcmrUrl: string, tokenId?: string): Promise<string|undefined> {

    const WalletClass = getWalletClass()
    console.log('pubkey', this.ownerPubKey)
    console.log('contract address', this.contract.getDepositAddress())
    const authChainGuardWallet = await WalletClass.watchOnly(this.contract.getDepositAddress())
    const identityOutput = (await authChainGuardWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token)).map(toCashScript)[0]

    if (!identityOutput) {
      throw new Error('authbase not found')
    }
    const ownerWallet = await WalletClass.watchOnly(this.ownerAddress)
    const funderInput = (await ownerWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > 3000).map(toCashScript)[0]
    const minerFee = 1000

    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    let transaction
    let decoded
    try {
      const cUpdateBcmr = this.contract.getContractFunction('TransferOrUpdateOrBurn');

      const bcmrHash = sha256.hash(utf8ToBin(bcmrRawString));
      transaction =
        cUpdateBcmr(Uint8Array.from([]), Uint8Array.from(Array(65)))
          .from(identityOutput)
          .fromP2PKH(funderInput, sig)
          .to([{
            to: this.contract.getDepositAddress(),
            amount: identityOutput.satoshis
          }])
          .withOpReturn([
            'BCMR',
            binToHex(bcmrHash), // sha256 of the contents from the uri below
            bcmrUrl.replace('https://', '')
          ])
          .to([{
            to: this.ownerAddress,
            amount: funderInput.satoshis - BigInt(minerFee)
          }])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))
      decoded = decodeTransaction(hexToBin(await transaction.build()));
      if (typeof decoded === 'string') {
        console.log('decoded:', decoded)
        throw new Error('Failed to decode transaction')
        return;
      }
    } catch (error) {
      console.log(error)
      throw new Error('Error building transaction')
    }

    // signing request
    let signingResult
    try {

      const bytecode = (transaction as any).redeemScript;
      const artifact = {...this.contract.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this.contract.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(identityOutput.satoshis),
          // token: identityOutput.token && {
          //   ...identityOutput.token,
          //   category: hexToBin(identityOutput.token.category),
          //   nft: identityOutput.token.nft && {
          //     ...identityOutput.token.nft,
          //     commitment: hexToBin(identityOutput.token.nft.commitment),
          //   },
          // },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        }, {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(this.ownerAddress) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        }],
        broadcast: false,
        userPrompt: 'Sign transaction to update BCMR'
      });

    } catch (error) {
      console.log(error)
      throw new Error('Error signing transaction')

    }

    // Tx signing success, submitting transaction
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tx = await ownerWallet.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      if (tokenId) {
        await BCMR.buildAuthChain({ transactionHash: tokenId, network: ownerWallet.network })
      }
      return tx

    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
      return
    }
  }

  transfer(): void {
    console.log('transfering ownership')
  }

  burn(): void {
    console.log('burning auth chain')
  }

 script(){
    return `contract AuthchainGuard(pubkey ownerPubKey) {
      function TransferOrUpdateOrBurn(pubkey newOwnerPubKey, sig ownerSignature) {
        // Require owner's signature for all operations
        require(checkSig(ownerSignature, ownerPubKey));

        bytes spentFrom = tx.inputs[this.activeInputIndex].lockingBytecode;
        // If locking bytecode is not being changed then this is an update.
        if (
          tx.outputs[0].lockingBytecode
          == spentFrom
        ) {
          // Update
          require(newOwnerPubKey == 0x);

          // Require input index 0 so multiple autchains with this contract
          // can't be accidentially and irreversibly merged.
          require(this.activeInputIndex == 0);
        }
        // Allow only clearly intentional burn form:
        // OP_RETURN <'BURN'> <this_inputs_outpoint_hash>
        else if (
          tx.outputs[0].lockingBytecode
          == 0x6a + 0x04 + bytes("BURN")
            + 0x20 + tx.inputs[this.activeInputIndex].outpointTransactionHash
        ) {
          // Burn
          require(newOwnerPubKey == 0x);
        }
        else {
          // Self-mutate the covenant to be owned by newOwnerPubKey
          require(newOwnerPubKey.length == 33);
          bytes oldRedeemTail = this.activeBytecode.split(34)[1];
          bytes newRedeemScript = 0x21 + bytes(newOwnerPubKey) + oldRedeemTail;
          require(
            tx.outputs[0].lockingBytecode
            == 0xa914 + hash160(newRedeemScript) + 0x87
          );

          // Require input index 0 so multiple autchains with this contract
          // can't be accidentially and irreversibly merged.
          require(this.activeInputIndex == 0);
        }
      }
    }`
  }
}
