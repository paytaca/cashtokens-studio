import { BCMR, NFTCapability, OpReturnData, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';

export default class NonFungibleToken extends CashStudioToken{
  constructor(p:{utxo?:UtxoI, ownerWallet?: Wallet}) {
    super({...p})
  }

  async createGenesis(): Promise<string | void> {
    console.log('CREATING GENESIS', this)

    if (!this.utxo?.token?.tokenId) {
      throw new Error('The tokenId is not set')
    }
    if (!this.utxo?.token?.capability) {
      throw new Error('Capability required for NFT')
    }
    if (!this.ownerWallet) {
      throw new Error('The ownerWallet is not set')
    }
    const requests:(TokenSendRequest|OpReturnData)[] = []
    requests.push(this.prepareIdentityOutputRequest())
    requests.push(
      new TokenSendRequest({
        cashaddr: this.ownerWallet!.getTokenDepositAddress(),
        tokenId: this.utxo.token.tokenId!,
        value: 1000,
        capability: this.utxo?.token?.capability,
        commitment: this.utxo?.token?.commitment
      }) // Release NFT to owner's address
    )
    // TODO: ADD CHANGE
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
      await BCMR.buildAuthChain({ transactionHash: this.utxo.token.tokenId, network: this.ownerWallet!.network })
    }

  }
}
