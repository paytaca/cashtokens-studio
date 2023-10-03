import { NFTCapability, TokenI, UtxoI } from "mainnet-js"
import { TokenCategory, URIs } from "./bcmr/bcmr-v2.schema"

export type NftCollectionType = 'SequentialNftCollection' | 'ParsableNftCollection' //

export type GenesisOptions = {
  useAuthGuard?: boolean,                                 // use authguard, default = true
  includeAuthKeyGenesis?: boolean,                        // also create AuthKey genesis, useAuthGuard will be ignored and assumes to be true
  issuedSupply?: { amount: string, recipient: string },   // the token amount to issue
  amount?: string | number,
  capability?: NFTCapability,
  commitment?: string,                                    // could be a number text e.g. '10' or hex '0a' Big Endian
  commitmentFormat?: 'decimal'|'hex'                      // what's the format of the commitment's value
  nftCollectionType?: NftCollectionType
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
  utxos?: UtxoI[],
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

export type CashTokenTransactionType = 
  'AuthKey.transfer'|
  'AuthKey.createGenesis' |
  'AuthchainIdentity.unguard' |
  'AuthchainIdentity.publishRegistry' |
  'AuthchainIdentity.releaseTokensFromReserveSupply' | 
  'Cashtoken.mintChild' |
  'Cashtoken.createGenesis' |
  'GenesisInput.generate' 


export declare interface CashTokenTransaction {
  txid: string,
  txType: CashTokenTransactionType,
  timestamp: number,
  successMsg?: string,
  errorMsg?: string,
}

export type HexString = string & { __hexStringBrand: never };



