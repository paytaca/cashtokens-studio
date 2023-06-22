import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    connectedPaytacaAddress: '',
  }),
  getters: {
    // doubleCount: (state) => state.counter * 2,
  },
  actions: {
  },
});
