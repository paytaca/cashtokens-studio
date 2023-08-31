import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet } from "mainnet-js";
import { AuthKey, DEFAULT_TOKEN_VALUE } from '.'
import { GenesisOptions } from "./types";
import { request } from "http";
import calcMinerFee from "./utils/calcMinerFee";
import requestPaytacaSignature from "./utils/requestPaytacaSignature";
import submitTransaction from "./utils/submitTransaction";
import { Console } from "console";
export class CashToken implements UtxoI {

  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  ownerWallet?: Wallet
  authKey?: AuthKey
  registry?: { uri: string|string[], contentHash: string }
  /**
   * If true, token will be locked on the AuthGuard contract during genesis. Default = true
   */
  useAuthGuard: boolean
  /**
   * If true, Create AuthKey genesis together with Token Genesis. Default = true
   * This can be turned of by passing {includeAuthKeyGenesis:false} in the createGenesis
   * method
   */
  includeAuthKeyGenesis: boolean
  private _processing?: string
  constructor(
    u?: {
      txid: string;
      vout: number;
      satoshis: number;
      height?: number | undefined;
      coinbase?: boolean | undefined;
      token?: TokenI | undefined;
      ownerWallet?: Wallet
      authKey?: AuthKey,
      registry?: { uri: string, contentHash: string }
    }
  ){
    if (u) {
      this.vout = u.vout
      this.txid = u.txid
      this.satoshis = u.satoshis
      this.height = u.height
      this.coinbase = u.coinbase
      this.token = u.token
      this.ownerWallet = u.ownerWallet
      this.authKey = u.authKey
      this.registry = u.registry
    } else {
      this.vout = 0
      this.txid = ''
      this.satoshis = 0
    }
    this.includeAuthKeyGenesis = true
    this.useAuthGuard = true
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

  get processing():string|undefined {
    return this._processing
  }

  set processing(msg: string|undefined) {
    this._processing = msg
  }

  get genesisCost(): number {
    return (
      calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH:2 }) +
      /**
       * 2 = we'll just assume Token genesis and AuthKey genesis
       */
      (DEFAULT_TOKEN_VALUE * 2) + 400
    )
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

  protected prepareGenesisAuthchainIdentityReq(args: { recipient: string, token: TokenI}): TokenSendRequest {
    const reqParam = {
      cashaddr: args.recipient,
      value: DEFAULT_TOKEN_VALUE,
      tokenId: args.token.tokenId,
      amount: args.token.amount,
      capability: args.token.capability,
      commitment: args.token.commitment
    }
    return new TokenSendRequest(reqParam)
  }

  /**
   * Prepare AuthKey request
   */
  protected prepareGenesisAuthKeyReq(): TokenSendRequest {
    return new TokenSendRequest({
      cashaddr: this.ownerWallet!.getTokenDepositAddress(),
      value: DEFAULT_TOKEN_VALUE,
      tokenId: this.authKey!.txid,
      amount: 0,
      capability: this.authKey?.token?.capability || NFTCapability.none,
      commitment: '00'
    })
  }

  protected prepareGenesisRegistryPublicationReq(): OpReturnData[] {
    if (this.registry) { // if registry is set, assumes publishing
      if (!this.registry?.uri || !this.registry?.contentHash) {
        delete this._processing
        throw new Error("Invalid registry publication url or content hash")
      }


      if (typeof(this.registry?.uri) === 'string') {
        return [OpReturnData.fromArray(['BCMR', this.registry.contentHash, this.registry.uri.replace(/https:\/\/|ipfs:\/\//, '')])]
      } else if (this.registry?.uri instanceof Array){
        return [OpReturnData.fromArray(['BCMR', this.registry.contentHash, ...this.registry.uri.map((u) => u.replace(/https:\/\/|ipfs:\/\//, ''))])]
      }

    }
    return []
  }

  /**
   * Build unsigned transaction
   */
  protected async buildTokenGenesisTransaction(genesisRequests:(TokenSendRequest|OpReturnData|SendRequest)[], includeAuthKeyGenesis?: boolean): Promise<{encodedTransaction:any, sourceOutputs:any}>{
    // TODO: REFACTOR, allow user to use multiple low denomination utxos as funder
    const funderUtxo = (await this.ownerWallet!.getAddressUtxos()).filter((u:UtxoI)=> {
      return Boolean(!u.token) &&
        (u.txid !== this.txid || u.txid !== this.authKey!.txid) && // Exclude the utxo that we're using as genesis inputs
          u.satoshis > this.genesisCost
    })[0]

    if (!funderUtxo) {
      throw new Error('Insufficient balance to fund the transaction')
    }

    // const useThisUtxos = this.authKey? [this.utxo, this.authKey!.utxo!, funderUtxo]: [this.utxo, funderUtxo]
    const utxoExpenses = [this.utxo]
    // Be careful with this, improper condition could spend the authKey
    if (this.authKey && includeAuthKeyGenesis) {
      utxoExpenses.push(this.authKey!.utxo!)
    }
    utxoExpenses.push(funderUtxo)

    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      genesisRequests,
      false,
      {
        tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: utxoExpenses,
        ensureUtxos: utxoExpenses
      }
    )
    return {encodedTransaction, sourceOutputs}
  }

  async createGenesis(opt: GenesisOptions): Promise<string|undefined> {
    this.ensureTxid()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    opt = { useAuthGuard: this.useAuthGuard, includeAuthKeyGenesis: this.includeAuthKeyGenesis, ...opt}
    const requests = []
    let tokenRecipient = this.ownerWallet!.getTokenDepositAddress()
    if (opt.useAuthGuard) { // Use authguard by default
      if (!this.authKey?.txid && !this.authKey?.token?.tokenId) {
        throw new Error('Invalid authkey')
      }
      this.authKey.ownerWallet = this.ownerWallet
      tokenRecipient = this.authKey?.authGuard.contract!.getTokenDepositAddress()
    }
    requests.push(this.prepareGenesisAuthchainIdentityReq({
      recipient: tokenRecipient,
      token: {
        tokenId: this.txid,
        amount: Number(opt.amount || 0),
        // Following BCMR standard, FT reserved supply handling suggestion
        // i.e. For fungible tokens continued issuance, store the reserve supply/genesis supply
        // ...  in the identity output and set capability to 'mutable'
        capability: opt.amount && BigInt(opt.amount) > 0 && !opt.capability ? NFTCapability.mutable: opt.capability,
        commitment: opt.commitment
      }
    }))

    // if true, create 2 genesis, 1 for Token 1 for AuthKey
    if (opt.includeAuthKeyGenesis) {
      requests.push(this.prepareGenesisAuthKeyReq())
    }
    requests.push(...this.prepareGenesisRegistryPublicationReq())
    const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests, opt.includeAuthKeyGenesis)
    this._processing = 'Waiting for signature'
    const signResult = await requestPaytacaSignature(encodedTransaction, sourceOutputs)
    if (!signResult || !signResult.signedTransaction) {
      delete this._processing
      return
    }
    this._processing = 'Creating Token'
    try {
      const tx = await submitTransaction(signResult, this.ownerWallet!)
      // if (tx) {
      //   await BCMR.buildAuthChain({ transactionHash: this.utxo.txid, network: this.ownerWallet!.network })
      // }
      return tx
    } catch (error) {
      console.log(error)
    } finally {
      delete this._processing
    }

  }
}
