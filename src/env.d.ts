/* eslint-disable */

interface ImportMetaEnv {
  readonly VITE_CAULDRON_ENABLED?: string;
  readonly VITE_CAULDRON_RELEASE_TAG?: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}
