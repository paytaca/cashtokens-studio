import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/app';


export const useAuthhead = defineStore('authheadstore', {
  state: (): { value: CashToken | AuthchainIdentity | any} => ({
    value: null
  })
});


