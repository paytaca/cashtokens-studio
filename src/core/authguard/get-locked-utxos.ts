import { createAuthguardContract } from "./create-authguard-contract"
import type { UtxoWithPath, AuthheadUtxo, DecoratedUtxo} from "../types"

export async function getLockedAuthheadUtxos(authkeys: UtxoWithPath[]): Promise<DecoratedUtxo[]> {
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
    return lockedUtxos
}