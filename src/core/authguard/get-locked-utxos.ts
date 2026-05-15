import { createAuthguardContract } from "./create-authguard-contract"
import { UtxoWithPath } from "../types"

export type UtxoWithAuthKey = UtxoWithPath & { authkey?: UtxoWithPath }

export async function getLockedAuthheadUtxos(authkeys: UtxoWithPath[]): Promise<UtxoWithAuthKey[]> {
    const lockedUtxos: UtxoWithAuthKey[] = []
    for (const authkey of authkeys) {
        const authguard = createAuthguardContract({
            authkeyTokenId: authkey.token!.category,
            network: import.meta.env.VITE_BCH_NETWORK
        })
        const utxos: UtxoWithAuthKey[] = await authguard.getUtxos() as UtxoWithAuthKey[]
        utxos.forEach((u) => {
            u.address = authguard.address
            u.authkey = authkey
        })
        lockedUtxos.push(...utxos)
    }
    return lockedUtxos
}