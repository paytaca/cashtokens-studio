
import { PaginatedData } from './types'
import querify from './utils/querify'

type PaginationQueryParams = {
  limit?: number, 
  offset?: number 
}

type FetchAuthchainIdentitiesQueryParams = {
  token_amount__eq?: number,
  token_amount__gte?: number,
  token_amount__lte?: number,
  token_is_nft?: boolean,
  token_capability?: string,
  token_commitment?: string,
  authguard?: string
} & PaginationQueryParams

type BchBalance = {
  valid?:boolean,
  address?: string,
  spendable?: number,
  balance?: number
}

export type FetchUtxoQueryParams = {
  is_token?: boolean,
  token_type?: 'ft' | 'nft' | 'hybrid',
  capability?: string,
  commitment?: string,
  commitment_ne?: string,
} & PaginationQueryParams

export class Watchtower {
  apiBaseUri: string
  processing?:string
  error?: unknown
  constructor(){
    if (!process.env.WATCHTOWER_API) throw new Error('WATCHTOWER_API not set')
    this.apiBaseUri = process.env.WATCHTOWER_API
  }

  async subscribe(address: string): Promise<any> {
    this.processing = 'Subscribing address to watchtower'
    const res = await fetch(`${process.env.WATCHTOWER_API}subscription/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({address: address})
    })
    delete this.processing 
    return res
  }

  /**
   * Fetches authchain identities associated to the given address. This identities
   * are UtxoI(s) with additional related data. This utxos aren't directly
   * owned by the address, but owned by the AuthGuard contracts that pairs an 
   * AuthKey that is owned by the address.
   * @param {string} address of the owner of the AuthKeys
   * @param {object} q The query parameters
   */
  async fetchAuthchainIdentities(address: string, q?:FetchAuthchainIdentitiesQueryParams): Promise<PaginatedData> {
    this.processing = 'Fetching authchain identities'
    let result: any
    if (q && !q?.limit) {
      q = {...q, limit:10}
    }
    try {
      let url = `${this.apiBaseUri}cts/authchain-identities/${address}`
      if (q) {
        url += '?' + querify(q)
      }
      const r = await fetch(url)
      const result = await r.json()
      return result
    } catch (error) {
      this.error = error
    } finally {
      delete this.processing
    }
    return result
  }

  /**
   * Fetches AuthKeys owned by the given address.
   * @param {string} ownerAddress of the owner of the AuthKeys
   * @param {object} q The query parameters
   */
    async fetchAuthKeys(ownerAddress: string, q?:PaginationQueryParams): Promise<PaginatedData> {
      this.processing = 'Fetching authkeys'
      let result: any
      try {
        let url = `${this.apiBaseUri}cts/authkeys/${ownerAddress}`
        if (q) {
          url += '?' + querify(q)
        }
        const r = await fetch(url)
        result = await r.json()
        return result
      } catch (error) {
        this.error = error
      } finally {
        delete this.processing
      }
      return result
    }

  /**
   * Fetches AuthKeys owned by the given address.
   * @param {string} ownerAddress of the owner of the AuthKeys
   * @param {object} q The query parameters
   */
    async fetchNfts(ownerAddress: string, q?:FetchUtxoQueryParams): Promise<PaginatedData> {
      this.processing = 'Fetching NFTs'
      let result: any
      
      if (!q) {
        q = { is_token: true, token_type: 'nft' }
      } else {
        q = { ...q, is_token: true, token_type: 'nft' }
      }
      try {
        let url = `${this.apiBaseUri}cts/utxos/${ownerAddress}`
        if (q) {
          url += '?' + querify(q)
        }
        const r = await fetch(url)
        result = await r.json()
        return result
      } catch (error) {
        this.error = error
      } finally {
        delete this.processing
      }
      return result
    }

    async fetchFtBalance(ownerAddress: string, q?:FetchUtxoQueryParams): Promise<PaginatedData> {
      this.processing = 'Checking fungible token balances'
      let result: any
      try {
        let url = `${this.apiBaseUri}cts/balances/${ownerAddress}/fts`
        if (q) {
          url += '?' + querify(q)
        }
        const r = await fetch(url)
        
        result = await r.json()
        return result
      } catch (error) {
        this.error = error
      } finally {
        delete this.processing
      }
      return result
    } 

    /**
     * Get the address' BCH balance from watchtower
     */
    async fetchBchBalance(ownerAddress: string): Promise<BchBalance> {
      let b
      try {
        const r = await fetch(`${this.apiBaseUri}balance/bch/${ownerAddress}`)
        b = await r.json()
      } catch (error) {
        this.error = error
      } finally {
        delete this.processing
      }
      return b
    } 


    /**
     * Get the address' BCH balance from watchtower
     * @param {string} tx Raw transaction hash
     */
    async broadcastTx(tx: string): Promise<any> {
      let b
      try {
        const r = await fetch(`${this.apiBaseUri}broadcast/`, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transaction: tx
          })
        })
        b = await r.json()
      } catch (error) {
        this.error = error
      } finally {
        delete this.processing
      }
      return b
    } 
  
    
}
