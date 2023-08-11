import { UtxoI } from "mainnet-js"

export type FungibleTokenAction = 'genesis'

export type TokenBalance = {
  tokenId: string,
  utxos: UtxoI[],
  balance: bigint
}
