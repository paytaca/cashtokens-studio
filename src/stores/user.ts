import { defineStore } from 'pinia'
import { Wallet } from 'mainnet-js';
import { constants } from 'boot/constants'

export const useUserStore = defineStore('user', {
  state: () => ({
    connectedPaytacaAddress: '' as string,
    connectedPaytacaWalletBchBalance: '0',
    createdFts: <any>[],
    wallet: null
  }),
  getters: {
    walletNetworkType():('mainnet' | 'testnet' | 'chipnet'){
      if (process.env.APP_ENV === constants.AppEnv.DEVELOPMENT || process.env.APP_ENV === constants.AppEnv.DEVELOPMENT || this.connectedPaytacaAddress?.startsWith('bchtest')) {
        return 'chipnet'
      }
      return 'mainnet'
    }
  }
});
