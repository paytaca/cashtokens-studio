import { fetchWithTimeout } from '../utils/fetch-with-timeout'
import { decodeBcmrOpReturn } from '../bcmr'
import { isCID } from '../ipfs'

export type GetAuthchainParams = { authbase: string, chainGraphUrl?: string }

export type AuthchainPublication = {
    /** Hex of the 32-byte BCMR content hash; empty for bare-CID (IPFS-only) publications. */
    contentHash: string,
    /** Publication URIs, with bare CIDs normalised to `ipfs://…`. */
    uris: string[],
}

export type AuthchainEntry = {
    /** Migration index: `0` is the genesis transaction, the highest index is the authhead. */
    index: number,
    txid: string,
    /** Block timestamp in unix seconds, when the entry is confirmed. */
    timestamp?: string,
    isAuthhead: boolean,
    /** Present only when the entry carries a `6a04'BCMR'` OP_RETURN publication. */
    publication?: AuthchainPublication,
}

type AuthchainMigration = {
    migration_index: number | string,
    transaction?: Array<{
        hash?: string,
        block_inclusions?: Array<{ block?: { timestamp?: string } }>,
        outputs?: Array<{ locking_bytecode?: string }>,
    }>,
}

const normalizeUri = (uri: string): string => (isCID(uri) ? `ipfs://${uri}` : uri)

/**
 * The full authchain of `authbase`: every re-lock of the identity output from genesis (index 0)
 * to the current authhead (highest index).
 *
 * ChainGraph exposes the whole chain as `authchains.migrations`, ordered by `migration_index`, so
 * this is a single query rather than a walk back through input 0. Each transaction's BCMR
 * OP_RETURN, when present, is decoded into its content hash and publication URIs.
 */
export async function getAuthchain(params: GetAuthchainParams): Promise<AuthchainEntry[]> {
    const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
    if (!url) {
        throw new Error('ChainGraph url required')
    }

    const query = `query GetAuthchain($authbase: bytea) {
        transaction(where: { hash: { _eq: $authbase } }) {
            authchains {
                authhead { hash }
                migrations(order_by: { migration_index: asc }) {
                    migration_index
                    transaction {
                        hash
                        block_inclusions { block { timestamp } }
                        outputs(where: { locking_bytecode_pattern: { _like: "6a04%" } }) {
                            locking_bytecode
                        }
                    }
                }
            }
        }
    }`

    const payload = {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
            operationName: 'GetAuthchain',
            variables: { authbase: `\\x${params.authbase}` },
            query
        }),
    }

    const response = await fetchWithTimeout(url, payload)

    if (response.status >= 400) {
        throw response.statusText
    }

    const responseText = await response.text()
    const { data } = JSON.parse(responseText || '')
    const authchain = data?.transaction?.[0]?.authchains?.[0]
    if (!authchain) return []

    const authheadTxid = String(authchain.authhead?.hash ?? '').replace('\\x', '')

    return ((authchain.migrations ?? []) as AuthchainMigration[])
        .flatMap((migration): AuthchainEntry[] => {
            const transaction = migration.transaction?.[0]
            if (!transaction?.hash) return []

            const txid = String(transaction.hash).replace('\\x', '')
            const bcmrOutput = transaction.outputs?.find((output) => !!output.locking_bytecode)
            const decoded = bcmrOutput?.locking_bytecode
                ? decodeBcmrOpReturn(bcmrOutput.locking_bytecode)
                : undefined

            return [{
                index: Number(migration.migration_index),
                txid,
                timestamp: transaction.block_inclusions?.[0]?.block?.timestamp,
                isAuthhead: txid === authheadTxid,
                publication: decoded
                    ? {
                        contentHash: decoded.bareCid ? '' : decoded.contentHash,
                        uris: decoded.uris.map(normalizeUri),
                    }
                    : undefined,
            }]
        })
        .sort((a, b) => a.index - b.index)
}
