import { Network, Wallet } from "mainnet-js"
import { IdentityHistory } from "./bcmr/bcmr-v2.schema"
import { TransactionSigner } from "./types"

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

export class CTSRegistry {
  apiBaseUri: string
  processing?:string
  error?: unknown
  CTS_API_KEY_CUSTOM_HEADER?: string
  CTS_API_KEY?: string
  constructor(){
    if (!process.env.CTS_REGISTRY_API) throw new Error('CTS Registry required envs not set')
    this.apiBaseUri = process.env.CTS_REGISTRY_API
  }

  /**
   * Add the new identity to registry
   */
  async addIdentity(authbase: string, identityHistory: IdentityHistory){
    try {
      const headers = new Headers();

      // Add headers to the Headers object
      headers.append('Content-Type', 'application/json');
      headers.append(this.CTS_API_KEY_CUSTOM_HEADER!, this.CTS_API_KEY!);
      const resp = await fetch(`${this.apiBaseUri}/api/v1/identities/${authbase}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(identityHistory)
      })
      console.log(await resp)
    } catch (error) {
      console.log(error)
    }
  }

  async createWorkspace(signer: TransactionSigner, message: string){
    const signedMessage = await signer.signMessage(message)

    if (!signedMessage) {
      return
    }

    try {
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');

      const resp = await fetch(`${this.apiBaseUri}v1/workspace/temp/nfts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({message: message, sig: signedMessage})
      })
      console.log(await resp.json())
    } catch (error) {
      throw error
    }

  }
}
