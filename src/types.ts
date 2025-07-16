export {}
declare global {
  interface Window {
    paytaca: any
    Buffer: any,
    localForage: any
  }
}

import { WalletTemplate } from 'bitauth-libauth-v3'
import 'mainnet-js'
declare module 'mainnet-js' {
  interface Wallet {
    walletConnectSession?: any & { sessionProperties: { wallet:  { template: WalletTemplate } } }
  }
}