import { AuthChain, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet } from "mainnet-js"
import CashStudioToken from "./CashStudioToken"
import { Contract } from "@mainnet-cash/contract"
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
  publish(opt:{url:string, contentHash:string}): Promise<string|undefined>
  transfer(newOwnerAddress: string): Promise<string|undefined>
  burn(): Promise<string|undefined>
}

export interface AuthGuard {
  ownerWallet?: Wallet
  authNFT?: AuthNFT
  contract?: Contract
  unlockWithNft: Function
}

export interface CashStudioTokenI extends UtxoI{
  /**
   * You set this to an existing AuthNFT during genesis
   */
  authNFT?: AuthNFT
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet
  useAuthGuard?: boolean
}

export interface AuthNFT extends CashStudioTokenI {
  utxo?: UtxoI
  authGuard?: AuthGuard
}



