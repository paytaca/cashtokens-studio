import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/app';

type TokenIdCache = {
  [tokenId:string]: string|number|undefined
}

type UIState = {
  statusMessage: string,
  statusMessageType: 'info'|'error'|'success'|'warning'|'',
  statusMessageSpinner: boolean,
  // Just so we can properly position this in the MessageDialog
  statusMessageTxid: string,
  statusMessageContext: ''|'genesis'|'issue-ft'|'send-ft'|'transfer-nft', 
  statusMessageSubjectTokenCategory: string,
  statusMessageSubjectTokenSymbol: string,
  statusMessageSentFTAmount: string,
  statusMessageRecipient: string,
  transactionLogs?: any[],
  /**
   * The token that will loaded in Token Page
   */
  tokenInView?: CashToken | AuthchainIdentity,
  tokenBasicMetadataCache: {tokenId: string, symbol: string, decimals: number|undefined, icon: string|undefined}[],
  tokenIconCache: TokenIdCache,
  tokenSymbolCache: TokenIdCache,
  tokenDecimalsCache: TokenIdCache
}



export const useUI = defineStore('ui', {
  state: (): UIState => ({
    statusMessage: '',
    statusMessageType:'',
    statusMessageTxid: '',
    statusMessageSpinner: false ,
    statusMessageContext: '',
    statusMessageSubjectTokenCategory: '',
    statusMessageSentFTAmount: '',
    statusMessageSubjectTokenSymbol: '',
    statusMessageRecipient: '',
    tokenBasicMetadataCache: [],
    tokenIconCache: {},
    tokenSymbolCache: {},
    tokenDecimalsCache: {}
  }),
  actions: {
    clearStatusMessage() {
      this.statusMessage = ''
      this.statusMessageType = ''
      this.statusMessageSpinner = false
      this.statusMessageContext = '',
      this.statusMessageSubjectTokenCategory = '',
      this.statusMessageSentFTAmount = '',
      this.statusMessageSubjectTokenSymbol = '',
      this.statusMessageRecipient = ''
    },
    setStatusMessage(m: {
        statusMessage:string, 
        statusMessageType?: 'info'|'error'|'success'|'warning', 
        statusMessageSpinner?:boolean, 
        statusMessageTxid?:string,
        statusMessageContext?: ''|'genesis'|'issue-ft'|'send-ft'|'transfer-nft', 
        statusMessageSubjectTokenCategory?: string,
        statusMessageSubjectTokenSymbol?: string,
        statusMessageSentFTAmount?: string,
        statusMessageRecipient?: string,
    }) {
      this.statusMessage = m.statusMessage
      this.statusMessageType = m.statusMessageType || ''
      this.statusMessageTxid = m.statusMessageTxid || ''
      this.statusMessageSpinner = m.statusMessageSpinner || false
      this.statusMessageContext = m.statusMessageContext || ''
      this.statusMessageSubjectTokenCategory = m.statusMessageSubjectTokenCategory || ''
      this.statusMessageSubjectTokenSymbol= m.statusMessageSubjectTokenSymbol || ''
      this.statusMessageSentFTAmount = m.statusMessageSentFTAmount || ''
      this.statusMessageRecipient = m.statusMessageRecipient || ''
    }
  }
});
