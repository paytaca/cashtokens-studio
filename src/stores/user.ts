import { defineStore } from 'pinia'
import { constants } from 'boot/constants'
import { UserState } from 'src/types'

export const useUser = defineStore('user', {
  state: (): UserState => ({
    updatingBalances: false,
    genesisInputs: []
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
