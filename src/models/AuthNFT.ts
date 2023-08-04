import { NFTCapability, SendRequest, TokenSendRequest, UnitEnum, UtxoI, Wallet } from "mainnet-js";
import NonFungibleToken from "./NonFungibleToken";
import AuthChainGuard from "src/contracts/AuthChainGuard";
import AuthGuard from "./AuthGuard";
import calcMinerFee from "src/utils/calcMinerFee";

export default class AuthNFT extends NonFungibleToken {
  private static _processing?:string

  constructor(p?:{utxo?: UtxoI, ownerWallet?:Wallet}) {
    super({...p})
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
    return (await ag.getManagedAuthIdentities()).length === 0
  }
  /**
   * Scan ownerWallet and return a utxo suitable to be an authNFT
   */
  static async scanWalletForSuitableAuthNFTUtxo(ownerWallet:Wallet):Promise<UtxoI|undefined> {
    AuthNFT._processing = 'Scanning wallet for suitable UTXOs'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1},{P2PKH:1})
    delete AuthNFT._processing
    return (await ownerWallet?.getAddressUtxos()).filter((u:UtxoI) => !u.token && u.satoshis > 1000 + minerFee && u.vout===0)[0]
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
    const authNFTUtxos = (await ownerWallet?.getAddressUtxos()).filter((u:UtxoI) => u.token && u.token.commitment==='00')
    const authNFTs = []
    for (let i=0; i < authNFTUtxos.length; i++) {
      authNFTs.push(new AuthNFT({utxo: authNFTUtxos[i]}))
    }
    delete AuthNFT._processing
    return authNFTs
  }
  /**
   * Create genesis
   */
  async createGenesis(opt?:{tokenAmount?:number}): Promise<string | void> {
    this.ensureUtxo()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    const authGuardContract = new AuthGuard({authNFT: this,ownerWallet: this.ownerWallet})
    authGuardContract.createGenesisContract()
    const requests:(TokenSendRequest)[] = []
    requests.push(
      // AuthGuard can be used as identity output
      new TokenSendRequest({
        cashaddr: authGuardContract.contract!.getTokenDepositAddress(),
        tokenId: this.utxo!.txid,
        value: 1000,
        capability: this.utxo!.token?.capability || NFTCapability.none,
        commitment: '00',
        amount: Number(opt?.tokenAmount || '0')
      }),
    )
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1},{P2PKH:1})
    if ((this.utxo!.satoshis - 1000 - minerFee) > 100) { // if there is non-negligible change
      // Change
      new SendRequest({
        cashaddr: this.ownerWallet!.getDepositAddress(),
        value: this.utxo!.satoshis - 1000 - minerFee,
        unit: UnitEnum.SATOSHIS
      })
    }

    const {encodedTransaction, sourceOutputs} = await this.buildGenesisTransaction(requests)
    const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs, 'Create Auth NFT')
    const tx = await this.submitTransaction(signResult)
    delete this._processing
    return tx
  }


  protected async buildGenesisTransaction(genesisRequests:(TokenSendRequest)[]): Promise<{encodedTransaction:any, sourceOutputs:any}>{
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
        utxoIds: [this.utxo!], // this.utxo as genesis input
        ensureUtxos: [this.utxo!]
      }
    )
    delete this._processing
    return {encodedTransaction, sourceOutputs}
  }
}
