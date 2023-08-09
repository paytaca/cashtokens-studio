import { NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UnitEnum, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { AuthNFT, CashStudioTokenI, GenesisCreator, Message, Registry, RegistryPublicationInput} from './interfaces'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import { decodeTransaction, hexToBin } from '@bitauth/libauth'
import AuthGuard from './AuthGuard'
import AuthNft from './AuthNFT'
import { Utxo } from 'cashscript'
import calcMinerFee from 'src/utils/calcMinerFee'
import constants from 'src/constants'

/**
 * Cash<Studio>Token
 */
export default abstract class CashStudioToken implements CashStudioTokenI, GenesisCreator {
  static readonly DEFAULT_TOKEN_VALUE:number = 1000
  /**
   * These next 7 fields are attributes of unwrapped UtxoI
   */
  txid: string
  vout: number
  satoshis: number
  height?: number | undefined
  coinbase?: boolean | undefined
  token?: TokenI | undefined

  authNFT?: AuthNFT
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet | undefined
  useAuthGuard = true
  protected _processing?: string
  protected _message?: Message

  constructor(instance: CashStudioTokenI) {
    this.useAuthGuard = true // Default for now
    this.txid = instance.txid
    this.vout = instance.vout
    this.satoshis = instance.satoshis
    this.token = instance.token
    this.authNFT = instance.authNFT
    this.registry = instance.registry
    this.ownerWallet = instance.ownerWallet
  }

  /**
   * Re-wrapping utxo:UtxoI data
   */
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

  /**
   * Unwrap utxo
   */
  set utxo(u:UtxoI|undefined) {
    if (u) {
      this.vout = u.vout
      this.txid = u.txid
      this.satoshis = u.satoshis
      this.height = u.height
      this.coinbase = u.coinbase
      this.token = u.token
    }
  }

  /**
   * E.g. 'Processing Transaction', 'Waiting for signature'
   */
  get processing():string | undefined{
    return this._processing
  }

  set processing(v:string) {
    this._processing = v
  }

  /**
   * E.g. success, Transaction submitted
   */
  get message():Message | undefined{
    return this._message
  }

  protected ensureTokenId() {
    if (!this.authNFT?.token?.tokenId) {
      throw new Error('Invalid token id')
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

  /**
   * Owner's utxo that'll be used as token genesis input
   */
  async getGenesisInput(): Promise<UtxoI[]|void> {
    if (!this.ownerWallet || !this?.txid) return
    return (await this.ownerWallet.getAddressUtxos())
      .filter((val: UtxoI) => {
        return !val.token && val.vout === 0 && val.txid === this.txid
      })
  }

  protected async buildTokenGenesisTransaction(genesisRequests:(TokenSendRequest|OpReturnData|SendRequest)[]): Promise<{encodedTransaction:any, sourceOutputs:any}>{
    this._processing = 'Processing transaction'
    // const genesisInput = await this.getGenesisInput()
    if (!this.txid) {
      throw new Error('Invalid genesis input. Missing txid')
    }

    if (this.vout !== 0) {
      throw new Error('Invalid genesis input. Must be a zeroeth descendant output (vout 0)')
    }

    if (this.useAuthGuard) {
      if(!this.authNFT?.txid) {
        throw new Error('Using AuthGuard but AuthNFT is not provided')
      }
    }

    // TODO: REFACTOR, allow user to use multiple low denomination utxos as funder
    const funder = (await this.ownerWallet!.getAddressUtxos()).filter((u:UtxoI)=> {
      return Boolean(!u.token) &&
        (u.txid !== this.txid || u.txid !== this.authNFT!.txid) && // Exclude the utxo that we're using as genesis inputs
          u.satoshis > CashStudioToken.DEFAULT_GENESIS_COST
    })[0]

    if (!funder) {
      throw new Error('Insufficient balance to fund the transaction')
    }

    const useThisUtxos = this.useAuthGuard? [this.utxo, this.authNFT!.utxo!, funder]: [this.utxo, funder]
    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      genesisRequests,
      false,
      {
        tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: useThisUtxos,
        ensureUtxos: useThisUtxos
      }
    )
    delete this._processing
    return {encodedTransaction, sourceOutputs}
  }


  /**
   * Only use this for genesis transactions. Override this if interacting with contract
   */
  protected async requestPaytacaSignature(encodedTransaction:any, sourceOutputs:any, prompt?:string): Promise<any> {
    this._processing = 'Waiting for signature'
    const decoded = decodeTransaction(encodedTransaction)
    if (typeof decoded === 'string') {
      throw new Error('Error decoding transaction')
    }
    try {
      const signResult = await window.paytaca.signTransaction({
          transaction: decoded,
          sourceOutputs: [...sourceOutputs],
          broadcast: false,
          userPrompt: prompt || 'Token Genesis Request'
      })
      return signResult
    } catch (error) {
      console.log(error)
    } finally {
      delete this._processing
    }
  }

  protected async submitTransaction(signResult: any): Promise<string|void> {
    if (signResult?.signedTransaction) {
      this._processing = 'Submitting transaction'
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signResult.signedTransaction), true)
      delete this._processing
      return tx
    }

  }

/**
 * Prepare authchain's identity output.
 * Fungible token's genesis supply will be stored in an
 * AuthGuard covenant also used as authchain's identity output.
 * Genesis requires an existing AuthNFT which serves as key
 * to unlock the tokens stored in the AuthGuard of a particular tokenId.
 *
 * The AuthNFT should not have the same token category with the tokens it
 * manages. This is just a convention enforced by CashToken studio so that the
 * AuthGuard covenant can handle both FT and NFTs.
 *
 * @requires authNFT
 * @requires ownerWallet
 */
  protected prepareAuthchainIdentityReq(opt?:{genesis?:boolean, genesisSupply?:number, capability?:NFTCapability, commitment?:string}): TokenSendRequest {
    if (!this.ownerWallet || !this.txid) {
      delete this._processing
      throw new Error("No owner walletor utxo field not set")
    }
    let tokenId = this.txid

    if (!opt?.genesis) {
      if (!this.token?.tokenId) { // Require tokenId if this call isn't for a token genesis
        throw new Error("Preparing authchain identity with a missing token id")
      }
      tokenId = this.token.tokenId
    }

    let authchainIdentityRecipient = this.ownerWallet.getTokenDepositAddress()
    if (this.useAuthGuard) {
      if (!this.authNFT) {
        delete this._processing
        throw new Error("Missing authNFT")
      }
      authchainIdentityRecipient = this.authNFT.authGuard!.contract!.getTokenDepositAddress()
    }
    const reqParam = {
      cashaddr: authchainIdentityRecipient,
      value: CashStudioToken.DEFAULT_TOKEN_VALUE,
      tokenId: tokenId,
      amount: opt?.genesis? opt.genesisSupply: 0,
      capability: opt?.capability,
      commitment: opt?.commitment
    }

    return new TokenSendRequest(reqParam)
  }

  /**
   * Invoke and include request if CashStudioToken.useAuthGuard is true
   */
  protected prepareAuthNFTReq(opt:{genesis:boolean}): TokenSendRequest {
    this.ensureOwnerWallet()
    let tokenId
    let value
    let amount
    let capability
    let commitment
    let cashaddr = this.ownerWallet!.getTokenDepositAddress()
    if (opt.genesis) {
      tokenId = this.authNFT!.txid
      value = this.authNFT!.satoshis
      amount = Number(this.authNFT!.token?.amount),
      capability = this.authNFT!.token?.capability as NFTCapability
      commitment = '00'
    } else {
      if (!this.authNFT?.token?.tokenId) {
        throw new Error('Error preparing AuthNFT request. AuthNFT missing!')
      }
      value = this.authNFT.satoshis
      tokenId = this.authNFT.token.tokenId
      value = this.authNFT.satoshis
      amount = Number(this.authNFT.token?.amount),
      capability = this.authNFT.token?.capability as NFTCapability,
      // should be a constant '00' string but's lets refer to authNFT anyway
      // commitment = this.authNFT.token?.commitment
      commitment = '00'
      cashaddr = this.authNFT.ownerWallet!.getTokenDepositAddress()
    }

    return new TokenSendRequest({
      tokenId,
      cashaddr,
      amount,
      capability,
      commitment,
    })
  }

  protected prepareRegistryPublicationReq(): OpReturnData[] {
    if (this.registry) { // if registry is set, assumes publishing
      if (!this.registry?.url || !this.registry?.contentHash) {
        delete this._processing
        throw new Error("Invalid registry publication url or content hash")
      }
      return [OpReturnData.fromArray(['BCMR', this.registry.contentHash, this.registry.url.replace('https://', '')])]
    }
    return []
  }


  /**
   * SendRequest for change output. Only for genesis
   * @param {UtxoI} funderUtxo The utxo that will fund the transaction
   */
  protected prepareChangeReq(funderUtxo: UtxoI):SendRequest[] {
    if (!funderUtxo) {
      throw new Error('Funder utxo required to processes change')
    }
    if ((this.satoshis - CashStudioToken.DEFAULT_GENESIS_COST) > 100) { // if there is non-negligible change
      // Change
      return [new SendRequest({
        cashaddr: this.ownerWallet!.getDepositAddress(),
        value: funderUtxo.satoshis - CashStudioToken.DEFAULT_GENESIS_COST,
        unit: UnitEnum.SATOSHIS
      })]
    }
    return []
  }

  createGenesis(opt?:any): Promise<string | void> {
    throw new Error('Method not implemented.')
  }

  static get DEFAULT_GENESIS_COST():number {
    return (
    /**
     * Non-conservative estimate
     * 3 inputs (genesis input for creator's new Token, genesis input for creator's new AuthNFT, funder input)
     * 3 outputs (identity output(also holds FT), [issued FT or NFT]?, token change)
     * Assumes the most costly address type
     */
    calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH:2 }) +
    /**
     * We'll just assume that there is always an issued FT supply that will be given token values
     */
    (CashStudioToken.DEFAULT_TOKEN_VALUE * 3) + 400
    )
  }


}
