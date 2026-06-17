import type { TokenI, Utxo } from "mainnet-js-v3";
import { IdentitySnapshot } from "./bcmr/bcmr-v2.schema";

export type UtxoTxid = string 
export type UtxoVout = number

export type UtxoWithPath = Utxo & { 
    pathName?: 'receive' | 'change' | 'defi',
    addressIndex?: number 
};

export type UtxoWithAuthKey = UtxoWithPath & { authkey?: UtxoWithPath }

export type AuthheadUtxo = UtxoWithAuthKey & { 
    identitySnapshot?: IdentitySnapshot, 
    identitySnapshotIdentifier?: { contentHash: string, identity: { authbase: string, timestamp: string } } 
}

export type DecoratedUtxo = UtxoWithAuthKey & { 
    authkey?: UtxoWithPath,
    identitySnapshot?: IdentitySnapshot, 
    identitySnapshotIdentifier?: { contentHash: string, identity: { authbase: string, timestamp: string } },
    isAuthhead?: boolean
}

export type DecoratedUtxoFormSafe = Omit<DecoratedUtxo, 'token' & 'satoshis'> & {
    satoshis: string,
    token?: Omit<TokenI, 'amount'> & { amount: string }
}

export type TokenType = 'Fungible' | 'NonFungible' | 'Mixed'

