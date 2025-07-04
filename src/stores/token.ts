import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/apps';


export const useTokenStore = defineStore('tokenStore', {
  state: (): { token: CashToken | AuthchainIdentity | any} => ({
    token: null
  })
});


