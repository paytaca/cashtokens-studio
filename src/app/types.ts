import { NFTCapability, TokenI, UtxoI } from "mainnet-js"
import { TokenCategory, URIs } from "./bcmr/bcmr-v2.schema"

export type GenesisOptions = {
  useAuthGuard?: boolean,                                 // use authguard, default = true
  includeAuthKeyGenesis?: boolean,                        // also create AuthKey genesis, useAuthGuard will be ignored and assumes to be true
  issuedSupply?: { amount: string, recipient: string }, // the token amount to issue
  amount?: string | number,
  capability?: NFTCapability,
  commitment?: string
}

export type TokenBalance = {
  tokenId: string,
  utxos: UtxoI[],
  balance: bigint
}

/**
 * Aggregated fungible token balance
 */
export type FungibleTokenBalance = {
  tokenId: string,
  utxoCount: number,
  balance: bigint,
  owner: string,
  tokenUris?: URIs,
  tokenCategory?: TokenCategory
}

export declare interface BcmrStorageArtifact {
  uris: {
    https: string,
    ipfs: string
  },
  contentHash: string
}

export declare interface PaginatedData {
  count: number,
  limit: number,
  offset: number,
  next: string|null,
  previous: string|null
  results: any[]
}



