import { defineStore } from 'pinia'

type UIState = {
  statusMessage?: string,
  transactionLogs?: any[]
}

export const useUI = defineStore('ui', {
  state: (): UIState => ({})
});
