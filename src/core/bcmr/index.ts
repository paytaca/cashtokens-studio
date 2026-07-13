import { binToHex, sha256,utf8ToBin } from '@bitauth/libauth'
import { IdentitySnapshot, Registry } from './bcmr-v2.schema'
export * from './enum'
export * from './indexer'
export * from './utils'

export type CreateBcmrOptions = {
    authbase: string,
    identitySnapshot: IdentitySnapshot,
    authKeyNftCategory: string
}

export function createTokenRegistry(options: CreateBcmrOptions) {

    const latestRevision = new Date().toISOString() 

    const registry: Registry = {
        $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
        version: {
            major: 0,
            minor: 1, 
            patch: 0
        },
        latestRevision,
        registryIdentity: options.authbase,
        identities: {
            [options.authbase]: {
                [latestRevision]: options.identitySnapshot
            }    
        },
        extensions: {
            tokenStandard: 'Authguard',
            authNft: options.authKeyNftCategory
        }
    }

    const content = JSON.stringify(registry)

    return {
        registry,
        contentHash: binToHex(sha256.hash(utf8ToBin(content)))
    }
}

export type UpdateTokenRegistryOptions = {
    authbase: string,
    registry: Registry,
    identitySnapshot: IdentitySnapshot,
    flattenHistory: boolean,
    authKeyNftCategory?: string
}

export function updateTokenRegistry(options: UpdateTokenRegistryOptions) {
    const registry = structuredClone(options.registry)
    const flattenHistory = options.flattenHistory ?? true
    registry.latestRevision = new Date().toISOString()
    if (!registry.identities) {
        registry.identities = {
            [options.authbase]: {}
        }
    }

    if (!Object.keys(registry.identities || []).find(k => k === options.authbase)) {
        throw new Error('Authbase not found on registry')
    }

    if (flattenHistory) {
        registry.identities[options.authbase] = {
            [registry.latestRevision]: options.identitySnapshot
        }
    } else {
        registry.identities[options.authbase]![registry.latestRevision] = options.identitySnapshot
    }

    if (options.authKeyNftCategory) {
        if (!registry.extensions) {
            registry.extensions = {}
        }
        registry.extensions.tokenStandard = 'Authguard'
        registry.extensions.authNft = options.authKeyNftCategory
    }
    
    const content = JSON.stringify(registry)

    return {
        registry,
        contentHash: binToHex(sha256.hash(utf8ToBin(content)))
    }
}

export function createIdentitySnapshotTemplate(category: string) {
    return {
        name: '',
        description: '',
        tags: [],
        token: {
            category: category,
            symbol: '',
            decimals: 0,
            nfts: {
                parse: {
                    bytecode: '',
                    types: {}
                }
            }
        },
        uris: { icon: '', web: '' }
    } as IdentitySnapshot
}


