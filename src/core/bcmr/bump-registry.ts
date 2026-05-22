import { Registry } from "./bcmr-v2.schema";

export type BumpRegistryParams = {
    newVersion: { major: number, minor: number, patch: number },
    bumpType: 'patch'|'minor'|'major',
    unpublished: Registry, // From modified published registry
    unpublishedModifiedIdentityHistory?: {
        authbase: string,
        timestamp: string
    },
    published: Registry
}

export function bumpRegistry(args: BumpRegistryParams) {
    
    const registry = JSON.parse(JSON.stringify(args.unpublished))

    const newVersion = Object.values(args.newVersion).reduce((total, num) => total + num, 0)
    const oldVersion = Object.values(args.unpublished.version).reduce((total, num) => total + num, 0)

    if (newVersion <= oldVersion) {
        throw new Error('New version should be greater than the current version')
    }

    registry.version = args.newVersion
    registry.latestRevision = new Date().toISOString()

    if (args.bumpType === 'patch') {
        return registry
    }

    if (args.unpublishedModifiedIdentityHistory) {
        const unpublishedIdentitySnapshot = registry.identities[args.unpublishedModifiedIdentityHistory.authbase][args.unpublishedModifiedIdentityHistory.timestamp]

        // Use latestRevision timestamp for the unpublished identity snapshot
        registry.identities[args.unpublishedModifiedIdentityHistory.authbase][registry.latestRevision] = JSON.parse(JSON.stringify(unpublishedIdentitySnapshot))

        // Add the original identity snapshot that was modified to the identity history
        if (args.published.identities?.[args.unpublishedModifiedIdentityHistory.authbase]?.[args.unpublishedModifiedIdentityHistory.timestamp]) {
            registry.identities[args.unpublishedModifiedIdentityHistory.authbase][args.unpublishedModifiedIdentityHistory.timestamp] = 
                args.published.identities[args.unpublishedModifiedIdentityHistory.authbase]![args.unpublishedModifiedIdentityHistory.timestamp]
        }
    }

    return registry
    
}