import { binToHex, sha256,utf8ToBin } from '@bitauth/libauth'
import { IdentitySnapshot, Registry } from './bcmr-v2.schema'

export type CreateBcmrOptions = {
    authbase: string,
    identitySnapshot: IdentitySnapshot
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
    flattenHistory: boolean
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
    
    const content = JSON.stringify(registry)

    return {
        registry,
        contentHash: binToHex(sha256.hash(utf8ToBin(content)))
    }
}