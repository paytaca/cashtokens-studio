import { NFTCapability, UtxoI, Wallet } from "mainnet-js"

/**
 * @deprecated
 */
export type Registry = {
  url:string,
  contentHash:string
}

export type RegistryPublicationInput = {
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

/**
 * @deprecated
 */
export interface AuthChainGuard {
  publish(): Promise<string|undefined>
  transfer(newOwnerAddress: string): Promise<string|undefined>
  burn(): Promise<string|undefined>
  release(recipient: string): Promise<string|undefined>
}

/**
 * @deprecated
 */
export interface MBC {
  unlockWithNft(): Promise<string|undefined>
}

export interface Authchain {
  publish(): Promise<string|undefined>
  transfer(newOwnerAddress: string): Promise<string|undefined>
  burn(): Promise<string|undefined>
}

export interface AuthGuard {
  unlockWithNft(p: {contractOwner:string, to: string, ftAmountToUnlock: bigint|string|number }): Promise<string|undefined>
}

export interface AuthNFT {
  utxo?: UtxoI
  ownerWallet?: Wallet
}

export interface CashStudioTokenI extends Processing, Messaging{
  /**
   * You set this to genesis input utxo during genesis
   */
  utxo?: UtxoI
  /**
   * You set this to an existing AuthNFT during genesis
   */
  authNFT?: AuthNFT
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet
}


