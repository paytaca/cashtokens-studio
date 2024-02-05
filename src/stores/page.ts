import { defineStore } from 'pinia'

export const usePage = defineStore('page', {
  state: (): {path: string, state?: any} => ({
      path: '',
      state: {},
    }),
  }
);
