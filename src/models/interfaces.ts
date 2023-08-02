import { NFTCapability, Wallet } from "mainnet-js"

export type Registry = {
  url:string,
  contentHash:string
}

type GenesisOptions = {
  recipient: string
}

export type Message = {
  type?: string,
  text: string
}

export interface Processing {
  get processing():string | undefined
}

export interface Messaging {
  get message():Message | undefined
}

export interface GenesisCreator {
  /**
   * Create a token genesis
   * @return {string} The transaction hash on success
   */
  createGenesis(opt: GenesisOptions): Promise<string|void>
}

export interface CashStudioTokenI extends Processing, Messaging{
  tokenId?: string
  amount?:string
  capability?:NFTCapability
  commitment?:string
  registry?: Registry
  ownerWallet?: Wallet
}

export interface AuthchainIdentity {
  /**
   * Create a token genesis
   * @return {string} The transaction hash on success
   */
  createGenesis(opt: GenesisOptions): Promise<string|void>
}
