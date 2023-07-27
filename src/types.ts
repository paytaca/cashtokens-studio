

import { Wallet } from 'mainnet-js';

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
  connectedPaytacaAddress: string | undefined,
  connectedPaytacaWalletBchBalance: string | number,
  createdFts: any[],
  wallet: Wallet|null,
  /**
   * Utxos acceptable as authchain authbases, zeroeth decendant outputs
   */
  genesisInputs: []
}


export type RequireOptional<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

export type TokenType = 'fungible' | 'nonfungible' | 'hybrid'

declare global {
  interface Window { paytaca: any; }
}
