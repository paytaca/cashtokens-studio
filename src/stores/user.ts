import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    connectedPaytacaAddress: '',
    connectedPaytacaWalletBchBalance: 0
  }),
  getters: {
    // doubleCount: (state) => state.counter * 2,
  },
  actions: {
  },
});
