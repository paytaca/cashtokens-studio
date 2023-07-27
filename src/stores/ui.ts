import { defineStore } from 'pinia';
import { UIMessage } from 'src/types';
import { Registry as BcmrRegistry } from 'src/interfaces/bcmr-v2.schema'

type UIState = {
  paytacaInstalled: boolean,
  isBusy: boolean,
  message: UIMessage,
  messages: UIMessage[],
  loadedRegistry?: BcmrRegistry
  loadedRegistryUpdated?: boolean,
  pageLoader: {show? :boolean, label?: string},
  innerLoader: {show? :boolean, label?: string}

}

export const useUIStore = defineStore('ui', {
  state: ():UIState => ({
    paytacaInstalled: false,
    isBusy: false,
    message: {} as UIMessage,
    messages: [] as UIMessage[],
    pageLoader: {show: false},
    innerLoader: {show: false},
  }),
  getters: {
    // doubleCount: (state) => state.counter * 2,
  },
  actions: {
    busy(msg: UIMessage){
      this.isBusy = true
      this.message.text = msg.text
      this.message.type = msg.type
      // this.messages.push(msg)
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
    },
    showPageLoader(label: string) {
      this.pageLoader.show = true
      this.pageLoader.label = label
    },
    hidePageLoader() {
      this.pageLoader.show = false
      delete this.pageLoader.label
    },
    showInnerLoader(label: string) {
      this.innerLoader.show = true
      this.innerLoader.label = label
    },
    hideInnerLoader() {
      this.innerLoader.show = false
      delete this.innerLoader.label
    }
  },
});
