import { Wallet, TestNetWallet, DefaultProvider } from 'mainnet-js';
import { cashAddressToTokenAddress } from './cashAddressToTokenAddress';
import { WalletTemplate } from 'bitauth-libauth-v3';
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


export const getWalletClass = () => {
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
  WalletClass.prototype.isMultisig = function () {
    if (this.walletConnectSession?.sessionProperties?.wallet?.template) {
      return isMultisigWallet(this.walletConnectSession.sessionProperties.wallet.template)
    }
    return false
  }
  return WalletClass;
};

export const getHDWalletClass = async () => {
  const { HDWallet, TestNetHDWallet } = await import('mainnet-js-v3');
  if (process.env.NETWORK === 'testnet' || import.meta.env.VITE_BCH_NETWORK === 'chipnet') {
    return TestNetHDWallet
  }
  return HDWallet
}


export const isMultisigWallet = (template?: WalletTemplate) => {
    if (!template) return false
    return Boolean(template.scripts.lock?.script.split('\n').find((op) => op === 'OP_CHECKMULTISIG'))
}