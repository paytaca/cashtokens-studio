import { BCMR, NFTCapability, OpReturnData, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';

export default class FungibleToken extends CashStudioToken{
  constructor(p:{utxo?:UtxoI, ownerWallet?: Wallet}) {
    super({...p})
  }

  async createGenesis(opt:{genesisSupplyAmount:string, issuedSupplyAmount?: {amount:string, recipient: string}}): Promise<string | void> {
    this._processing = 'Processing transaction...'
    if (!this.utxo) { // utxo is genesis input during genesis
      delete this._processing
      throw new Error('No utxo to use for genesis')
    }
    if (!this.ownerWallet) {
      delete this._processing
      throw new Error('The ownerWallet is not set')
    }
    const requests:(TokenSendRequest|OpReturnData)[] = []
    requests.push(this.prepareIdentityOutputRequest({amount: opt?.genesisSupplyAmount}))
    // TODO : ADD prepare request for issued supply if present
    if (this.registry) {
      if (!this.registry.contentHash) {
        delete this._processing
        throw new Error('Missing registry content hash. Unset registry if you don\'t intend to publish')
      }
      if (!this.registry.url) {
        delete this._processing
        throw new Error('Missing registry url. Unset registry if you don\'t intend to publish')
      }
      requests.push(this.prepareRegistryPublicationOutputRequest())
    }
    const {encodedTransaction, sourceOutputs} = await this.buildGenesisTransaction(requests)
    const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs)
    const tx = await this.submitTransaction(signResult)
    if(tx) {
      this._message = { type: 'success', text: `Success! Tx = ${tx}`}
      this._processing = 'Building authchain'
      await BCMR.buildAuthChain({ transactionHash: this.utxo.txid, network: this.ownerWallet!.network })
      delete this._processing
    }
  }
}
