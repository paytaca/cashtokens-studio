import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    isBusy: false,
    message: { text: '', type: '' as '' | 'error' | 'warning' | 'info' }
  }),
  getters: {
    // doubleCount: (state) => state.counter * 2,
  },
  actions: {
    busy({text, type}){
      this.isBusy = true
      this.message.text = text
      this.message.type = type
    },
    idle(){
      this.isBusy = false
      this.message.text = ''
      this.message.type = ''
    }
  },
});
