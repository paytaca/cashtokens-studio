import { defineStore } from 'pinia';

declare type UIMessage = {
  text: string,
  type: ''| 'error' | 'warning' | 'info' | 'success',
  timeout?: number  
}

export const useUIStore = defineStore('ui', {
  state: () => ({
    paytacaInstalled: false,
    isBusy: false,
    message: {} as UIMessage
  }),
  getters: {
    // doubleCount: (state) => state.counter * 2,
  },
  actions: {
    busy(msg: UIMessage){
      this.isBusy = true
      this.message.text = msg.text
      this.message.type = msg.type
    },
    idle(){
      this.isBusy = false
      this.message.text = ''
      this.message.type = ''
    },
    clearMessage(){
      this.message.text = ''
      this.message.type = ''
      delete this.message.timeout 
    },
    setMessage(msg: UIMessage) {
      console.log('MESSAGE', msg)
      this.message = msg
    }
  },
});
