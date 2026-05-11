import { Utxo } from "mainnet-js-v3"
import { createAuthguardContract } from "./create-authguard-contract"

export type UtxoWithAuthKey = Utxo & { authkey?: string }

export async function getLockedAuthheadUtxos(authkeyNftCategories: string[]): Promise<UtxoWithAuthKey[]> {
    const lockedUtxos: UtxoWithAuthKey[] = []
    for (const authKeyCategory of authkeyNftCategories) {
        const authguard = createAuthguardContract({
            authKeyTokenId: authKeyCategory,
            network: import.meta.env.VITE_BCH_NETWORK
        })
        const utxos: UtxoWithAuthKey[] = await authguard.getUtxos() as UtxoWithAuthKey[]
        utxos.forEach((u) => {
            u.authkey = authKeyCategory
        })
        lockedUtxos.push(...utxos)
    }
    return lockedUtxos
}