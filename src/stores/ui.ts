import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    paytacaInstalled: false,
    isBusy: false,
    message: {} as UIMessage,
    messages: [] as UIMessage[]
  }),
  getters: {
    // doubleCount: (state) => state.counter * 2,
  },
  actions: {
    busy(msg: UIMessage){
      this.isBusy = true
      this.message.text = msg.text
      this.message.type = msg.type
      this.messages.push(msg)
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
    },
    addLoaderMessage(msg: UIMessage) {
      this.messages.push({...msg, withLoader: true})
    },
    addMessage(msg: UIMessage) {
      this.messages.push(msg)
    }
  },
});
