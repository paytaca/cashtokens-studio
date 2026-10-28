import type { TokenI, Utxo } from "mainnet-js";
import { IdentitySnapshot } from "./bcmr/bcmr-v2.schema";

export type UtxoTxid = string 
export type UtxoVout = number

export type UtxoWithPath = Utxo & { 
    pathName?: 'receive' | 'change' | 'defi',
    addressIndex?: number 
};

export type UtxoWithAuthKey = UtxoWithPath & { authkey?: UtxoWithPath }

/**
 * Identity of the snapshot an authhead carries, plus the registry that published it. The authguard
 * store assigns `registryIdentity` straight off the registry record — a string for an on-chain
 * registry, an object for an off-chain one — and the registry view/edit pages resolve their record
 * from IndexedDB by it, so it has to travel with the navigation.
 */
export type IdentitySnapshotIdentifier = {
    contentHash: string,
    identity: { authbase: string, timestamp: string },
    registryIdentity?: string | object,
}

export type AuthheadUtxo = UtxoWithAuthKey & { 
    identitySnapshot?: IdentitySnapshot, 
    identitySnapshotIdentifier?: IdentitySnapshotIdentifier 
}

export type DecoratedUtxo = UtxoWithAuthKey & { 
    authkey?: UtxoWithPath,
    identitySnapshot?: IdentitySnapshot, 
    identitySnapshotIdentifier?: IdentitySnapshotIdentifier,
    isAuthhead?: boolean
}

export type DecoratedTokenUtxo = Omit<DecoratedUtxo, 'token'> & { token: TokenI }

export type DecoratedUtxoFormSafe = Omit<DecoratedUtxo, 'token' & 'satoshis'> & {
    satoshis: string,
    token?: Omit<TokenI, 'amount'> & { amount: string }
}

export type TokenType = 'Fungible' | 'NonFungible' | 'Mixed'

