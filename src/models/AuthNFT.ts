import { NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UnitEnum, UtxoI, Wallet } from "mainnet-js";
import NonFungibleToken from "./NonFungibleToken";
import AuthChainGuard from "src/contracts/AuthChainGuard";
import AuthGuard from "./AuthGuard";
import calcMinerFee from "src/utils/calcMinerFee";
import { CashStudioTokenI } from "./interfaces";
import CashStudioToken from "./CashStudioToken";

export default class AuthNFT extends NonFungibleToken implements AuthNFT {
  static DEFAULT_COMMITMENT = '00'
  /**
   * The tokens that can be unlocked by this AuthNFT
   */
  unlockableTokens:UtxoI[] = []
  private static _processing?:string

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

  set utxo(u:UtxoI|undefined) {
    if (!u) return
    this.vout = u.vout
    this.txid = u.txid
    this.satoshis = u.satoshis
    this.height = u.height
    this.coinbase = u.coinbase
    this.token = u.token
  }

  ensureUtxo(){
    if (!this.utxo?.txid) {
      throw new Error('Utxo not found. If creating genesis, AuthNFT.utxo is required and will be used as genesis input.')
    }
  }
  /**
   * True if authNFT is already used
   */
  static async isUsed(authNFT: AuthNFT,  ownerWallet:Wallet): Promise<boolean> {
    const ag = new AuthGuard({authNFT: authNFT, ownerWallet: ownerWallet})
    console.log('AG', ag)
    return (await ag.getLockedTokenIdentities()).length === 0
  }
  /**
   * Scan ownerWallet and return a utxo suitable to be an authNFT
   */
  static async scanWalletForSuitableAuthNFTUtxo(ownerWallet:Wallet):Promise<UtxoI|undefined> {
    AuthNFT._processing = 'Scanning wallet for suitable UTXOs'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1},{P2PKH:1})
    delete AuthNFT._processing
    return (await ownerWallet?.getAddressUtxos()).filter((u:UtxoI) => !u.token && u.satoshis > CashStudioToken.DEFAULT_TOKEN_VALUE + minerFee && u.vout===0)[0]
  }

  static async scanWalletForSuitableAuthNFTUtxos(ownerWallet:Wallet):Promise<UtxoI[]|undefined> {
    AuthNFT._processing = 'Scanning wallet for suitable UTXOs'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1},{P2PKH:1})
    delete AuthNFT._processing
    return (await ownerWallet?.getAddressUtxos()).filter((u:UtxoI) => !u.token && u.satoshis > CashStudioToken.DEFAULT_TOKEN_VALUE + minerFee && u.vout===0)
  }

  async scanWalletForSuitableAuthNFTUtxo():Promise<UtxoI|undefined>{
    this.ensureOwnerWallet()
    this._processing = 'Scanning wallet for suitable Auth utxo'
    const u = await AuthNFT.scanWalletForSuitableAuthNFTUtxo(this.ownerWallet!)
    if (u) {
      this.utxo = u
    }
    delete this._processing
    return u
  }

  static get processing(){
    return this._processing
  }
  /**
   * @return The authNFTs in a wallet
   */
  static async scanWalletForAuthNFTs(ownerWallet:Wallet): Promise<AuthNFT[]|undefined> {
    AuthNFT._processing = 'Scanning wallets for AuthNFTs'
    const authNFTUtxos = (await ownerWallet?.getAddressUtxos()).filter((u:UtxoI) => u.token && u.token.commitment === AuthNFT.DEFAULT_COMMITMENT)
    const authNFTs = []
    for (let i=0; i < authNFTUtxos.length; i++) {
      // intentionally not setting wallet to make the obj leaner
      // just set ownerWallet when invoking AuthNFT methods
      authNFTs.push(new AuthNFT({...authNFTUtxos[i] as CashStudioTokenI}))
    }
    delete AuthNFT._processing
    return authNFTs
  }

  /**
   * Can be used if when solely creating AuthNFT
   * @override NonFungibleToken.createGenesis
   */
  async createGenesis(opt:{capability:NFTCapability, commitment: string}): Promise<string | void> {
    this.ensureUtxo()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    const requests:(TokenSendRequest|SendRequest)[] = []
    this.authNFT = this // using self as authNFT during genesis
    requests.push(...this.prepareChangeReq(this.utxo))
    const {encodedTransaction, sourceOutputs} = await this.buildGenesisTransaction(requests)
    const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs, 'Create Auth NFT')
    const tx = await this.submitTransaction(signResult)
    delete this._processing
    return tx
  }

  /**
   *
   */
  protected async buildGenesisTransaction(genesisRequests:(TokenSendRequest|SendRequest|OpReturnData)[]): Promise<{encodedTransaction:any, sourceOutputs:any}>{
    if (!this.utxo?.txid) {
      throw new Error('No valid utxo.Needs zeroeth output utxo as genesis input')
    }
    this._processing = 'Processing transaction'

    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      genesisRequests,
      false,
      {
        tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: [this.utxo], // this.utxo as genesis input
        ensureUtxos: [this.utxo]
      }
    )
    delete this._processing
    return {encodedTransaction, sourceOutputs}
  }

  /**
   * AuthGuard for this AuthNFT
   */
  public get authGuard(): AuthGuard {
    return new AuthGuard({authNFT: this, ownerWallet: this.ownerWallet})
  }

  /**
   * Scan the the authGuard address for tokens that can be unlocked by this AuthNFT key
   */
  async loadUnlockableTokens(){
    this._processing = 'Scanning managed tokens'
    this.unlockableTokens = await this.authGuard.getLockedTokenIdentities()
    delete this._processing
    return this
  }

}
