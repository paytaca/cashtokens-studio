import { Extensions, Network, NftType, TokenI, URIs, Wallet } from "mainnet-js"
import { IdentityHistory } from "./bcmr/bcmr-v2.schema"
import { TransactionSigner } from "./types"
import { stringify } from "@bitauth/libauth"

export type NFTProjectPublishingOptions = {
  tokenId: string,
  mintingContractName: string,
  mintingContractParams: any,
  mintingContractScript: string,
  mintingPrice: string|number,
  mintingBannerMessage: string,
  mintingDate: any,
  collectionSize: number,
  publisherAddress: string,
  publishedOn?: string|number,
  network: Network
}

export type FetchPublishedNFTProjectsOptions = {
  tokenId: string,
  publisherAddress: string
}

export abstract class CtsRegistry {

  apiBaseUri?: string
  processing?:string
  error?: unknown
  CTS_API_KEY_CUSTOM_HEADER?: string
  CTS_API_KEY?: string
  constructor(){
    if (!process.env.CTS_REGISTRY_API) throw new Error('CTS Registry required envs not set')
    this.apiBaseUri = process.env.CTS_REGISTRY_API
  }
}


export class RegistryNftType extends CtsRegistry implements NftType{

  name: string
  description?: string | undefined
  fields?: string[] | undefined
  uris?: URIs | undefined
  extensions?: Extensions | undefined
  saved?: boolean

  constructor(instance: NftType) {
    super()
    this.name = instance.name
    this.description = instance.description
    this.fields = instance.fields
    this.uris = instance.uris
    this.extensions = instance.extensions
  }

  get value() {
    return {
      name: this.name,
      description: this.description,
      fields: this.fields,
      uris: this.uris,
      extensions: this.extensions
    }
  }

  /**
   * @param {TokenI} token The minted token that's being represented by this NftType
   * @param {string} minterAddress The minter's token address
   */
  async saveNft(txid: string, token: TokenI, signer: TransactionSigner, minterAddress: string){
    this.processing = 'Saving'
    const message = {
      txid,
      token: Object.assign({}, token, {amount: token.amount.toString()}),
      nftType: this.value,
      minterAddress: minterAddress
    }
    const signedMessage = await signer.signMessage(JSON.stringify(message))

    if (!signedMessage) {
      this.processing = '' 
      return
    }

    try {
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');

      const r = await fetch(`${this.apiBaseUri}v1/workspace/nft-types`, {
        method: 'POST',
        headers,
        body: JSON.stringify({message, sig: signedMessage})
        
      })
      this.saved = true
      return await r.json()
    } catch (error) {
      throw error
    } finally {
      this.processing = ''
    }
  }
}