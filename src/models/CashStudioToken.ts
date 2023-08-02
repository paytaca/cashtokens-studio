import { NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { CashStudioTokenI, Registry} from './interfaces'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import { decodeTransaction, hexToBin } from '@bitauth/libauth'

type Message = {
  type?: string,
  text: string
}
/**
 * Cash<Studio>Token
 */
export default abstract class CashStudioToken implements CashStudioTokenI{
  tokenId?: string
  amount?:string
  capability?:NFTCapability
  commitment?:string
  registry?: Registry
  ownerWallet?: Wallet
  protected _processing?: string
  protected _message?: Message
  constructor(p: {tokenId?:string, amount?:string, capability?: NFTCapability, commitment?:string, registry?: Registry, ownerWallet?: Wallet}) {
    this.tokenId = p.tokenId
    this.amount = p.amount
    this.capability = p.capability
    this.commitment = p.commitment
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

  /**
   * Owner's utxo that'll be used as token genesis input
   */
  async getGenesisInput(): Promise<UtxoI[]|void> {
    if (!this.ownerWallet || !this.tokenId) return
    return (await this.ownerWallet.getAddressUtxos()).filter((val: UtxoI) => !val.token && val.vout === 0 && val.txid === this.tokenId)
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

  protected async requestPaytacaSignature(encodedTransaction:any, sourceOutputs:any): Promise<any> {
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
          userPrompt: 'Token Genesis Request'
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
 * If user selected Authchain as storage for fungible token's genesis supply,
 * created tokens  will be stored in the authchain as reserve supply
 */
  protected prepareIdentityOutputRequest(storeAmount?:boolean, capability?:NFTCapability): TokenSendRequest {
    if (!this.ownerWallet || !this.tokenId) {
      throw new Error("Invalid owner or token id")
    }
    const acg = new AuthChainGuard(this.ownerWallet!.getDepositAddress(), this.ownerWallet!.getPublicKeyHash(false), this.ownerWallet!.network)
    const reqParam = {
      cashaddr: acg.contract.getTokenDepositAddress(),
      value: 1000,
      tokenId: this.tokenId!,
      amount: 0,
      capability: capability || NFTCapability.mutable,
      commitment: binToHex(utf8ToBin('identity'))
    }
    reqParam.amount = storeAmount? Number(this.amount): 0
    return new TokenSendRequest(reqParam)
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
