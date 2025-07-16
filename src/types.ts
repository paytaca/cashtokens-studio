export {}
declare global {
  interface Window {
    paytaca: any
    Buffer: any,
    localForage: any
  }
}

import 'mainnet-js'
import { WalletTemplate  } from 'bitauth-libauth-v3';

declare module 'mainnet-js' {
  interface Wallet {
    template?: WalletTemplate,
    walletConnectSession?: any
  }
}