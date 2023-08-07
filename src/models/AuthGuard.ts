import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin, sha256 } from '@bitauth/libauth'
import CashStudioToken from "./CashStudioToken"
import { AuthGuard as AuthGuardI, CashStudioTokenI, MBC, Message, Messaging, Processing, Registry, RegistryPublicationInput } from "./interfaces"
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/utils/getWalletClass'
import constants from 'src/constants'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, SignatureTemplate, Utxo } from 'cashscript'
import { scriptToBytecode } from '@cashscript/utils'
import getByteCount from 'src/utils/getByteCount'
import {AuthNFT} from './interfaces'
import calcMinerFee from 'src/utils/calcMinerFee'
import { toValue } from 'vue'


export default class AuthGuard implements AuthGuardI, Processing, Messaging{
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet
  authNFT?: AuthNFT
  protected _processing?: string
  protected _message?: Message
  private _contract?: Contract
  constructor(p: {authNFT?: AuthNFT, ownerWallet?: Wallet}) {
    this.authNFT = p.authNFT
    this.ownerWallet = p.ownerWallet
    if (this.authNFT?.token?.tokenId) {
      // Assumes we're trying to use an existing AuthNFT to create a contract
      this.createContract()
    } else {
      // We're trying to create an AuthNFT token
      this.createAuthNFTGenesisContract()
    }
  }
  transfer(newOwnerAddress: string): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }
  burn(): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }

  /**
   * Create an AuthGuard contract, using the AuthNFT tokenId as the baton / Token recipient
   */
  createContract() {
    this.ensureOwnerWallet()
    this.ensureTokenId()
    if (this.authNFT?.token?.tokenId) {
      this._contract = new Contract(
        this.contractScript,
        [`0x${this.authNFT.token.tokenId.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
        this.ownerWallet!.network
      )
    }
    return this
  }

  /**
   * Create genesis of AuthGuard/AuthNFT.
   */
  createAuthNFTGenesisContract() {
    this.ensureOwnerWallet()
    this.ensureAuthNFT()
    if (!this.authNFT!.txid) {
      throw new Error('Invalid authNFT input utxo')
    }
    this._contract = new Contract(
      this.contractScript,
      [`0x${this.authNFT!.txid.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
      this.ownerWallet!.network
    )
    return this
  }

  protected ensureTokenId() {
    if (!this.authNFT?.token?.tokenId) {
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

  protected ensureAuthNFT(){
    if (!this.authNFT) {
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

  get f():any {
    return this._contract?.getContractFunction('unlockWithNft')
  }

  /**
   * Returns the AuthIdentities(Tokens) managed by this AuthGuard/AuthNFT pair.
   * @returns The list if AuthIdentities(utxos) managed by this AuthGuard
   */
  async getLockedTokenIdentities(): Promise<UtxoI[]> {
    this.ensureContract()
    const w = await (getWalletClass()).watchOnly(this._contract!.getTokenDepositAddress())
    return  (await w.getAddressUtxos()).filter((u:UtxoI)=> Boolean(u.token?.tokenId))// If support non-token Authchain IdentityOutput in the future remove the filter
  }

  /**
   * Usage:
   *     Set the authNFT (this is like setting the key)
   *
   */
  async unlockWithNft(p: {to: string, ftAmountToUnlock: bigint|string|number }): Promise<string | undefined> {
    this.ensureOwnerWallet()
    this.ensureContract()
    this.ensureTokenId()
    this._processing = 'Processing'
    const contractWallet = await getWalletClass().watchOnly(this._contract!.getTokenDepositAddress())
    const authguardUtxo = (await contractWallet.getAddressUtxos()).find((u: UtxoI) => u.token && u.token?.tokenId === this.authNFT!.token!.tokenId! && u.token?.amount > 0)
    if(!authguardUtxo){
      throw new Error('No utxo found in authguard!')
    }
    const toWallet = await getWalletClass().watchOnly(p.to)
    const contractOwnersUtxos = (await this.ownerWallet!.getAddressUtxos())
    if (!this.authNFT) {
      throw new Error('Unauthorized!Spender does not own baton/AuthNFT key')
    }
    const funderInput:UtxoI[] = contractOwnersUtxos.filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > 4000)
    if (!funderInput) {
      throw new Error('Insufficient balance to fund the txn')
    }
    const ownerDepositAddress = this.ownerWallet!.getDepositAddress()
    const ownerTokenDepositAddress = this.ownerWallet!.getTokenDepositAddress()
    const inputs = [authguardUtxo, this.authNFT.utxo!, funderInput[0]].map(toCashScript)
    const minerFee = 1500
    let transaction
    let decoded
    const sig1 = new SignatureTemplate(Uint8Array.from(Array(32)))
    const sig2 = new SignatureTemplate(Uint8Array.from(Array(32)))
    try {
      transaction =
          this.f().from(inputs[0])
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
            to: ownerTokenDepositAddress,
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
            to: ownerDepositAddress,
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
          lockingBytecode: (cashAddressToLockingBytecode(ownerTokenDepositAddress) as any).bytecode,
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
          lockingBytecode: (cashAddressToLockingBytecode(ownerDepositAddress) as any).bytecode,
          valueSatoshis: inputs[2].satoshis
        }],
        broadcast: false,
        userPrompt: `Release ${p.ftAmountToUnlock} tokens to ${ownerDepositAddress}`
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
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      this._message = { type: 'success', text: `${p.ftAmountToUnlock} token issued to ${p.to.replace(p.to.substring(10,28),'...')}`}
      return tx
    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
    } finally {
      delete this._processing
    }
  }

  /**
   * Use this authguard to publish registry
   */
  async publish(opt:{url:string, contentHash:string, authchainIdentityOutput: UtxoI}): Promise<string|undefined> {
    this.ensureContract()
    this._processing = 'Processing'
    const publicationCost = calcMinerFee({'P2SH-P2WPKH':1}, {P2PKH: 3})
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > publicationCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }
    const authchainIdentityOutput = toCashScript(toValue(opt.authchainIdentityOutput))
    const authNFTInput = toCashScript(toValue(this.authNFT!.utxo!))
    let transaction
    let decoded
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    try {
      transaction =
        this.f()
          .from(authchainIdentityOutput) // contract
          .fromP2PKH(authNFTInput, sig) // AuthNFT
          .fromP2PKH(funderInput, sig) // funder
          .to([{
            // pass thru contract
            to: this._contract!.getTokenDepositAddress(),
            amount: authchainIdentityOutput.satoshis,
            token: authchainIdentityOutput.token
          }])
          .to([{
            // Return minting baton/AuthNFT to owner
            to: this.ownerWallet!.getTokenDepositAddress(),
            amount: BigInt(this.authNFT!.satoshis),
            token: {
              category: this.authNFT!.token!.tokenId,
              amount: BigInt(this.authNFT!.token!.amount),
              nft: { commitment: this.authNFT?.token?.commitment, capability: this.authNFT?.token?.capability}
            }
          }])
          .withOpReturn([
            'BCMR',
            opt.contentHash, // sha256 of the contents from the uri below
            opt.url.replace('https://', '')
          ])
          .to([{
            to: this.ownerWallet!.getDepositAddress(),
            amount: funderInput.satoshis - BigInt(publicationCost)
          }])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(publicationCost))

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        console.log('decoded:', decoded)
        delete this._processing
        throw new Error('Failed to decode transaction')
      }
    } catch (error) {
      console.log(error)
      delete this._processing
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
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [{
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(this._contract!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(authchainIdentityOutput.satoshis),
          token: authchainIdentityOutput.token && {
            ...authchainIdentityOutput.token,
            category: hexToBin(authchainIdentityOutput.token?.category),
            nft: authchainIdentityOutput.token.nft && {
              ...authchainIdentityOutput.token.nft,
              commitment: hexToBin(authchainIdentityOutput.token.nft.commitment),
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
          lockingBytecode: (cashAddressToLockingBytecode(this._contract!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(authNFTInput.satoshis),
          token: authNFTInput.token && {
            ...authNFTInput.token,
            category: hexToBin(authNFTInput.token?.category),
            nft: authNFTInput.token.nft && {
              ...authNFTInput.token.nft,
              commitment: hexToBin(authNFTInput.token.nft.commitment),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(this.ownerWallet!.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        }],
        broadcast: false,
        userPrompt: 'Sign transaction to update BCMR'
      });

    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error signing transaction')
    }

    if (!signingResult?.signedTransaction) {
      delete this._processing
      return
    }
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      return tx
    } catch (error) {
      console.log('Error:AuthChainGuard@publish', error)
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
