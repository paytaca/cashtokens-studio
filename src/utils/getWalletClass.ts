import { Wallet, TestNetWallet, DefaultProvider } from 'mainnet-js';

DefaultProvider.servers.testnet = ['wss://blackie.c3-soft.com:64004'];

export default () => {
  let WalletClass = Wallet;
  if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'development-build') {
    WalletClass = TestNetWallet;
  }
  return WalletClass
}

