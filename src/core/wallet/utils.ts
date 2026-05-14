import { Utxo } from "mainnet-js-v3";
import { UtxoWithPath } from "../types";

export function filterGenesisInputs(utxos: UtxoWithPath[]|Utxo[]) {
    return utxos.filter(u => !u.token && Number(u.vout) === 0) || []
}