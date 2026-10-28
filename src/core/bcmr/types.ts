import { Registry } from './bcmr-v2.schema';

export type CompactRegistry = Omit<Registry, 'identities'> & {
  identities?: {
    [authbase: string]: string[]; // array of timestamps
  };
};
