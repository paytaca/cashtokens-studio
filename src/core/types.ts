import type { Utxo } from "mainnet-js-v3";

export type UtxoWithPath = Utxo & { 
    pathName: 'receive' | 'change' | 'defi',
    addressIndex?: number 
};