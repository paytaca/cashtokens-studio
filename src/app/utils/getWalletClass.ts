import { Wallet, TestNetWallet, DefaultProvider } from 'mainnet-js';
// DefaultProvider.servers.testnet = ["wss://chipnet.imaginary.cash:50004"];
// DefaultProvider.servers.mainnet = ["wss://fulcrum.pat.mn:50004"];
// DefaultProvider.servers.testnet = ['wss://blackie.c3-soft.com:64004'];
DefaultProvider.servers.testnet = [
  'wss://chipnet.c3-soft.com:64004',
  'wss://chipnet.imaginary.cash:50004',
];

export default () => {
  let WalletClass = Wallet;
  if (
    process.env.APP_ENV === 'development' ||
    process.env.APP_ENV === 'development-build'
  ) {
    WalletClass = TestNetWallet;
  }
  return WalletClass;
};
