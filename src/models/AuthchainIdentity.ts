import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin, sha256 } from '@bitauth/libauth'
import CashStudioToken from "./CashStudioToken"
import { AuthChainGuard, CashStudioTokenI, Message, Registry } from "./interfaces"
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/utils/getWalletClass'
import constants from 'src/constants'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, SignatureTemplate, Utxo } from 'cashscript'
import { scriptToBytecode } from '@cashscript/utils'
import getByteCount from 'src/utils/getByteCount'

export default class AuthchainIdentity implements CashStudioTokenI, AuthChainGuard {
  tokenId?: string
  amount?: string
  capability?: NFTCapability
  commitment?: string
  registry?: Registry
  ownerWallet?: Wallet
  satoshis: string

  protected _processing?: string
  protected _message?: Message
  private _contract?: Contract
  constructor(p: {tokenId?:string, amount?:string, capability?: NFTCapability, commitment?:string, registry?: Registry, satoshis?:string, ownerWallet?: Wallet}) {
    this.tokenId = p.tokenId
    this.amount = p.amount
    this.capability = p.capability
    this.commitment = p.commitment
    this.registry = p.registry
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
  get publishOrBurnOrReleaseOrTransfer():any {
    return this._contract?.getContractFunction('PublishOrBurnOrReleaseOrTransfer')
  }

  get contractScript(): string {
    return `
    // AuthchainGuard v1.0.1

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
      bytes ownerPubKeyHash
    ) {
      function PublishOrBurnOrReleaseOrTransfer(
        pubkey ownerPubKey,
        sig ownerSignature,
        bytes newOwnerPubKeyHash,
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
        // Ron-added 0x20 SIGHASH_UTXOS (paytaca's default)
        require(sigBytes.split(64)[1] == 0x61);

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
          require(newOwnerPubKeyHash == 0x);

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
          require(newOwnerPubKeyHash == 0x);
        }
        else if (
          newOwnerPubKeyHash == 0x01
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
          // We split at 34 because we have a push op for the 33-byte key,
          // i.e. 0x21{33-byte key}.
          bytes oldRedeemTail = this.activeBytecode.split(21)[1];
          bytes newRedeemScript = 0x14 + newOwnerPubKeyHash
            + oldRedeemTail;
          require(
            tx.outputs[0].lockingBytecode
            == 0xa914 + hash160(newRedeemScript) + 0x87
          );
        }
      }
    }`
  }

  async getIdentities(): Promise<AuthchainIdentity[]>{
    this.ensureOwnerWallet()
    this.ensureContract()
    const contractWallet = await getWalletClass().watchOnly(this.contract!.getDepositAddress())
    const identityOutputs = (await contractWallet!.getAddressUtxos()).filter((utxo: UtxoI) => utxo.token?.commitment === constants.IDENTITY)
    return identityOutputs.map((u:UtxoI) => {
      return new AuthchainIdentity({
        tokenId: u.token?.tokenId,
        commitment: u.token?.commitment,
        capability: u.token?.capability,
        amount: u.token?.amount.toString(),
        satoshis: u.satoshis?.toString(),
        ownerWallet: this.ownerWallet
      })
    })
  }
  /**
   * Publishes registry on chain
   * @returns {Promise<string|undefined>} Promise that resolves to tx or undefined if transaction signing request was cancelled
   */
  async publish(opt?:{buildAuthchain?:boolean}): Promise<string|undefined> {

    this.ensureTokenId()
    this.ensureContract()
    this.ensureOwnerWallet()

    if (!this.registry?.contentHash || !this.registry?.url) {
      throw new Error('Registry not set')
    }

    const contractWallet = await getWalletClass().watchOnly(this.contract!.getDepositAddress())
    const identityOutputs = (await contractWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(utxo.token) && utxo.token?.tokenId === this.tokenId && utxo.token?.commitment === constants.IDENTITY).map(toCashScript)

    const identityOutput = identityOutputs[0]
    if (!identityOutput) {
      throw new Error('authbase not found')
    }

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > 3000).map(toCashScript)[0]
    if (!funderInput) {
      throw new Error('insufficient balance')
    }

    const minerFee = 1000
    let transaction
    let decoded
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    this._processing = 'Processing transaction'
    try {
      transaction =
        this.publishOrBurnOrReleaseOrTransfer(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)), '0x')
          .from(identityOutput)
          .fromP2PKH(funderInput, sig)
          .to([{
            to: this.contract!.getTokenDepositAddress(),
            amount: identityOutput.satoshis,
            token: identityOutput.token
          }])
          .withOpReturn([
            'BCMR',
            binToHex(sha256.hash(utf8ToBin(this.registry!.contentHash))), // sha256 of the contents from the uri below
            this.registry!.url.replace('https://', '')
          ])
          .to([{
            to: this.ownerWallet?.getDepositAddress(),
            amount: funderInput.satoshis - BigInt(minerFee)
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
      const artifact = {...this.contract!.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this.contract!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(identityOutput.satoshis),
          token: identityOutput.token && {
            ...identityOutput.token,
            category: hexToBin(identityOutput.token.category),
            nft: identityOutput.token.nft && {
              ...identityOutput.token.nft,
              commitment: hexToBin(identityOutput.token.nft.commitment),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        }, {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(this.ownerWallet!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        }],
        broadcast: false,
        userPrompt: 'Sign transaction to update BCMR'
      });

    } catch (error) {
      console.log(error)
      throw new Error('Error signing transaction')
    }

    if (!signingResult) {
      delete this._processing
      return
    }

    this._processing = 'Publishing'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      if (opt?.buildAuthchain) {
        await BCMR.buildAuthChain({ transactionHash: this.tokenId!, network: this.ownerWallet!.network })
      }
      return tx
    } catch (error) {
      console.log('Error:AuthChainGuard@publish', error)
    } finally {
      delete this._processing
    }
  }

