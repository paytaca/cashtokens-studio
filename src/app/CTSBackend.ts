import { Network } from "mainnet-js"

export type NFTProjectPublishingOptions = {
  tokenId: string,
  mintingContractName: string,
  mintingContractParams: any,
  mintingContractScript: string,
  mintingPrice: string|number,
  mintingDate: any,
  collectionSize: number,
  publisherAddress: string,
  publishedOn?: string|number,
  network: Network
}

export class CTSBackend {
  apiBaseUri: string
  processing?:string
  error?: unknown
  constructor(){
    if (!process.env.CTS_API) throw new Error('CTS_API not set')
    this.apiBaseUri = process.env.CTS_API
  }

  /**
   * Publishes a minting project to CashTokens Studio.
   */
  async publishNFTProject(opt: NFTProjectPublishingOptions): Promise<boolean> { 
    try {
      if (!opt.publishedOn) {
        opt.publishedOn = new Date().getTime()
      }
      console.log(opt)
      const r = await fetch(`${this.apiBaseUri}v1/nft-projects`, {
        method: 'POST',
        body: JSON.stringify(opt)
      })
      console.log(r)
      console.log(await r.json())
      return true
    } catch (error) {
      throw error 
    }
    
  }
}