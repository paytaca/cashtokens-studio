import { Utxo } from "cashscript";
import { UtxoWithPath } from "../wallet/types";
import { AuthheadUtxo } from "../types";

export function maybeIsAuthkey(utxo: Utxo|UtxoWithPath|AuthheadUtxo) {
    return utxo.token?.nft?.commitment === '00' && utxo.token?.nft?.capability === 'none'
}

export function filterAuthKeys(utxos: Utxo[]|UtxoWithPath[]): Utxo[]|UtxoWithPath[]  {
    return utxos.filter(u => maybeIsAuthkey(u))
}

export function filterIdentityOutputs(utxos: Utxo[]|UtxoWithPath[]): Utxo[]|UtxoWithPath[]  {
    return utxos.filter(u => !maybeIsAuthkey(u) && u.vout === 0)
}