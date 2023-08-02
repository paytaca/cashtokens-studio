import { BCMR, NFTCapability, OpReturnData, TokenSendRequest, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';

export default class FungibleNonFungibleToken extends CashStudioToken{
  constructor(p:{tokenId:string, amount:string, capability:NFTCapability, commitment: string, ownerWallet?: Wallet}) {
    super({...p})
  }

  async createGenesis(opt: {storeAmountIn: 'authchain'|'minting-baton-covenant'|'creator-address'}): Promise<string | void> {
    console.log('CREATING GENESIS', this)
    if (!this.tokenId) {
      throw new Error('The tokenId is not set')
    }
    if (!this.ownerWallet) {
      throw new Error('The ownerWallet is not set')
    }
    const requests:(TokenSendRequest|OpReturnData)[] = []
    requests.push(this.prepareIdentityOutputRequest(opt.storeAmountIn === 'authchain', this.capability))
    if (opt.storeAmountIn === 'minting-baton-covenant') {
      const mintingCovenant = new MintingCovenant(this.tokenId!, this.ownerWallet!.network)
      const genesisSupplyRecipient = mintingCovenant.contract.getTokenDepositAddress()
      requests.push(...[
        new TokenSendRequest({ cashaddr: genesisSupplyRecipient, tokenId: this.tokenId!, value: 1000, amount: Number(this.amount), capability:this.capability }), // FT Reserves
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
    console.log('BUILDING GENESIS TRANSACTION')
    const {encodedTransaction, sourceOutputs} = await this.buildGenesisTransaction(requests)
    console.log('WAITING FOR SIGNATURE')
    const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs)
    console.log('Submitting Transaction')
    const tx = await this.submitTransaction(signResult)
    console.log('TX', tx)
    if(tx) {
      await BCMR.buildAuthChain({ transactionHash: this.tokenId, network: this.ownerWallet!.network })
    }

  }
}
