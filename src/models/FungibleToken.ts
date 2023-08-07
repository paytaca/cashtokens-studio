import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';
import AuthNFT from './AuthNFT';
import AuthGuard from './AuthGuard';
import calcMinerFee from 'src/utils/calcMinerFee';

export default class FungibleToken extends CashStudioToken{
  /**
   * Output for the actual token category
   */
  prepareFungibleTokenReq(opt:{genesis:boolean, genesisSupply:number, issuedSupply?: {amount:number, recipient: string}}):TokenSendRequest[] {
    this.ensureOwnerWallet()
    let tokenId = this.txid
    if (!opt?.genesis) {
      if (!this.token?.tokenId) {
        throw new Error('Invalid token id')
      }
      tokenId = this.token.tokenId
    }

    const requests = []

    if (opt.issuedSupply) { // applicable during token genesis and when issuing a token post genesis
      if (!opt.issuedSupply.amount || !opt.issuedSupply.recipient || opt.issuedSupply.amount > opt.genesisSupply) {
        throw new Error('Invalid value for issued supply amount or recipient!')
      }
      requests.push(
        new TokenSendRequest({
          tokenId,
          value: CashStudioToken.DEFAULT_TOKEN_VALUE,
          cashaddr: opt.issuedSupply.recipient,
          amount: opt.issuedSupply.amount
        })
      )
    }

    // TODO: DELETE TESTING CREATING AUTHNFT WITH THE SAME CATEGORY AS THE FUNGIBLE TOKEN
    // requests.push(
    //   new TokenSendRequest({
    //     tokenId,
    //     value: CashStudioToken.DEFAULT_TOKEN_VALUE,
    //     cashaddr: this.ownerWallet!.getTokenDepositAddress(),
    //     amount: 0,
    //     commitment: '00'
    //   })
    // )
    return requests
  }

  async createGenesis(opt:{genesisSupply:number, issuedSupply?: {amount:number, recipient: string}}): Promise<string | void> {
    this._processing = 'Processing transaction...'
    if (!this.utxo) { // utxo is genesis input during genesis
      delete this._processing
      throw new Error('No utxo to use for genesis')
    }
    if (!this.ownerWallet) {
      delete this._processing
      throw new Error('The ownerWallet is not set')
    }
    if (!opt.genesisSupply || opt.genesisSupply <= 0 ) { // TODO: add constraint for MAX if we solve the issue with the precision of casting a large value to Number
      delete this._processing
      throw new Error('Invalid fungible amount!')
    }
    const requests:(TokenSendRequest|OpReturnData|SendRequest)[] = []
    try {
      // Following BCMR spec regarding Reserved/Unissued supply,
      // FT reserves are in the authchain's identity output and capability = 'mutable'
      requests.push(this.prepareAuthchainIdentityReq({genesis:true, genesisSupply: opt.genesisSupply, capability: NFTCapability.mutable}))
      requests.push(...this.prepareFungibleTokenReq({genesis:true, genesisSupply: opt.genesisSupply, issuedSupply:opt.issuedSupply}))
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
