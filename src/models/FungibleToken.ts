import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet, binToHex, hexToBin, qrAddress, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';
import AuthNFT from './AuthNFT';
import AuthGuard from './AuthGuard';
import calcMinerFee from 'src/utils/calcMinerFee';
import { cashAddressToLockingBytecode } from '@bitauth/libauth';
import constants from 'src/constants';

export default class FungibleToken extends CashStudioToken{

  private static _processing?:string

  static get processing():string|undefined {
    return FungibleToken._processing
  }
   /**
   * Prepare the request for user token's genesis
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
    return requests
  }

  async createGenesis(opt:{useAuthGuard?:boolean, genesisSupply:number, issuedSupply?: {amount:number, recipient: string}}): Promise<string | void> {
    this.useAuthGuard = opt?.useAuthGuard || true

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
    if (!this.authNFT) {
      delete this._processing
      throw new Error('Missing authNFT ')
    }
    const requests:(TokenSendRequest|OpReturnData|SendRequest)[] = []
    try {
      // Following BCMR spec regarding Reserved/Unissued supply,
      // FT reserves are in the authchain's identity output and capability = 'mutable'
      requests.push(this.prepareAuthchainIdentityReq({genesis:true, genesisSupply: opt.genesisSupply, capability: NFTCapability.mutable}))
      if (this.useAuthGuard) {
        requests.push(this.prepareAuthNFTReq({genesis:true}))
      }
      requests.push(...this.prepareFungibleTokenReq({genesis:true, genesisSupply: opt.genesisSupply, issuedSupply:opt.issuedSupply}))
      requests.push(...this.prepareRegistryPublicationReq())
      const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests)
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

  static async scanWalletForFungibleTokens(ownerWallet: Wallet): Promise<UtxoI[]> {
    return (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => u.token && u.token?.amount > 0 && !u.token?.capability) || []
  }

  static async send(arg:{tokenId: string, amount: bigint, to: string, ownerWallet: Wallet}):Promise<string|undefined> {
    // if (arg.sourceUtxos === undefined) {
    //   arg.sourceUtxos = await FungibleToken.scanWalletForFungibleTokens(arg.ownerWallet)
    // }
    // console.log('SOURCES', arg.sourceUtxos)
    FungibleToken._processing = 'Processing'
    // const minerFee = calcMinerFee({P2PKH:arg.sourceUtxos.length}, {P2SH:1, P2KPH:1})
    // const sendCost = minerFee + CashStudioToken.DEFAULT_TOKEN_VALUE
    // console.log('SOURCE UTXOS', arg.sourceUtxos)
    const requests = [
      new TokenSendRequest({
        cashaddr: arg.to,
        value: CashStudioToken.DEFAULT_TOKEN_VALUE,
        amount: Number(arg.amount), // !change to bigint once mainnet-js supports it
        tokenId: arg.tokenId
      })
    ]
    // TODO: CALCULATE IF SOURCE HAS ENOUGH TO FUND, ADD FUNDER INPUT IF NEEDED
    const { encodedTransaction, sourceOutputs } = await arg.ownerWallet!.encodeTransaction(
      requests,
      false,
      {
        tokenOperation: 'send',
        checkTokenQuantities: true,
        buildUnsigned: true,
        // utxoIds: arg.sourceUtxos,
        // ensureUtxos: arg.sourceUtxos
      }
    )

    FungibleToken._processing = 'Waiting for signature'
    let signResult
    try {
      signResult = await CashStudioToken.requestPaytacaSignature(encodedTransaction, sourceOutputs, 'Send Tokens')
    } catch (error) {
      console.log(error)
      throw error
    }
    FungibleToken._processing = `Sending ${arg.amount} tokens`
    try {
      return await CashStudioToken.submitTransaction(signResult, arg.ownerWallet)
    } catch (error) {
      console.log(error)

      throw error
    } finally {
      delete FungibleToken._processing
    }


  }

}
