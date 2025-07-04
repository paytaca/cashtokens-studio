import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/apps';


export const useAuthhead = defineStore('authheadstore', {
  state: (): { value: CashToken | AuthchainIdentity | any} => ({
    value: null
  })
});


