

import { Wallet } from 'mainnet-js';

type UIMessage = {
  text: string,
  type: ''| 'error' | 'warning' | 'info' | 'success',
  withLoader?: boolean,
  timeout?: number
}

type AppEnv = 'development' | 'development-build' | 'production'

type UIStore = {
  paytacaInstalled: boolean,
  isBusy: boolean,
  message: UIMessage
}

type BcmrBasic = {
  tokenId: string,
  name: string,
  symbol: string,
  maxSupply: number,
  bcmrUrl: string
}

type updateBcmr =  (contractOwnerAddress:string, contractAddress:string, tokenId:string, paramMintCost:number, paramMaxSupply:number,  paramTokenValue:number, newBcmrUri: string) => Promise<void>

// stores
type UserState = {
  connectedPaytacaAddress: string | undefined,
  connectedPaytacaWalletBchBalance: string | number,
  createdFts: any[],
  wallet: Wallet|null
}


type RequireOptional<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

type TokenType = 'fungible' | 'nonfungible' | 'hybrid'
