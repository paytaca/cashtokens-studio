import { NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UnitEnum, UtxoI, Wallet } from "mainnet-js";
import { AuthGuard } from './index'
import { DEFAULT_TOKEN_VALUE } from './constants'
import calcMinerFee from "./utils/calcMinerFee";
import { decodeTransaction } from "@bitauth/libauth";
import requestPaytacaSignature from "./utils/requestPaytacaSignature";
import submitTransaction from "./utils/submitTransaction";
import { TransactionSigner } from "./types";

export class AuthKey implements UtxoI {
  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  ownerWallet?: Wallet
  transactionSigner?: TransactionSigner
  private _processing?: string
  private static _processing?: string
  unlockableTokens?: UtxoI[]
  unlockableTokensCount?: number
  static readonly DEFAULT_COMMITMENT = '00'
  constructor(
    u?: {
      txid: string;
      vout: number;
      satoshis: number;
      height?: number | undefined;
      coinbase?: boolean | undefined;
      token?: TokenI | undefined;
      ownerWallet?: Wallet
    },
    transactionSigner?: TransactionSigner
  ){
    if (u) {
      this.vout = u.vout
      this.txid = u.txid
      this.satoshis = u.satoshis
      this.height = u.height
      this.coinbase = u.coinbase
      this.token = u.token
      this.ownerWallet = u.ownerWallet
    } else {
      this.vout = 0
      this.txid = ''
      this.satoshis = 0
    }
    this.transactionSigner = transactionSigner
  }

  get utxo():UtxoI {
    return {
      vout: this.vout,
      txid: this.txid,
      satoshis: this.satoshis,
      height: this.height,
      coinbase: this.coinbase,
      token: this.token,
    }
  }

  set utxo(u:UtxoI) {
    this.vout = u.vout
    this.txid = u.txid
    this.satoshis = u.satoshis
    this.height = u.height
    this.coinbase = u.coinbase
    this.token = u.token
  }

  get authGuard(): AuthGuard {
    this.ensureTxid()
    const tokenId = this.token?.tokenId ? this.token.tokenId : this.txid
    return new AuthGuard(tokenId, this.ownerWallet!.network)
  }

  get genesisCost(): number {
    return AuthKey.genesisCost
  }

  get transferCost(): number {
    return AuthKey.transferCost
  }

  get processing(): string|undefined {
    return this._processing
  }

  set processing(m: string|undefined) {
    this._processing = m
  }

  static get processing():string|undefined {
    return AuthKey._processing
  }

