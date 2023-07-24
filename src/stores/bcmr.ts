import { defineStore } from 'pinia';
import { Registry as Bcmr } from 'src/interfaces/bcmr-v2.schema'

type BcmrState = {
  value: Bcmr | null
}

/**
 * Will store the bcmr currently being worked on. Pages and components should
 * make sure to properly set or clear the value
 */
export const useBcmr = defineStore('bcmr', {
  state: ():BcmrState => ({
    value: null
  }),
});
