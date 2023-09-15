import { NFTCapability, TokenI, UtxoI } from "mainnet-js"

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

