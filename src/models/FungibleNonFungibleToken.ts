import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';

export default class FungibleNonFungibleToken extends CashStudioToken{

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

  /**
   * Unwrap utxo
   */
  set utxo(u:UtxoI) {
    this.vout = u.vout
    this.txid = u.txid
    this.satoshis = u.satoshis
    this.height = u.height
    this.coinbase = u.coinbase
    this.token = u.token
  }


  async createGenesis(): Promise<string | void> {
    if (!this.txid) {
      throw new Error('Txid not set, this\'ll be used as token category')
    }
    if (!this.token?.capability || !this.token?.amount) {
      throw new Error('Capability and Amount are required for FNFT')
    }
    if (!this.ownerWallet) {
      throw new Error('The ownerWallet is not set')
    }
    const requests:(TokenSendRequest|OpReturnData|SendRequest)[] = []
    requests.push(this.prepareAuthchainIdentityReq())
    requests.push(
      // Release the actual NFT to owner's address
      new TokenSendRequest({
        cashaddr: this.ownerWallet!.getTokenDepositAddress(),
        tokenId: this.txid,
        amount: this.token!.amount,
        value: CashStudioToken.DEFAULT_TOKEN_VALUE,
        capability: this.token!.capability,
        commitment: this.token?.commitment
      })
    )
    requests.push(...this.prepareRegistryPublicationReq())
    requests.push(...this.prepareChangeReq(this.utxo))
    const {encodedTransaction, sourceOutputs} = await this.buildGenesisTransaction(requests)
    const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs)
    const tx = await this.submitTransaction(signResult)
    if(tx) {
      await BCMR.buildAuthChain({ transactionHash: this.txid, network: this.ownerWallet!.network })
    }

  }
}
