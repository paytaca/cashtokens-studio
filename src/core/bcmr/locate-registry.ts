import { importMetadataRegistry, type MetadataRegistry } from 'bitauth-libauth-v3'
import type { OffChainRegistryIdentity, Registry } from './bcmr-v2.schema'
import { getRegistryFromIndexer } from './indexer'
import { fetchLastRegistryPublication } from '../chaingraph'
import { fetchIpfsFile } from '../ipfs/fetch-file'
import { isCID, tryParseIpfsUrl } from '../ipfs/utils'

/** Assume `https://` when a published URI has no scheme, as BCMR consumers do. */
const withScheme = (uri: string): string =>
    /^(ipfs:\/\/)/.test(uri) || /^(https?:)?\/\//i.test(uri) ? uri : `https://${uri}`

/**
 * Extract a CID and path from a gateway URL.
 *
 * `parseIpfsUrl` throws on URLs that aren't IPFS and registries can also be published on
 * ordinary domains, so this returns empty components instead — the caller then falls back
 * to a plain `fetch`.
 */
const extractCidAndPath = (url: string): { cid: string; path: string } => {
    const parsed = url ? tryParseIpfsUrl(url) : undefined
    if (!parsed || !isCID(parsed.id)) return { cid: '', path: '' }

    return { cid: parsed.id, path: parsed.path }
}

/**
 * Look for the last published registry of the provided authbase.
 *
 * Asks the BCMR indexer first, then reads the authchain's last publication and tries each
 * published URI — IPFS through the app's own proxy, everything else directly — until one
 * of them parses as a BCMR registry.
 *
 * @param registryIdentity The OffChainRegistryIdentity or authbase
 */
export const locateRegistry = async (
    registryIdentity: OffChainRegistryIdentity | string
): Promise<Registry | undefined> => {
    if (typeof registryIdentity == 'object') return // Not Yet Supported, use the dns resolution

    const indexedRegistry = await getRegistryFromIndexer(registryIdentity)
    if (indexedRegistry) return indexedRegistry

    const publication = await fetchLastRegistryPublication({ authbase: registryIdentity })

    if (!publication?.httpsUrl && !publication?.uris?.length) {
        throw new Error(`Unable to locate registry for ${registryIdentity}`)
    }

    const finalUrl = publication.httpsUrl ? withScheme(publication.httpsUrl) : ''
    const { cid } = extractCidAndPath(finalUrl)

    const uris = [...(publication.uris || [])]

    if (finalUrl) {
        if (cid) {
            uris.unshift(finalUrl) // Prioritize if httpsUrl is an ipfs url or gateway
        } else {
            uris.push(finalUrl)
        }
    }

    let validatedRegistry: MetadataRegistry | string = ''

    for (const uri of uris) {
        const candidate = withScheme(uri)
        const { cid: uriCid, path: uriPath } = extractCidAndPath(candidate)

        if (uriCid) {
            const response = await fetchIpfsFile(uriCid, uriPath)
            if (response.status == 200) {
                const json = await response.json()
                if (json) {
                    validatedRegistry = importMetadataRegistry(json)
                    if (typeof validatedRegistry === 'string') {
                        continue
                    }
                    break
                }
            }
        }

        if (!validatedRegistry || typeof validatedRegistry === 'string') {
            const response = await fetch(candidate)
            if (response.status == 200) {
                const json = await response.json()
                if (json) {
                    validatedRegistry = importMetadataRegistry(json)
                    if (typeof validatedRegistry === 'string') {
                        continue
                    }
                    break
                }
            }
        }
    }

    if (typeof validatedRegistry !== 'string') {
        return validatedRegistry as Registry
    }

    throw new Error(
        `Found registry publication but unable to load from the published URL (${publication.httpsUrl}). Verify that the URL exist or try again later`
    )
}
