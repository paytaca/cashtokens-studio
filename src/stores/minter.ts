import { defineStore } from 'pinia'
import { AuthchainIdentity, CashToken } from 'src/app';


export const useMinter = defineStore('minter', {
  state: (): { value: CashToken | AuthchainIdentity | any} => ({
    value: null
  })
});


