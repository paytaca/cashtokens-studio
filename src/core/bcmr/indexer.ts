import type { Registry } from './bcmr-v2.schema'

export async function getBasicTokenMetadata(category: string): Promise<any> {
    const response = await fetch(`${import.meta.env.VITE_BCMR_INDEXER_URL}/api/tokens/${category}`)
    if (response.ok) {
        const metadata = await response.json()
        return metadata
    }
    return null
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