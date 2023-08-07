

import { UtxoI, Wallet } from 'mainnet-js';
import { AuthNFT } from './models/interfaces';

export type UIMessage = {
  text: string,
  type: ''| 'error' | 'warning' | 'info' | 'success',
  withLoader?: boolean,
  timeout?: number
}

export type AppEnv = 'development' | 'development-build' | 'production'

export type UIStore = {
  paytacaInstalled: boolean,
  isBusy: boolean,
  message: UIMessage
}

export type BcmrBasic = {
  tokenId: string,
  name: string,
  symbol: string,
  maxSupply: number,
  bcmrUrl: string
}

export type updateBcmr =  (contractOwnerAddress:string, contractAddress:string, tokenId:string, paramMintCost:number, paramMaxSupply:number,  paramTokenValue:number, newBcmrUri: string) => Promise<void>

// stores
export type UserState = {
  connectedPaytacaAddress?: string,
  connectedPaytacaWalletBchBalance?: string | number,
  fts?: UtxoI[],
  nfts?: UtxoI[],
  fnfts?: UtxoI[],
  wallet?: Wallet,
  /**
   * True if wallet is being watched
   */
  walletWatched?: boolean,
  /**
   * Utxos acceptable as authchain authbases, zeroeth decendant outputs
   */
  genesisInputs?: UtxoI[],
  authNFTs?: AuthNFT[],
  updatingBalances: boolean
}


export type RequireOptional<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

export type TokenType = 'fungible' | 'nonfungible' | 'hybrid'
export type TokenAction = 'genesis' | ''
export type RegistryPublicationData = {
  url: string,
  contentHash: string
}
declare global {
  interface Window { paytaca: any; }
}
