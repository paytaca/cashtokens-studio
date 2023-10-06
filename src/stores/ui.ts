import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/app';

type UIState = {
  statusMessage: string,
  statusMessageType: 'info'|'error'|'success'|'warning'|'',
  statusMessageSpinner: boolean,
  // Just so we can properly position this in the MessageDialog
  statusMessageTxid: string, 
  transactionLogs?: any[],
  /**
   * The token that will loaded in Token Page
   */
  tokenInView?: CashToken | AuthchainIdentity
}

export const useUI = defineStore('ui', {
  state: (): UIState => ({
    statusMessage: '',
    statusMessageType:'',
    statusMessageTxid: '',
    statusMessageSpinner: false 
  }),
  actions: {
    clearStatusMessage() {
      this.statusMessage = ''
      this.statusMessageType = ''
      this.statusMessageSpinner = false
    },
    setStatusMessage(m: {statusMessage:string, statusMessageType?: 'info'|'error'|'success'|'warning', statusMessageSpinner?:boolean, statusMessageTxid?:string}) {
      this.statusMessage = m.statusMessage
      this.statusMessageType = m.statusMessageType || 'success'
      this.statusMessageTxid = m.statusMessageTxid || ''
      this.statusMessageSpinner = m.statusMessageSpinner || false
      
    }
  }
});
