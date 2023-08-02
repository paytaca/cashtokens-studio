import { BCMR, NFTCapability, OpReturnData, TokenSendRequest, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';

export default class FungibleToken extends CashStudioToken{
  constructor(p:{tokenId:string, amount:string, ownerWallet?: Wallet}) {
    super({...p})
  }

  async createGenesis(opt: {storeAmountIn: 'authchain'|'minting-baton-covenant'|'creator-address'}): Promise<string | void> {
    this._processing = 'Processing transaction...'
    if (!this.tokenId) {
      throw new Error('The tokenId is not set')
    }
    if (!this.ownerWallet) {
      throw new Error('The ownerWallet is not set')
    }
    const requests:(TokenSendRequest|OpReturnData)[] = []
    requests.push(this.prepareIdentityOutputRequest(opt.storeAmountIn === 'authchain'))
    if (opt.storeAmountIn === 'minting-baton-covenant') {
      const mintingCovenant = new MintingCovenant(this.tokenId!, this.ownerWallet!.network)
      const genesisSupplyRecipient = mintingCovenant.contract.getTokenDepositAddress()
      requests.push(...[
        new TokenSendRequest({ cashaddr: genesisSupplyRecipient, tokenId: this.tokenId!, value: 1000, amount: Number(this.amount) }), // FT Reserves
        new TokenSendRequest({ cashaddr: this.ownerWallet!.getTokenDepositAddress(), tokenId: this.tokenId!, value: 1000, commitment: '00', amount: 0}) // Minting Baton NFT
      ])
    }
    if(opt.storeAmountIn === 'creator-address') {
      requests.push(
        new TokenSendRequest({ cashaddr: this.ownerWallet!.getTokenDepositAddress(), tokenId: this.tokenId!, value: 1000, amount: Number(this.amount)}) // Issue supply to owne'r address
      )
    }
    if (this.registry) {
      if (!this.registry.contentHash) {
        throw new Error('Missing registry content hash. Unset registry if you don\'t intend to publish')
      }
      if (!this.registry.url) {
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
      await BCMR.buildAuthChain({ transactionHash: this.tokenId, network: this.ownerWallet!.network })
      delete this._processing
    }
  }
}
