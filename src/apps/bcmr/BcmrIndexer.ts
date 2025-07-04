import { Registry, TokenCategory, URIs } from "mainnet-js"
import querify from "../utils/querify"
import { Bcmr } from "./Bcmr"


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
  async fetchBcmrContents(tokenId:string): Promise<Registry|undefined|{error: string}> {
    try {
      this.processing = 'Fetching token registry'
      const r = await fetch(`${process.env.BCMR_API}bcmr/${tokenId}`)  
      return await r.json()
    } catch (error) {
      console.log(`Error fetching registry of ${tokenId} from indexer`, error)
    } finally {
      delete this.processing
    }
    return
  }


  /**
   * @returns {undefined|'SequentialNftCollection'|'ParsableNftCollection'} The nft collection type if token is an nft.
   */
  async getNftCollectionType(tokenId:string): Promise<undefined|'SequentialNftCollection'|'ParsableNftCollection'> {
    try {
      this.processing = 'Fetching token registry'
      const r = await fetch(`${process.env.BCMR_API}registry/${tokenId}/identity-snapshot/token-category/nfts/parse/bytecode/`)  
      if (r.status == 200) {
        const rj = await r.json()
        if (!rj.bytecode || rj.bytecode == '00d26b') { // see https://github.com/bitjson/chip-bcmr/blob/master/bcmr-v2.schema.ts#L405
          return 'SequentialNftCollection'
        }
        return 'ParsableNftCollection'
      }
    } catch (error) {
      throw error 
    } finally {
      delete this.processing
    }
  }

  async getNftType(tokenId:string, commitment: string): Promise<any> {
    try {
      this.processing = 'Fetching token registry'
      const r = await fetch(`${process.env.BCMR_API}registry/${tokenId}/identity-snapshot/token-category/nfts/parse/types/${commitment}/?include_metadata=true`)  
      if (r.status == 200) {
        const rj = await r.json()
        return rj
      }
    } catch (error) {
      throw error 
    } finally {
      delete this.processing
    }
  }

  /**
   * TODO: check usage
   * @deprecated Use fetchIdentitySnapshot for consistency. 
   * @returns {undefined|'SequentialNftCollection'|'ParsableNftCollection'} The nft collection type if token is an nft.
   */
    async getIdentitySnapshot(tokenId:string): Promise<undefined|any> {
      try {
        this.processing = 'Fetching token registry'
        const r = await fetch(`${process.env.BCMR_API}registry/${tokenId}/identity-snapshot/`)  
        if (r.status == 200) {
          const rj = await r.json()
          return rj
        }
      } catch (error) {
        throw error 
      } finally {
        delete this.processing
      }
    }

  async fetchNftTypes(tokenId:string, query?: any): Promise<any> {
    try {
      this.processing = 'Fetching token registry'
      let url = `${process.env.BCMR_API}registry/${tokenId}/identity-snapshot/token-category/nfts/parse/types/`
        if (query) {
          url += '?' + querify(query)
        }
      const r = await fetch(url)  
      if (r.status == 200) {
        const rj = await r.json()
        return rj
      }
    } catch (error) {
      throw error 
    } finally {
      delete this.processing
    }
  }
  
  async fetchMintedNftTypes(tokenId:string, query?: any): Promise<any> {

    try {
      this.processing = 'Fetching token registry'
      let url = `${process.env.BCMR_API}cashtokens/${tokenId}/nfts/`
        if (query) {
          url += '?' + querify(query)
        }
      const r = await fetch(url)  
      if (r.status == 200) {
        const rj = await r.json()
        return rj
      }
    } catch (error) {
      throw error 
    } finally {
      delete this.processing
    }
  }
  
  async fetchIdentitySnapshot(tokenId:string): Promise<undefined|any> {
    try {
      this.processing = 'Fetching token identity snapshot'
      const r = await fetch(`${process.env.BCMR_API}registry/${tokenId}/identity-snapshot/`)  
      if (r.status == 200) {
        const rj = await r.json()
        return rj
      }
    } catch (error) {
      throw error 
    } finally {
      delete this.processing
    }
  }


  async fetchRegistry(tokenId:string, include_identities?: boolean): Promise<undefined|Registry> {
    try {
      this.processing = 'Fetching token registry'
      const r = await fetch(`${process.env.BCMR_API}registry/${tokenId}/?include_identities=${!!include_identities}`)  
      if (r.status == 200) {
        const rj = await r.json()
        return rj
      }
    } catch (error) {
      throw error 
    } finally {
      delete this.processing
    }
  }


}
