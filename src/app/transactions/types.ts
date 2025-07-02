export type SignTransaction = (decodedTransaction:any, sourceOutputs:any, broadcast?:boolean, prompt?: string) => Promise<any>
export type SignMessage = (message:any, broadcast?:boolean, prompt?: string) => Promise<any>
export type SigningResult = {
  signedTransaction?: string,
  message?: string,
  walletType?: 'p2pkh' | 'p2shMultisig',
  p2shMultisigSpec?: {
    m: number,
    n: number,
    sigAlgo: 'schnorr' | 'ecdsa'
  },
  statusUrl: string,
  txid?: string,
  txidIsUnsignedHash?: boolean
}
export interface TransactionSigner {
  type: 'paytaca' | 'walletconnect',
  // address?: string,
  signTransaction: SignTransaction,
  signMessage: SignMessage
}
