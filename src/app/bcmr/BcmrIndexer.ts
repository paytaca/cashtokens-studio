import { Bcmr } from "./Bcmr"
import { Registry, TokenCategory, URIs } from "./bcmr-v2.schema"


export class BcmrIndexer {
  apiBaseUri: string
  processing?:string
  error?: unknown
  
  constructor(){
    if (!process.env.BCMR_API) throw new Error('BCMR_API not set')
    this.apiBaseUri = process.env.BCMR_API
  }

  /**
   * Fetches the TokenCategory portion of the registry
   */
  async fetchToken(tokenId:string): Promise<TokenCategory|undefined> {
    this.processing = 'Fetching token details'
    try {
      const r = await fetch(`${this.apiBaseUri}bcmr/${tokenId}/token`)
      return await r.json()
    } catch (error) {
      console.log(`Error fetching token details of ${tokenId} from indexer`, error)
    } finally {
      delete this.processing
    }
  }  
  
  /**
   * Fetches the URIs portion of the registry
   */
  async fetchTokenUris(tokenId:string): Promise<URIs|undefined>{
    try {
      this.processing = 'Fetching token uris'
      const r = await fetch(`${process.env.BCMR_API}bcmr/${tokenId}/uris`)  
      return await r.json()
    } catch (error) {
      console.log(`Error fetching uris of ${tokenId} from indexer`, error)
    } finally {
      delete this.processing
    }
  }

  /**
   * Download entire BCMR content from BCMR indexer
   */
  async fetchBcmrContents(tokenId:string): Promise<Registry|undefined> {
    try {
      this.processing = 'Downloading token registry'
      const r = await fetch(`${process.env.BCMR_API}bcmr/${tokenId}`)  
      return await r.json()
    } catch (error) {
      console.log(`Error downloading registry of ${tokenId} from indexer`, error)
    } finally {
      delete this.processing
    }
    return
  }
}
