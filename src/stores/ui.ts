import { defineStore } from 'pinia'

type UIState = {
  statusMessage?: string
}

export const useUI = defineStore('ui', {
  state: (): UIState => ({})
});
