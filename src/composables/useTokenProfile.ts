import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { binToHex, cashAddressToLockingBytecode } from 'bitauth-libauth-v3'
import { getBasicTokenMetadata } from 'src/core/bcmr'
import {
    getAuthchain,
    getAuthheadReserve,
    getTokenGenesis,
    getTokenSupply,
    TOKEN_BURNER_LOCKING_BYTECODE_HEX,
    type AuthchainEntry,
    type AuthheadReserve,
} from 'src/core/chaingraph'
import { ipfsToGatewayUrl } from 'src/core/ipfs'

/** A metadata URI from the token's BCMR identity snapshot (e.g. `web`, `twitter`, `github`). */
export type TokenProfileLink = { id: string, uri: string }

export type TokenProfile = {
    category: string,
    name?: string,
    symbol?: string,
    description?: string,
    /** Gateway URL of `uris.icon`, if the registry declares one. */
    iconUrl?: string,
    links: TokenProfileLink[],
    /** Fungible token decimals used to display the supply figures. */
    decimals: number,
    genesisSupply?: bigint,
    circulatingSupply?: bigint,
    reservedSupply?: bigint,
    burnedSupply?: bigint,
    holders?: number,
    /** Every identity re-lock from genesis (index 0) to the current authhead. */
    authchain?: AuthchainEntry[],
}

type TokenIdentitySnapshot = {
    name?: string,
    description?: string,
    uris?: Record<string, string>,
    token?: { symbol?: string, decimals?: number },
}

/**
 * Burn destinations whose balances are destroyed: the tokenburner.cash covenant (which burns by
 * omitting tokens from its spend's outputs) and the app's configured burn address, if it decodes.
 */
const BURN_LOCKING_BYTECODES_HEX = (() => {
    const destinations = [TOKEN_BURNER_LOCKING_BYTECODE_HEX]
    const address = import.meta.env.VITE_BURN_ADDRESS
    if (!address) return destinations

    try {
        const decoded = cashAddressToLockingBytecode(address)
        if (typeof decoded !== 'string') destinations.push(binToHex(decoded.bytecode))
    } catch {
        // An undecodable address only drops that destination; the burner still counts.
    }

    return [...new Set(destinations)]
})()

type TokenProfileSources = {
    category: string,
    metadata?: TokenIdentitySnapshot,
    genesisFtSupply?: string,
    supply?: Awaited<ReturnType<typeof getTokenSupply>>,
    /** The authhead of the category's authbase, whose identity output holds the reserved supply. */
    authheadReserve?: AuthheadReserve,
    authchain?: AuthchainEntry[],
}

/**
 * The BCMR indexer returns the identity snapshot directly; older/proxied responses may nest it.
 * Normalising here keeps the rest of the pipeline on one shape.
 */
function identitySnapshotOf(metadata: unknown): TokenIdentitySnapshot | undefined {
    if (!metadata || typeof metadata !== 'object') return undefined
    const candidate = metadata as Record<string, unknown>
    const snapshot = (candidate.identitySnapshot ?? candidate) as TokenIdentitySnapshot | null
    return snapshot && typeof snapshot === 'object' ? snapshot : undefined
}

function toBigInt(value: string | undefined): bigint | undefined {
    if (value === undefined || value === '') return undefined
    try {
        return BigInt(value)
    } catch {
        return undefined
    }
}

/** Pure assembly of the values a `TokenProfile` view needs, from its independent data sources. */
export function buildTokenProfile(sources: TokenProfileSources): TokenProfile {
    const metadata = sources.metadata
    const uris = metadata?.uris ?? {}

    return {
        category: sources.category,
        name: metadata?.name,
        symbol: metadata?.token?.symbol,
        description: metadata?.description,
        iconUrl: uris.icon ? ipfsToGatewayUrl(uris.icon) : undefined,
        links: Object.entries(uris)
            .filter(([id, uri]) => id !== 'icon' && !!uri)
            .map(([id, uri]) => ({ id, uri })),
        decimals: Number(metadata?.token?.decimals ?? 0),
        genesisSupply: toBigInt(sources.genesisFtSupply),
        circulatingSupply: sources.supply?.circulatingSupply,
        reservedSupply: sources.authheadReserve?.fungibleTokenAmount,
        burnedSupply: sources.supply?.burnedSupply,
        holders: sources.supply?.holders,
        authchain: sources.authchain,
    }
}

/**
 * Loads everything a `TokenProfile` component renders for a token category: BCMR metadata and
 * on-chain supply economics. The component stays dumb; this composable owns fetching and state.
 *
 * Reserved supply is read from the authhead that ChainGraph tracks for `authbase` (defaulting to
 * the category), since an Authguard authhead is where the mintable reserves live.
 *
 * Each source is settled independently — a missing registry or an unavailable ChainGraph leaves
 * the affected fields undefined rather than discarding the whole profile.
 */
export function useTokenProfile(
    categorySource: MaybeRefOrGetter<string>,
    authbaseSource?: MaybeRefOrGetter<string | undefined>
) {
    const profile = ref<TokenProfile>()
    const loading = ref(false)
    const error = ref<string>()

    let latestRequest = 0

    const load = async () => {
        const category = toValue(categorySource)
        if (!category) {
            profile.value = undefined
            loading.value = false
            error.value = undefined
            return
        }

        const request = ++latestRequest
        loading.value = true
        error.value = undefined

        // A migrated identity may have an authbase that differs from its current token category.
        const authbase = toValue(authbaseSource) || category

        const [metadataResult, genesisResult, supplyResult, authheadResult, authchainResult] =
            await Promise.allSettled([
                getBasicTokenMetadata(category),
                getTokenGenesis({ category }),
                getTokenSupply({
                    category,
                    burnLockingBytecodesHex: BURN_LOCKING_BYTECODES_HEX,
                }),
                getAuthheadReserve({ authbase }),
                getAuthchain({ authbase }),
            ])

        // A newer category was requested while this one was in flight; drop the stale result.
        if (request !== latestRequest) return

        const metadata = metadataResult.status === 'fulfilled'
            ? identitySnapshotOf(metadataResult.value)
            : undefined
        const genesisFtSupply = genesisResult.status === 'fulfilled'
            ? genesisResult.value.genesisFtSupply
            : undefined
        const supply = supplyResult.status === 'fulfilled' ? supplyResult.value : undefined
        const authheadReserve = authheadResult.status === 'fulfilled'
            ? authheadResult.value
            : undefined
        const authchain = authchainResult.status === 'fulfilled' ? authchainResult.value : undefined

        if (!metadata && !supply) {
            error.value = 'unavailable'
        }

        profile.value = buildTokenProfile({
            category,
            metadata,
            genesisFtSupply,
            supply,
            authheadReserve,
            authchain,
        })
        loading.value = false
    }

    watch(
        [() => toValue(categorySource), () => toValue(authbaseSource)],
        load,
        { immediate: true }
    )

    return { profile, loading, error, refresh: load }
}
