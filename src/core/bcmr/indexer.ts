import type { Registry } from './bcmr-v2.schema'

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