  /**
   * Transfers ownership of identity output
   */
  async transfer(newOwnerAddress: string): Promise<string|undefined> {
    this.ensureTokenId()
    this.ensureContract()
    this.ensureOwnerWallet()
    const contractWallet = await getWalletClass().watchOnly(this.contract!.getTokenDepositAddress())
    const identityOutputs
      = (await contractWallet.getAddressUtxos()).filter((utxo: UtxoI) => utxo.token?.tokenId && utxo.token?.tokenId === this.tokenId).map(toCashScript)
    const identityOutput = identityOutputs[0]

    if (!identityOutput) {
      throw new Error('Identity output not found')
    }

    const funderInput
      = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > 3000).map(toCashScript)[0]

    if (!funderInput) {
      throw new Error('insufficient balance')
    }
    this._processing = 'Processing transfer'
    const minerFee = 1000
    let transaction
    let decoded
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const newOwnerWallet = await (getWalletClass()).watchOnly(newOwnerAddress)
    const newOwnerAuthchainGuardContract = new Contract(this.contractScript, newOwnerWallet.getPublicKeyHash(false), newOwnerWallet.network)
    try {
      transaction =
        this.publishOrBurnOrReleaseOrTransfer(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)), newOwnerWallet.getPublicKeyHash(false))
          .from(identityOutput)
          .fromP2PKH(funderInput, sig)
          .to([{
            to: newOwnerAuthchainGuardContract.getTokenDepositAddress(),
            amount: identityOutput.satoshis,
            token: identityOutput.token
          }])
          .to([{
            to: this.ownerWallet!.getDepositAddress(),
            amount: funderInput.satoshis - BigInt(minerFee)
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
    let signed
    try {

      const bytecode = (transaction as any).redeemScript;
      const artifact = {...this.contract!.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      signed = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this.contract!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(identityOutput.satoshis),
          token: identityOutput.token && {
            ...identityOutput.token,
            category: hexToBin(identityOutput.token.category),
            nft: identityOutput.token.nft && {
              ...identityOutput.token.nft,
              commitment: hexToBin(identityOutput.token.nft.commitment),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        }, {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(this.ownerWallet!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        }],
        broadcast: false,
        userPrompt: 'Sign transaction to update BCMR'
      });

    } catch (error) {
      console.log(error)
      throw new Error('Error signing transaction')
    }

    if (!signed) {
      delete this._processing
      return
    }
    // Tx signing success, submitting transaction
    this._processing = 'Transferring'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signed!.signedTransaction), true);
      this._message = { type: 'success', text: 'Success!Authchain transferred. Tx=' + tx}
      return tx
    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
    } finally {
      delete this._processing
    }
  }

  async burn(): Promise<string|undefined> {
    this.ensureTokenId()
    this.ensureContract()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    const contractWallet = await getWalletClass().watchOnly(this.contract!.getTokenDepositAddress())
    const identityOutputs = (await contractWallet.getAddressUtxos()).filter((u: UtxoI)=> u.token?.tokenId == this.tokenId).map(toCashScript)
    const identityOutput: Utxo = identityOutputs[0]
    if (!identityOutput) {
      throw new Error('Identity output not found in contract utxos')
    }
    let transaction
    let decoded
    try {
      transaction = this.publishOrBurnOrReleaseOrTransfer(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)), '0x')
          .from(identityOutput)
          .withOpReturn([
            'BURN',
            `0x${identityOutput.txid.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`
          ])
          .withoutChange().withoutTokenChange()

      decoded = decodeTransaction(hexToBin(await transaction.build()));

    } catch (error) {
      console.log(error)
    }

    if (!decoded || typeof decoded === 'string') {
      throw new Error('Failed to decode transaction')
    }

    const bytecode = (transaction as any).redeemScript;
    const artifact = {...this.contract!.artifact} as Partial<Artifact>;
    delete artifact.source;
    delete artifact.bytecode;
    this._processing = 'Waiting for signature'
    let signed
    try {
      signed = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this.contract!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(identityOutput.satoshis),
          token: identityOutput.token && {
            ...identityOutput.token,
            category: hexToBin(identityOutput.token.category),
            nft: identityOutput.token.nft && {
              ...identityOutput.token.nft,
              commitment: hexToBin(identityOutput.token.nft.commitment),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        }],
        broadcast: false,
        userPrompt: 'Burning Identity Output'
      });
    } catch (error) {
      console.log('SIGNING ERROR', error)
    }

    if (!signed) {
      delete this._processing
      return ''
    }
    // Tx signing success, submitting transaction
    this._processing = 'Burning'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signed!.signedTransaction), true);
      this._message = {type: 'success', text: 'Success! Autchain burned. Tx=' + tx}
      return tx
    } catch (error) {
      this._message = {type: 'error', text: 'Failed burning authchain'}
      console.log('Error creating FT Token during submission of txn', error)
    } finally {
      delete this._processing
    }
  }

  async release(tokenId: string, recipient: string): Promise<string|undefined> {
    this.ensureTokenId()
    this.ensureContract()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    const contractWallet = await getWalletClass().watchOnly(this.contract!.getTokenDepositAddress())
    const byteCount = getByteCount({'P2SH-P2WPKH':1, P2PKH:1}, {P2WSH:1, P2PKH:1}) // generous
    const minerFee = Math.ceil(byteCount * 1.1) + 400
    const funderInput = (await this.ownerWallet?.getAddressUtxos())?.filter(u=>Boolean(!u.token) && u.satoshis > minerFee).map(toCashScript)
    if (!funderInput) {
      throw new Error('Insufficient balance to fund txn')
    }
    const identityOutputs = (await contractWallet!.getAddressUtxos()).filter((u: UtxoI)=> u.token?.tokenId && u.token?.tokenId == this.tokenId).map(toCashScript)
    const identityOutput: Utxo = identityOutputs[0]
    if (!identityOutput) {
      throw new Error('Identity output not found')
    }

    let transaction
    let decoded
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    try {
      transaction = this.publishOrBurnOrReleaseOrTransfer(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)), '0x01')
          .from(identityOutput)
          .fromP2PKH(funderInput[0], sig)
          .to([{to: recipient, amount: identityOutput.satoshis, token: identityOutput.token}])
          .to([{to: this.ownerWallet!.getAddressUtxos(), amount:funderInput[0].satoshis - BigInt(minerFee)}])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))
      decoded = decodeTransaction(hexToBin(await transaction.build()));
    } catch (error) {
      console.log(error)
    }

    if (!decoded || typeof decoded === 'string') {
      throw new Error('Failed to decode transaction')
    }

    const bytecode = (transaction as any).redeemScript;
    const artifact = {...this.contract!.artifact} as Partial<Artifact>;
    delete artifact.source;
    delete artifact.bytecode;
    let signed
    try {
      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      signed = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this.contract!.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: identityOutput.satoshis,
          token: identityOutput.token && {
            ...identityOutput.token,
            category: hexToBin(identityOutput.token.category),
            nft: identityOutput.token.nft && {
              ...identityOutput.token.nft,
              commitment: hexToBin(identityOutput.token.nft.commitment),
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
          lockingBytecode: (cashAddressToLockingBytecode(this.ownerWallet!.getDepositAddress()) as any).bytecode,
          valueSatoshis: funderInput[0].satoshis,
        }
        ],
        broadcast: false,
        userPrompt: 'Release Identity Output'
      });
    } catch (error) {
      console.log('Paytaca signing error', error)
    }

    if (!signed) {
      delete this._processing
      return ''
    }
    this._processing = 'Releasing'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signed!.signedTransaction), true);
      this._message = {type: 'success', text: 'Success!Authchain released. Tx=' + tx}
      return tx
    } catch (error) {
      this._message = {type: 'error', text: 'Failed releasing autchain'}
      console.log('Error on submission of transaction', error)
    } finally {
      delete this._processing
    }
  }
}
