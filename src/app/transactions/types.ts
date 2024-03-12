export type SignTransaction = (decodedTransaction:any, sourceOutputs:any, broadcast?:boolean, prompt?: string) => Promise<any>
export type SignMessage = (message:any, broadcast?:boolean, prompt?: string) => Promise<any>
export type SigningResult = {
  signedTransaction: string
}
export interface TransactionSigner {
  type: 'paytaca' | 'walletconnect',
  // address?: string,
  signTransaction: SignTransaction,
  signMessage: SignMessage
}
