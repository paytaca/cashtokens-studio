import { defineStore } from 'pinia'
import { DialogChainObject } from 'quasar'
import { AuthchainIdentity, CashToken } from 'src/apps'
import { TokenCategory, URIs } from 'mainnet-js'

type TokenIdCache = {
  [tokenId:string]: string|number|undefined
}

type TokenCategoryCache = {
  [tokenId:string]: TokenCategory
}

type TokenUrisCache = {
  [tokenId:string]: URIs
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
  statusUrl: string,
  transactionLogs?: any[],
  /**
   * The token that will loaded in Token Page
   */
  tokenInView?: CashToken | AuthchainIdentity,
  tokenBasicMetadataCache: {tokenId: string, symbol: string, decimals: number|undefined, icon: string|undefined}[],
  tokenIconCache: TokenIdCache,
  tokenSymbolCache: TokenIdCache,
  tokenDecimalsCache: TokenIdCache,
  tokenCategoryCache: TokenCategoryCache,
  tokenUrisCache: TokenUrisCache,
  minterInView?: CashToken,
  routeBack: string|boolean // The previous route, can be used by page to route back
  pageTitle?: string
  dialog?: DialogChainObject
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
    statusUrl: '',
    tokenBasicMetadataCache: [],
    tokenIconCache: {},
    tokenSymbolCache: {},
    tokenDecimalsCache: {},
    tokenCategoryCache: {},
    tokenUrisCache: {},
    routeBack: ''
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
      this.statusUrl = ''
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
        statusUrl?: string
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
      this.statusUrl = m.statusUrl || ''
    }
  }
});
