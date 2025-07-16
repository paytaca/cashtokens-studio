import { Wallet, TestNetWallet, DefaultProvider } from 'mainnet-js';
import { cashAddressToTokenAddress } from './cashAddressToTokenAddress';
// DefaultProvider.servers.testnet = ["wss://chipnet.imaginary.cash:50004"];
// DefaultProvider.servers.mainnet = ["wss://fulcrum.pat.mn:50004"];
// DefaultProvider.servers.testnet = ['wss://blackie.c3-soft.com:64004'];
DefaultProvider.servers.mainnet = [
  'wss://electrum.imaginary.cash:50004'
  // 'wss://bch.imaginary.cash:50004',
  // 'wss://electrum.imaginary.cash:50004',
  // 'wss://fulcrum.pat.mn:50004'
]
DefaultProvider.servers.testnet = [
  'wss://chipnet.c3-soft.com:64004',
  // 'wss://chipnet.imaginary.cash:50004',
];

export default () => {
  let WalletClass = Wallet;
  if (
    process.env.APP_ENV === 'development' ||
    process.env.APP_ENV === 'development-build'
  ) {
    WalletClass = TestNetWallet;
  }
  WalletClass.prototype.getTokenDepositAddress = function () {
    if (this.cashaddr) {
      return cashAddressToTokenAddress(this.cashaddr)
    }
    return ''
  }
  return WalletClass;
};
