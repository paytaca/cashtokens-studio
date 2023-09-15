import { UtxoI, Wallet, NetworkType } from 'mainnet-js'
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/app/utils/getWalletClass'
import { AuthchainIdentity } from './AuthchainIdentity'
import { PaginatedData } from './types'
import querify from './utils/querify'

type FetchAuthchainIdentitiesQueryParams = {
  limit?: number, 
  offset?: number, 
  token_amount__eq?: number,
  token_amount__gte?: number,
  token_amount__lte?: number,
  token_is_nft?: boolean,
  token_capability?: boolean,
  token_commitment?: boolean,
  authguard?: string
}

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
    console.log(q)
    try {
      let url = `${this.apiBaseUri}cts/authchain-identities/${address}`
      if (q) {
        url += '?' + querify(q)
      }
      // url += q?.limit !== undefined || q?.offset !== undefined? '?' : ''
      // url += q?.limit !== undefined ? `limit=${q?.limit}&`: ''
      // url += q?.offset !== undefined ? `offset=${q?.offset}`: ''
      console.log('URL', url)
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
}
