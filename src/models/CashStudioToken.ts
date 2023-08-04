import { NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { CashStudioTokenI, GenesisCreator, Registry, RegistryPublicationInput} from './interfaces'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import { decodeTransaction, hexToBin } from '@bitauth/libauth'
import AuthGuard from './AuthGuard'
import AuthNft from './AuthNFT'

type Message = {
  type?: string,
  text: string
}
/**
 * Cash<Studio>Token
 */
export default abstract class CashStudioToken implements CashStudioTokenI, GenesisCreator{
  utxo?: UtxoI
  authNFT?: AuthNft | undefined
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet | undefined
  protected _processing?: string
  protected _message?: Message
  constructor(p: {utxo?:UtxoI, registry?: RegistryPublicationInput, authNFT?: AuthNft, ownerWallet?: Wallet}) {
    this.utxo = p.utxo
    this.authNFT = p.authNFT
    this.registry = p.registry
    this.ownerWallet = p.ownerWallet
  }



  /**
   * E.g. 'Processing Transaction', 'Waiting for signature'
   */
  get processing():string | undefined{
    return this._processing
  }

  /**
   * E.g. success, Transaction submitted
   */
  get message():Message | undefined{
    return this._message
  }

  protected ensureTokenId() {
    if (!this.authNFT?.utxo?.token?.tokenId) {
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
    if (!this.ownerWallet || !this.utxo?.token?.tokenId) return
    return (await this.ownerWallet.getAddressUtxos()).filter((val: UtxoI) => !val.token && val.vout === 0 && val.txid === this.utxo?.token?.tokenId)
  }

  protected async buildGenesisTransaction(genesisRequests:(TokenSendRequest|OpReturnData)[]): Promise<{encodedTransaction:any, sourceOutputs:any}>{
    this._processing = 'Processing transaction'
    const genesisInput = await this.getGenesisInput()
    if (!genesisInput) {
      throw new Error('Invalid genesis input')
    }
    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      genesisRequests,
      false,
      {
        tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: genesisInput,
        ensureUtxos: genesisInput
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
      console.log(signResult)
      console.log('SIGNED', signResult.signedTransaction)
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
  protected prepareIdentityOutputRequest(): TokenSendRequest {
    if (!this.ownerWallet || !this.utxo) {
      delete this._processing
      throw new Error("Invalid owner or token id")
    }
    if (!this.authNFT) {
      delete this._processing
      throw new Error("Missing authNFT")
    }
    const authGuard = new AuthGuard({authNFT: this.authNFT, ownerWallet: this.ownerWallet})
    const reqParam = {
      cashaddr: authGuard.contract!.getTokenDepositAddress(),
      value: 1000,
      tokenId: this.utxo.txid!,
      amount: Number(this.utxo?.token?.amount),
      capability: this.utxo?.token?.capability,
      commitment: this.utxo?.token?.commitment,
    }
    return new TokenSendRequest(reqParam)
  }

  protected prepareAuthNFTRequest(): TokenSendRequest {
    if (!this.authNFT?.utxo?.token?.tokenId) {
      throw new Error('Error preparing AuthNFT request. AuthNFT missing!')
    }
    return new TokenSendRequest({
      cashaddr: this.ownerWallet!.getTokenDepositAddress(),
      value: 1000,
      tokenId: this.authNFT.utxo.token.tokenId!,
      amount: Number(this.authNFT?.utxo?.token?.amount),
      capability: this.authNFT?.utxo?.token?.capability,
      commitment: this.authNFT?.utxo?.token?.commitment,
    })
  }



  protected prepareRegistryPublicationOutputRequest(): OpReturnData {
    if (!this.registry?.url || !this.registry?.contentHash) {
      throw new Error("Invalid registry publication url or content hash")
    }
    return OpReturnData.fromArray(['BCMR', this.registry.contentHash, this.registry.url.replace('https://', '')])
  }

  createGenesis(opt?:any): Promise<string | void> {
    throw new Error('Method not implemented.')
  }

}
