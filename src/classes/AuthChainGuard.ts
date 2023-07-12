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
      const cUpdateBcmr = this.contract.getContractFunction('updateBcmr');

      const bcmrHash = sha256.hash(utf8ToBin(bcmrRawString));
      transaction =
        cUpdateBcmr(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)))
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

    console.log('transaction', transaction)

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
    return `// AuthchainGuard v1.0.1

    // The contract ensures that, when publishing a BCMR, the authchain is
    // correctly passed on to the next index-0 output.

    // Methods:
    // - Publish (ownerPubKey, ownerSignature, '0x'): publishes a BCMR and passes the
    // covenant on to a new index 0 output with the same key.
    // - Burn (ownerPubKey, ownerSignature, '0x'): burns the authchain.
    // Requires specific form of burn output to avoid accidental burn.
    // - Release (ownerPubKey, ownerSignature, '0x01'): Frees the authchain from the covenant.
    // - Transfer (ownerPubKey, ownerSignature, newOwnerPubKeyHash): Changes the owning key
    // of the covenant by mutating the covenant locking bytecode.

    pragma cashscript ^0.8.0;

    contract AuthchainGuard(
      bytes20 ownerPubKeyHash
    ) {
      function PublishOrBurnOrReleaseOrTransfer(
        pubkey ownerPubKey,
        sig ownerSignature,
        bytes20 newOwnerPubKeyHash,
      ) {
        // Schnorr sig only, because they are of fixed-length so later
        // checks are simpler as they don't need to check the length, and
        // the signatures are smaller, and generally it's just better than
        // ECDSA.
        bytes sigBytes = bytes(ownerSignature);
        require(sigBytes.length == 65);

        // Require owner's signature for all operations
        require(hash160(ownerPubKey) == ownerPubKeyHash);
        require(checkSig(ownerSignature, ownerPubKey));

        // No funny business, require it to be of SIGHASH_ALL type
        require(sigBytes.split(64)[1] == 0x41);

        // If spender doesn't change the output address then we infer the
        // intention is to publish, and so we enter the branch where we
        // verify the publishing transaction.
        bool isPublishing =
          tx.outputs[0].lockingBytecode
          == tx.inputs[this.activeInputIndex].lockingBytecode;
        if (isPublishing) {
          // Publish

          // Not used, require 0 so it can't be malleated by 3rd parties.
          // Contract would work the same if we allowed any value here, but
          // it is good practice to keep it tight unless there's a reason
          // FOR allowing malleability by 3rd parties.
          require(newOwnerPubKeyHash == bytes20(0));

          // Require input index 0, this ensures that 2 instances of the
          // same contract can't be spent together, and that it can't be
          // spent together with other similar "guard" contracts that
          // require input index 0.
          // This prevents accidentally and irreversibly merging 2
          // authchains.
          // We will allow other input index only in case of burning or
          // releasing.
          // If we'd remove this check, we'd also have to replace all
          // instances of inputs[0] with inputs[this.activeInputIndex].
          require(this.activeInputIndex == 0);
        }
        // If spender sets the output to a particular form, then we infer
        // the intention is to burn and allow it.
        // Burn output form: OP_RETURN <'BURN'> <this_inputs_outpoint_hash>
        else if (
          tx.outputs[0].lockingBytecode
          == 0x6a + 0x04 + bytes("BURN") + 0x20
          + tx.inputs[this.activeInputIndex].outpointTransactionHash
        ) {
          // Burn

          // Not used, require 0 so it can't be malleated by 3rd parties.
          // Contract would work the same if we allowed any value here, but
          // it is good practice to keep it tight unless there's a reason
          // FOR allowing malleability by 3rd parties.
          require(newOwnerPubKeyHash == bytes20(0));
        }
        else if (
          newOwnerPubKeyHash == bytes20(1)
        ) {
          // Release

          // Free the authchain from this covenant (to allow later
          // transition to some other kind of contract).
          // Note: this seems like it would make the TX 3rd party malleable,
          // but 3rd parties can't produce a valid signature for the
          // outputs, and at the top we require owner to use SIGHASH_ALL.
          // This means that we can enter this branch only if owner signed
          // a set of outputs which didn't match any of the other branches,
          // branches which all have other requirements on newOwnerPubKey.
          // Therefore, this switch can only be flipped by the owner, as an
          // "are you sure you want to remove all safety checks" mechanism.
        }
        else {
          // Transfer

          // Require input index 0.
          // See above note with 1st occurrence of this check as to why.
          require(this.activeInputIndex == 0);

          // Self-mutate the covenant to be owned by newOwnerPubKey
          require(newOwnerPubKeyHash.length == 20);
          // We split at 21 because we have a push op for the 21-byte key,
          // i.e. 0x21{20-byte key}.
          bytes oldRedeemTail = this.activeBytecode.split(21)[1];
          bytes newRedeemScript = 0x14 + newOwnerPubKeyHash
            + oldRedeemTail; // key length + key + oldRedeemTail
          require(
            tx.outputs[0].lockingBytecode
            == 0xa914 + hash160(newRedeemScript) + 0x87
          );
        }
      }
    }`
  }
}
