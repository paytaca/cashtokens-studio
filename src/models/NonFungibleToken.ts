import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';
import AuthNFT from './AuthNFT';
import AuthGuard from './AuthGuard';
import calcMinerFee from 'src/utils/calcMinerFee';

export default class NonFungibleToken extends CashStudioToken{

  /**
   * The token capability of the authchain identity output. This is
   * an arbitrary value, change if needed.
   */
  static DEFAULT_AUTHCHAIN_IDENTITY_CAPABILITY = NFTCapability.mutable
  /**
   * Output for the actual token category
   */
  prepareNonFungibleTokenReq(opt:{genesis:boolean, capability: NFTCapability, commitment?:string}):TokenSendRequest[] {
    this.ensureOwnerWallet()
    let tokenId = this.txid
    if (!opt?.genesis) {
      if (!this.token?.tokenId) {
        throw new Error('Invalid token id')
      }
      tokenId = this.token.tokenId
    }
    const requests = []
    requests.push(
      new TokenSendRequest({
        tokenId,
        value: CashStudioToken.DEFAULT_TOKEN_VALUE,
        cashaddr: this.ownerWallet!.getTokenDepositAddress(),
        capability: opt.capability,
        commitment: opt.commitment
      })
    )
    return requests
  }

  async createGenesis(opt:{capability:NFTCapability, commitment: string}): Promise<string | void> {
    this._processing = 'Processing transaction...'
    if (!this.utxo) { // utxo is genesis input during genesis
      delete this._processing
      throw new Error('No utxo to use for genesis')
    }
    if (!this.ownerWallet) {
      delete this._processing
      throw new Error('The ownerWallet is not set')
    }
    if (!opt.capability) { // TODO: add constraint for MAX if we solve the issue with the precision of casting a large value to Number
      delete this._processing
      throw new Error('NFT requires capability')
    }
    const requests:(TokenSendRequest|OpReturnData|SendRequest)[] = []
    try {
      requests.push(this.prepareAuthchainIdentityReq({genesis:true, capability: NonFungibleToken.DEFAULT_AUTHCHAIN_IDENTITY_CAPABILITY }))
      requests.push(...this.prepareNonFungibleTokenReq({genesis:true, capability: opt.capability, commitment: opt.commitment}))
      requests.push(...this.prepareRegistryPublicationReq())
      // requests.push(...this.prepareChangeReq(this.utxo)) // change was auto returned
      const {encodedTransaction, sourceOutputs} = await this.buildGenesisTransaction(requests)
      const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs)
      const tx = await this.submitTransaction(signResult)
      if(tx) {
        this._message = { type: 'success', text: `Success! Tx = ${tx}`}
        this._processing = 'Building authchain'
        await BCMR.buildAuthChain({ transactionHash: this.utxo.txid, network: this.ownerWallet!.network })
      }
      return tx
    } catch (error) {
      throw error
    } finally {
      delete this._processing
    }
  }
}
