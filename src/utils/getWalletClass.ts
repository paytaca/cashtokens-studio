import { boot } from 'quasar/wrappers';

import { Wallet, TestNetWallet } from 'mainnet-js';

export default () => {
  let WalletClass = Wallet;
  if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'development-build') {
    WalletClass = TestNetWallet;
  }
  return WalletClass
} 
