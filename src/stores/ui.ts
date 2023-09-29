import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/app';

type UIState = {
  statusMessage?: string,
  transactionLogs?: any[],
  /**
   * The token that will loaded in Token Page
   */
  tokenInView?: CashToken | AuthchainIdentity
}

export const useUI = defineStore('ui', {
  state: (): UIState => ({})
});
