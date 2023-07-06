

type UIMessage = {
  text: string,
  type: ''| 'error' | 'warning' | 'info' | 'success',
  withLoader?: boolean,
  timeout?: number
}

type UIStore = {
  paytacaInstalled: boolean,
  isBusy: boolean,
  message: UIMessage
}

type UserStore = {
  connectedPaytacaAddress: string | undefined,
  connectedPaytacaWalletBchBalance: string | number
}


type updateBcmr =  (contractOwnerAddress:string, contractAddress:string, tokenId:string, paramMintCost:number, paramMaxSupply:number,  paramTokenValue:number, newBcmrUri: string) => Promise<void>