  static get genesisCost(): number {
    return calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH:2 }) + DEFAULT_TOKEN_VALUE
  }

  static get transferCost(): number {
    return calcMinerFee({ P2PKH: 2 }, { P2WSH: 1, P2PKH:1 }) + DEFAULT_TOKEN_VALUE // non-conservative estimate
  }

  ensureTokenId(){
    if (!this.token?.tokenId) {
      throw new Error('Invalid token id')
    }
  }

  ensureTxid(){
    if (!this.txid) {
      throw new Error('Invalid token txid')
    }
  }

  ensureOwnerWallet() {
    if (!this.ownerWallet) {
      throw new Error('Missing owner wallet')
    }
  }

  /**
   * SendRequest for change output. Only for genesis
   * @param {UtxoI} funderUtxo The utxo that will fund the transaction
   */
  protected prepareChangeReq(funderUtxo: UtxoI):SendRequest[] {
    if (!funderUtxo) {
      throw new Error('Funder utxo required to processes change')
    }
    if ((this.satoshis - this.genesisCost) > 100) { // if there is non-negligible change
      // Change
      return [new SendRequest({
        cashaddr: this.ownerWallet!.getDepositAddress(),
        value: funderUtxo.satoshis - this.genesisCost,
        unit: UnitEnum.SATOSHIS
      })]
    }
    return []
  }

  protected async buildTokenGenesisTransaction(genesisRequests:(TokenSendRequest|SendRequest|OpReturnData)[]): Promise<{encodedTransaction:any, sourceOutputs:any}>{
    // TODO: REFACTOR, allow user to use multiple low denomination utxos as funder
    const funderUtxo = (await this.ownerWallet!.getAddressUtxos()).filter((u:UtxoI)=> {
      return Boolean(!u.token) &&
        (u.txid !== this.txid || u.vout !== this.vout) && 
          u.satoshis > this.genesisCost
    })[0]
    if (!funderUtxo) {
      if (this.satoshis <= this.genesisCost) {
        delete this._processing
        throw new Error('Insufficient balance to fund the transaction. Please try to consolidate your utxos.')
      } 
      // use this input to fund the transaction 
      //if it we can't find a different funder utxo and if it has enough satoshis
    }
    // const useThisUtxos = this.authKey? [this.utxo, this.authKey!.utxo!, funderUtxo]: [this.utxo, funderUtxo]
    const utxoExpenses = [this.utxo]
    if (funderUtxo) {
      utxoExpenses.push(funderUtxo)
    }
    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      genesisRequests,
      false,
      {
        tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: utxoExpenses, // this.utxo as genesis input
        ensureUtxos: utxoExpenses
      }
    )
    delete this._processing
    return {encodedTransaction, sourceOutputs}
  }



  /**
   * Can be used when solely creating AuthKey
   * @override CashStudioToken.createGenesis
   */
  async createGenesis(opt?:{capability:NFTCapability, commitment: string}): Promise<string | void> {
    this.ensureTxid()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    const requests:(TokenSendRequest|SendRequest)[] = [
      new TokenSendRequest({
        value: DEFAULT_TOKEN_VALUE,
        tokenId: this.txid,
        cashaddr: this.ownerWallet!.getTokenDepositAddress(),
        amount: 0,
        capability: opt?.capability || NFTCapability.none,
        commitment: opt?.commitment || '00'
      })
    ]
    // requests.push(...this.prepareChangeReq(this.utxo))
    
    // try {
    //   const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests)
    //   this._processing = 'Waiting for signature'
    //   const signResult = await requestPaytacaSignature(encodedTransaction, sourceOutputs, 'Create AuthKey')
    //   this._processing = 'Creating AuthKey'
    //   const tx = await submitTransaction(signResult, this.ownerWallet as Wallet)
    //   return tx
    // } catch (error) {

    //   throw error
    // } finally {
    //   delete this._processing
    // }
    console.log('transaction signer', this.transactionSigner)
    let signResult
    try {
      const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests)
      this._processing = 'Waiting for signature'
      signResult = await this.transactionSigner?.signTransaction(decodeTransaction(encodedTransaction), sourceOutputs, false, 'Generate genesis inputs')
    } catch (error:any) {
      console.log(error)
      delete this._processing
      throw error
    } finally {
      delete this._processing
    }
    
    if (!signResult) {
      delete this._processing
      return
    }

    try {
      this._processing = 'Creating AuthKey'
      const tx = await submitTransaction(signResult, this.ownerWallet as Wallet)
      return tx
    } catch (error) {

      throw error
    } finally {
      delete this._processing
    }

  }

  /**
   * Scan the the authGuard address for tokens that can be unlocked by this AuthKey
   */
  async loadUnlockableTokens(){
    this._processing = 'Scanning managed tokens'
    this.unlockableTokens = await this.authGuard.getLockedTokenIdentities()
    delete this._processing
    return this
  }

  /**
   * @return The authKeys in a wallet
   */
  static async scanWalletForAuthKeys(ownerWallet:Wallet): Promise<AuthKey[]|undefined> {
    AuthKey._processing = 'Scanning wallets for AuthKeys'
    const authKeyUtxos = (await ownerWallet?.getAddressUtxos()).filter((u:UtxoI) => u.token && u.token.commitment == AuthKey.DEFAULT_COMMITMENT)
    const authKeys = []
    for (let i=0; i < authKeyUtxos.length; i++) {
      // intentionally not setting wallet to make the obj leaner
      // just set ownerWallet when invoking AuthKey methods
      authKeys.push(new AuthKey({...authKeyUtxos[i]}))
    }
    delete AuthKey._processing
    return authKeys
  }

  /**
   * Transfer this authkey
   * @param {string} newOwner Token address of new owner
   */
  async transfer(newOwner:string): Promise<string|undefined> {

    this.ensureOwnerWallet()
    this.ensureTokenId()

    this._processing = 'Processing'

    const funderUtxo = (await this.ownerWallet!.getAddressUtxos()).filter((u:UtxoI)=> {
      return Boolean(!u.token) &&
          u.satoshis > this.transferCost
    })[0]
    
    if (!funderUtxo) {
      throw new Error('Insufficient balance to fund the transaction')
    }

    const requests = new TokenSendRequest({
      value: this.satoshis,
      tokenId: this.token!.tokenId,
      cashaddr: newOwner,
      amount: this.token?.amount,
      capability: this.token?.capability,
      commitment: this.token?.commitment
    })

    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      requests,
      false,
      {
        checkTokenQuantities: true,
        buildUnsigned: true,
        // utxoIds: [this.utxo, funderUtxo], // this.utxo as genesis input
        // ensureUtxos: [this.utxo, funderUtxo]
      }
    )
    let signResult
    try {
      this._processing = `Waiting for ${this.transactionSigner?.type} signature`
      signResult = await this.transactionSigner?.signTransaction(decodeTransaction(encodedTransaction), sourceOutputs, false, 'Transfer AuthKey')
    } catch (error:any) {
      console.log(error)
      delete this._processing
      throw error
    } finally {
      delete this._processing
    }
    
    this._processing = 'Transferring,please wait'
    const tx = await submitTransaction(signResult, this.ownerWallet as Wallet)
    delete this._processing
    return tx
  }

}
