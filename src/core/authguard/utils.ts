import { Utxo } from "cashscript";
import { UtxoWithPath } from "../wallet/types";

export function filterAuthKeys(utxos: Utxo[]|UtxoWithPath[]): Utxo[]|UtxoWithPath[]  {
    return utxos.filter(u => u.token?.nft?.commitment === '00')
}