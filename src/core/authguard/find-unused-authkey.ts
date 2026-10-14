import type { Network } from 'cashscript'
import type { UtxoWithPath } from '../types'
import { createAuthguardContract } from './create-authguard-contract'

/**
 * Returns the first AuthKey NFT whose AuthGuard contract is still empty.
 *
 * An AuthGuard contract that already holds a UTXO has been used as a vault before, so a fresh
 * auth UTXO should not be imported into it. Electrum is the source of truth here rather than the
 * indexer's counters, so this asks the contract directly.
 */
export async function findUnusedAuthkey(
    authkeys: UtxoWithPath[],
    network?: Network
): Promise<UtxoWithPath | undefined> {
    for (const authkey of authkeys) {
        const authkeyTokenId = authkey.token?.category
        if (!authkeyTokenId) continue

        const contract = createAuthguardContract({ authkeyTokenId, network })
        const utxos = await contract.getUtxos()

        if (utxos.length === 0) return authkey
    }

    return undefined
}
