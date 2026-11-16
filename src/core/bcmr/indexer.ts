import { HttpError, withRetry, type RetryOptions } from '../utils'
import type { Registry } from './bcmr-v2.schema'
import { normalizePublishedUris } from './utils'

/** A token output of a category, as reported by the BCMR indexer. */
export interface CashtokenOutput {
    category: string
    commitment: string
    capability: 'none' | 'minting' | 'mutable'
    amount: number
    metadata: string
}

/** A page of a paginated BCMR indexer endpoint. */
export interface PaginatedResult<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

export async function getBasicTokenMetadata(category: string): Promise<any> {
    const response = await fetch(`${import.meta.env.VITE_BCMR_INDEXER_URL}/api/tokens/${category}`)
    if (response.ok) {
        const metadata = await response.json()
        return metadata
    }
    return null
}

/**
 * Fetch the token outputs minted on chain for a category (`/api/cashtokens/<category>/`).
 *
 * The endpoint is page-number paginated with a fixed page size of 10; callers drive pagination
 * through `?page=N` and the returned `count`.
 */
export async function getCategoryCashtokens(
    category: string,
    page = 1
): Promise<PaginatedResult<CashtokenOutput> | undefined> {
    const baseUrl = import.meta.env.VITE_BCMR_INDEXER_URL
    if (!baseUrl) return undefined

    const response = await fetch(`${baseUrl}/api/cashtokens/${category}/?page=${page}`)
    if (!response.ok) return undefined

    return (await response.json()) as PaginatedResult<CashtokenOutput>
}

/**
 * Fetch a published BCMR registry from the configured BCMR indexer
 * (`VITE_BCMR_INDEXER_URL`).
 *
 * Returns `undefined` when the indexer isn't configured or doesn't know the authbase,
 * so callers can fall back to resolving the authchain themselves.
 */
export async function getRegistryFromIndexer(
    authbase: string,
    includeIdentities = true
): Promise<Registry | undefined> {
    const baseUrl = import.meta.env.VITE_BCMR_INDEXER_URL
    if (!baseUrl) return undefined

    const response = await fetch(`${baseUrl}/api/registry/${authbase}/?include_identities=${includeIdentities}`)
    if (response.status != 200) return undefined

    return (await response.json()) as Registry
}

/** The last publication of an authchain, as reported by `/api/authchain/<authbase>/last-publication/`. */
type IndexerLastPublication = {
    txid?: string
    content_hash?: string
    uris?: string[]
}

/** Where an authchain's most recent registry was published, in the shape callers consume. */
export type LastRegistryPublication = {
    authbase: string
    /** Transaction id of the publication, empty when nothing was published yet. */
    txHash: string
    /** Content hash committed by the publication, empty when nothing was published yet. */
    contentHash: string
    uris: string[]
    urisOriginal: string[]
    httpsUrl: string
}

const emptyPublication = (authbase: string): LastRegistryPublication => ({
    authbase,
    txHash: '',
    contentHash: '',
    uris: [],
    urisOriginal: [],
    httpsUrl: '',
})

/**
 * Read the last registry publication of an authbase from the BCMR indexer
 * (`/api/authchain/<authbase>/last-publication/`), an alternative to querying the authchain
 * through ChainGraph.
 *
 * The indexer answers 404 for an authbase it has no publication for; that is reported as an empty
 * publication rather than an error so callers can fall back to another source. Other failures
 * throw an {@link HttpError}, and transient ones (5xx, 429) are retried.
 *
 * @param params.authbase The authbase (genesis transaction id) to look up
 */
export async function fetchLastRegistryPublication(
    { authbase }: { authbase: string },
    options?: RetryOptions
): Promise<LastRegistryPublication> {
    const baseUrl = import.meta.env.VITE_BCMR_INDEXER_URL
    if (!baseUrl) throw new Error('BCMR indexer url required')

    return withRetry(async (signal) => {
        const response = await fetch(
            `${baseUrl}/api/authchain/${encodeURIComponent(authbase)}/last-publication/`,
            { signal }
        )

        if (response.status === 404) return emptyPublication(authbase)
        if (!response.ok) {
            throw new HttpError(response.status, `HTTP Error ${response.status}: ${response.statusText}`)
        }

        const publication = (await response.json()) as IndexerLastPublication
        const { uris, urisOriginal, httpsUrl } = normalizePublishedUris(publication.uris ?? [])

        return {
            authbase,
            txHash: publication.txid ?? '',
            contentHash: publication.content_hash ?? '',
            uris,
            urisOriginal,
            httpsUrl,
        }
    }, options)
}
