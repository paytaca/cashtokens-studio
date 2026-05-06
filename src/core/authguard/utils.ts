import { Utxo } from "cashscript";

export function filterAuthKeys(utxos: Utxo[]) {
    return utxos.filter(u => u.token?.nft?.commitment === '00')
}