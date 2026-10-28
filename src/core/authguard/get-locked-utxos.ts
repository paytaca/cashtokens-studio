import { createAuthguardContract } from "./create-authguard-contract"
import type { UtxoWithPath, AuthheadUtxo, DecoratedUtxo, UtxoTxid, UtxoVout} from "../types"

export type AuthheadId = `${UtxoTxid}:${UtxoVout}`

export async function getLockedAuthheadUtxos(authkeys: UtxoWithPath[], authheadId?: AuthheadId): Promise<DecoratedUtxo[]> {
    const lockedUtxos: DecoratedUtxo[] = []
    for (const authkey of authkeys) {
        const authguard = createAuthguardContract({
            authkeyTokenId: authkey.token!.category,
            network: import.meta.env.VITE_BCH_NETWORK
        })
        const utxos: DecoratedUtxo[] = await authguard.getUtxos() as DecoratedUtxo[]
        utxos.forEach((u) => {
            u.address = authguard.address
            u.authkey = authkey
            u.isAuthhead = true
        })
        lockedUtxos.push(...utxos)
    }
    if (authheadId) {
        return lockedUtxos?.filter((utxo) => `${utxo.txid}:${utxo.vout}` === authheadId)
    }   
    return lockedUtxos
}

