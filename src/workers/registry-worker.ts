import * as Comlink from 'comlink';
import { CompactRegistry, db, IdentitySnapshotRecord, ParsedRegistryRecord, RegistryRecord, BumpArtifact, RegistryRecordStatus } from '../core/client-db'
import { retrieveLastRegistryPublication } from '../core/chaingraph'
import { getErrorMessage } from '../core/utils';
import { IdentitySnapshot, NftType, Registry, RegistryTimestampKeyedValues } from 'src/core/bcmr/bcmr-v2.schema';
import { uploadFile } from 'src/core/ipfs';
import { binToHex, sha256, utf8ToBin } from 'bitauth-libauth-v3';

type ProgressErrorListener  = {
  onProgress?: (msg: string) => void,
  onError?: (msg: string) => void
}

export type DownloadRegistryParams = ProgressErrorListener & { authbase: string } 

export type GetIdentitiesParams = ProgressErrorListener & { contentHash: string } 

export type GetIdentityHistoryParams = GetIdentitiesParams & { authbase: string, timestamp: string }

export type GetIdentitySnapshotParams = ProgressErrorListener & { 

  contentHash?: string,
  identity?: {
    authbase: string,
    timestamp: string
  }
  category?: string 
}

export type PaginatedNftTypesResult = {
  items: { type: string, nft: NftType }[],
  total: number
}

export type Authbase = string

const registryWorker = {

  async parseRegistry(registry: Blob, compact: boolean = true): Promise<CompactRegistry|Registry> {
    const text = await registry.text()
    const parsedRegistry = JSON.parse(text)
    if (!parsedRegistry.identities) return parsedRegistry
    if (!compact) return parsedRegistry

    const identities = Object.keys(parsedRegistry.identities)
    const identitiesMap = identities.reduce((acc: { [authbase: string]: string[] }, authbase: string) => {
      acc[authbase] = Object.keys(parsedRegistry.identities[authbase] || {}).sort((a, b) => b.localeCompare(a))
      return acc
    }, {} as { [authbase: string]: string[] }) as { [authbase: string]: string[] }

    return {
      ...parsedRegistry,
      identities: identitiesMap
    } as CompactRegistry
  },

  async loadRegistry(params: DownloadRegistryParams): Promise<ParsedRegistryRecord|undefined> {
    try {
      
      const pub = await retrieveLastRegistryPublication({ authbase: params.authbase })
      const uris: string[] = pub[0]?.uris || []
      const contentHash: string = pub[0]?.contentHash
      if (!uris.length) return

      const existing = await db.registry.where('contentHash').equals(contentHash).first();
        if(existing) {
          const { rawRegistry, ...rest } = existing
          const parsedRegistry = await this.parseRegistry(rawRegistry, true)
          return { 
            ...rest, registry: parsedRegistry as CompactRegistry
          }
        }

        params.onProgress?.('Downloading registry...');

        const httpUris = uris.map((uri: string) => {
          if (uri.startsWith('ipfs://')) {
            return `/api/ipfs/${uri.replace('ipfs://', '')}`
          }
          return uri
        })
    
        const response = await Promise.race(
          httpUris.map((uri: string) => fetch(uri))
        )
        
        if (!response.ok) throw new Error('Error downloading registry')

        const registry: Blob = await response.blob();
        const parsedRegistry = await this.parseRegistry(registry, false) as Registry
        const compactParsedRegistry = await this.parseRegistry(registry, true) as CompactRegistry

        return await db.transaction('rw', [db.registry, db.registryIdentitySnapshot], async () => {
          
          if (parsedRegistry.identities) {
            const identities = Object.keys(parsedRegistry.identities || {})
            for (const authbase of identities) {
              const identityHistory = Object.keys(parsedRegistry.identities[authbase] || {})
              // identityHistory contains strings of new Date().toISOString() values
              identityHistory.sort((a, b) => b.localeCompare(a)); // latest first
              const latest = identityHistory[0] as string
              const identitySnapshot = parsedRegistry.identities![authbase]![latest] as IdentitySnapshot
              if (identitySnapshot.token?.nfts?.parse?.types) {
                // Remove nfts types from snapshot, it's too expensive, Parse nfts on demand
                identitySnapshot.token.nfts.parse.types = {} as { [key: string]: NftType }
              }

              const identitySnapshotRecord = {
                contentHash: contentHash,
                authbase: authbase,
                timestamp: latest,
                identitySnapshot: identitySnapshot
              } as IdentitySnapshotRecord
                
              if (identitySnapshot.token?.category) {
                identitySnapshotRecord.category = identitySnapshot.token.category
              }
              // Just loads the latest
              await db.registryIdentitySnapshot.put(identitySnapshotRecord)
            }
          }

          const registryRecord = {
            authbase: params.authbase,
            contentHash,
            publicationUris: uris,
            rawRegistry: registry,
            registry: compactParsedRegistry as CompactRegistry,
            status: 'published' as RegistryRecordStatus
          }

          const id = await db.registry.put(registryRecord)

          return { id, ...registryRecord }
        })
      

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      params.onError?.(message)
    } finally {
      params.onProgress?.('Finished')
    }
  },

  async getIdentitySnapshot(params: GetIdentitySnapshotParams): Promise<IdentitySnapshotRecord|undefined> {
    try {

      if (params.contentHash && params.identity) {
        const queryResult = await db.registryIdentitySnapshot
          .where('[contentHash+authbase+timestamp]')
          .equals([params.contentHash, params.identity.authbase, params.identity.timestamp])
          .first();

        if (queryResult) return queryResult

        // Snapshot not cached yet - parse from rawRegistry and store it
        const registryRecord = await db.registry.where('contentHash').equals(params.contentHash).first()
        if (registryRecord?.rawRegistry) {
          const parsedRegistry = await this.parseRegistry(registryRecord.rawRegistry, false) as Registry
          const identitySnapshot = parsedRegistry.identities?.[params.identity.authbase]?.[params.identity.timestamp]

          if (identitySnapshot) {
            // Strip nft types from snapshot (matching getRegistry behavior)
            const snapshot = JSON.parse(JSON.stringify(identitySnapshot)) as IdentitySnapshot
            if (snapshot.token?.nfts?.parse?.types) {
              snapshot.token.nfts.parse.types = {} as { [key: string]: NftType }
            }

            const identitySnapshotRecord = {
              contentHash: params.contentHash,
              authbase: params.identity.authbase,
              timestamp: params.identity.timestamp,
              identitySnapshot: snapshot
            } as IdentitySnapshotRecord

            if (snapshot.token?.category) {
              identitySnapshotRecord.category = snapshot.token.category
            }

            await db.registryIdentitySnapshot.put(identitySnapshotRecord)
            return identitySnapshotRecord
          }
        }
      }

      if (!params.category) throw new Error('Identity or category required')
      
      // Return the default latest identitySnapshot
      return await db.registryIdentitySnapshot
          .where('category')
          .equals(params.category)
          .first();
    } catch (e) {
      params.onError?.(getErrorMessage(e))
    } 
  },

  async resetRegistry(params: { contentHash: string }): Promise<ParsedRegistryRecord|undefined> {
    try {
      const existing = await db.registry.where('contentHash').equals(params.contentHash).first();
      if (!existing?.registry) return

      const parsedRegistry = await this.parseRegistry(existing.rawRegistry, false) as Registry

      if (parsedRegistry.identities) {
        const identities = Object.keys(parsedRegistry.identities || {})
        for (const authbase of identities) {
          const identityHistory = Object.keys(parsedRegistry.identities[authbase] || {})
          identityHistory.sort((a, b) => b.localeCompare(a))
          const latest = identityHistory[0] as string
          const identitySnapshot = parsedRegistry.identities![authbase]![latest] as IdentitySnapshot
          if (identitySnapshot.token?.nfts?.parse?.types) {
            identitySnapshot.token.nfts.parse.types = {} as { [key: string]: NftType }
          }

          const identitySnapshotRecord = {
            contentHash: params.contentHash,
            authbase: authbase,
            timestamp: latest,
            identitySnapshot: identitySnapshot,
            status: 'published'
          } as IdentitySnapshotRecord

          if (identitySnapshot.token?.category) {
            identitySnapshotRecord.category = identitySnapshot.token.category
          }

          await db.registryIdentitySnapshot.put(identitySnapshotRecord)
        }
      }

      const compactParsedRegistry = await this.parseRegistry(existing.rawRegistry, true)

      await db.registry.update(existing.id!, {
        registry: compactParsedRegistry as CompactRegistry,
        status: 'published'
      })

      const { registry: _, ...rest } = existing
      return {
        ...rest,
        registry: compactParsedRegistry as CompactRegistry
      }
    } catch (error) {
      throw error
    }
  },

  async bumpRegistry(params: ProgressErrorListener & { 
    originalContentHash: string, 
    bumpType: 'major'|'minor'|'patch',
    newVersion: { major: number, minor: number, patch: number },
  }): Promise<{uris: string[], contentHash: string}|undefined> {

    const registryRecord = await db.registry.where('contentHash').equals(params.originalContentHash).first()
    if (!registryRecord?.rawRegistry) {
        return
    }

    const { identities, ...r } = registryRecord.registry
    const { identities: originalIdentities } = await this.parseRegistry(registryRecord.rawRegistry, false) as Registry
    const registryCandidate: Registry = r
    registryCandidate.version = params.newVersion
    registryCandidate.latestRevision = new Date().toISOString()
    if (originalIdentities) { // Attach original identities 
      registryCandidate.identities = originalIdentities
    }

    const unpublishedIdentities: {[authbase: string]: RegistryTimestampKeyedValues<IdentitySnapshot> } = {}
    if (registryRecord.registry.identities) {
      for (const authbase of Object.keys(registryRecord.registry.identities || {})) {
        const latestTimestamp = registryRecord.registry.identities[authbase]?.sort((a, b) => b.localeCompare(a))![0] as string
        const identitySnapshotRecord = 
          await db.registryIdentitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([registryRecord.contentHash, authbase, latestTimestamp] as [string, string, string]).first();
        if (identitySnapshotRecord?.status === 'modified') {
          unpublishedIdentities[authbase] = {
            [latestTimestamp]: identitySnapshotRecord.identitySnapshot
          }
        }
      }
    }
    
    for (const authbase of Object.keys(unpublishedIdentities)) {
      const timestamp = Object.keys(unpublishedIdentities[authbase]!)[0] as string
      let timestampCandidate = timestamp 
      if (params.bumpType === 'major' || params.bumpType === 'minor') {
        // add use the newly created latestRevision timestamp
        timestampCandidate = registryCandidate.latestRevision
      }

      // Copy nfts
      const nftTypes = registryCandidate.identities![authbase]![timestamp]?.token?.nfts?.parse?.types
      if (nftTypes) {
        unpublishedIdentities[authbase]![timestamp]!.token!.nfts!.parse.types = nftTypes
      }
      registryCandidate.identities![authbase]![timestampCandidate] = unpublishedIdentities[authbase]![timestamp] as IdentitySnapshot
      // Query NftRecord for this contentHash, authbase, and timestamp
      // Only include those with created or modified attributes
      const nftCollectionRecords = (await db.nfts
        .where('[contentHash+authbase+timestamp]')
        .equals([registryRecord.contentHash, authbase, timestamp])
        .toArray())
        .filter(nft => nft.status === 'new' || nft.status === 'modified');
      
      // Populate the snapshot, replace modified, add created
      nftCollectionRecords.forEach((nftRecord) => {
        registryCandidate.identities![authbase]![timestampCandidate]!.token!.nfts!.parse.types[nftRecord.type] = nftRecord.nft
      })
    }

    let contentHash: string
    let uris: string[]
    let jsonBlob: Blob

    if (registryRecord.bumpArtifact) {
      contentHash = registryRecord.bumpArtifact.contentHash
      uris = registryRecord.bumpArtifact.uris
      const rebuiltJson = JSON.stringify(registryCandidate)
      const savedContentHash = binToHex(sha256.hash(utf8ToBin(rebuiltJson)))
      if (savedContentHash !== contentHash) {
        // registry changed since last bump, re-upload
        jsonBlob = new Blob([rebuiltJson], { type: 'application/json' })
        const artifact = await uploadFile(jsonBlob, 'bitcoin-cash-metadata-registry.json')
        contentHash = binToHex(sha256.hash(utf8ToBin(rebuiltJson)))
        uris = [`ipfs://${artifact.cid}`]
        await db.registry.update(registryRecord.id!, {
          bumpArtifact: { contentHash, uris, cid: artifact.cid, registry: jsonBlob}
        })
      } else {
        jsonBlob = new Blob([rebuiltJson], { type: 'application/json' })
      }
    } else {
      const jsonString = JSON.stringify(registryCandidate)
      jsonBlob = new Blob([jsonString], { type: 'application/json' })
      const artifact = await uploadFile(jsonBlob, 'bitcoin-cash-metadata-registry.json')
      contentHash = binToHex(sha256.hash(utf8ToBin(jsonString)))
      uris = [`ipfs://${artifact.cid}`]
      await db.registry.update(registryRecord.id!, {
        bumpArtifact: { contentHash, uris, cid: artifact.cid, registry: jsonBlob }
      })
    }

    return {
      contentHash,
      uris
    }
  },

  async commitBumpRegistry(oldContentHash: string, newAuthhead: string): Promise<ParsedRegistryRecord | undefined> {
    const registryRecord = await db.registry.where('contentHash').equals(oldContentHash).first();

    if (!registryRecord || !registryRecord.bumpArtifact?.registry) return
    if (!registryRecord.bumpArtifact.contentHash || !registryRecord.bumpArtifact.uris) return

    const newContentHash = registryRecord.bumpArtifact.contentHash
    const newUris = registryRecord.bumpArtifact.uris
    const newRawRegistry = registryRecord.bumpArtifact.registry

    const parsedRegistry = await this.parseRegistry(newRawRegistry, false) as Registry
    const compactParsedRegistry = await this.parseRegistry(newRawRegistry, true) as CompactRegistry

    return await db.transaction('rw', [db.registry, db.registryIdentitySnapshot, db.nfts], async () => {
      // Delete old records with oldContentHash
      await db.registryIdentitySnapshot.where('contentHash').equals(oldContentHash).delete()
      await db.nfts.where('contentHash').equals(oldContentHash).delete()

      if (parsedRegistry.identities) {
        const identities = Object.keys(parsedRegistry.identities || {})
        for (const authbase of identities) {
          const identityHistory = Object.keys(parsedRegistry.identities[authbase] || {})
          identityHistory.sort((a, b) => b.localeCompare(a))
          const latest = identityHistory[0] as string
          const identitySnapshot = parsedRegistry.identities![authbase]![latest] as IdentitySnapshot
          if (identitySnapshot.token?.nfts?.parse?.types) {
            identitySnapshot.token.nfts.parse.types = {} as { [key: string]: NftType }
          }

          const identitySnapshotRecord = {
            contentHash: newContentHash,
            authbase: authbase,
            timestamp: latest,
            identitySnapshot: identitySnapshot,
            status: 'published'
          } as IdentitySnapshotRecord

          if (identitySnapshot.token?.category) {
            identitySnapshotRecord.category = identitySnapshot.token.category
          }

          await db.registryIdentitySnapshot.put(identitySnapshotRecord)
        }
      }

      // Update existing registry record with new data from bumpArtifact
      await db.registry.update(registryRecord.id!, {
        contentHash: newContentHash,
        publicationUris: newUris,
        rawRegistry: newRawRegistry,
        registry: compactParsedRegistry,
        authhead: newAuthhead,
        bumpArtifact: undefined,
        status: 'published'
      })

      return {
        id: registryRecord.id,
        authbase: registryRecord.authbase,
        contentHash: newContentHash,
        publicationUris: newUris,
        registry: compactParsedRegistry
      } as ParsedRegistryRecord
    })
  },

  async getNftTypes(params: ProgressErrorListener & {
    contentHash: string,
    authbase: string,
    timestamp: string,
    offset?: number,
    limit?: number
  }): Promise<PaginatedNftTypesResult|undefined> {
    try {
      const registryRecord = await db.registry.where('contentHash').equals(params.contentHash).first()
      if (!registryRecord?.rawRegistry) {
        return { items: [], total: 0 }
      }

      const parsedRegistry = await this.parseRegistry(registryRecord.rawRegistry, false) as Registry
      const identitySnapshot = parsedRegistry.identities?.[params.authbase]?.[params.timestamp]
      if (!identitySnapshot?.token?.nfts?.parse?.types) {
        return { items: [], total: 0 }
      }

      const types = identitySnapshot.token.nfts.parse.types
      const isSequential = !(identitySnapshot.token.nfts.parse as any).bytecode
      const entries = Object.entries(types)

      entries.sort(([a], [b]) => {
        if (isSequential) {
          const aBytes = a.match(/.{1,2}/g) || []
          const bBytes = b.match(/.{1,2}/g) || []
          const aRev = aBytes.reverse().join('')
          const bRev = bBytes.reverse().join('')
          const aInt = BigInt('0x' + aRev)
          const bInt = BigInt('0x' + bRev)
          if (aInt < bInt) return -1
          if (aInt > bInt) return 1
          return 0
        }
        return a.localeCompare(b)
      })

      const total = entries.length

      const offset = params.offset ?? 0
      const limit = params.limit ?? entries.length
      const page = entries.slice(offset, offset + limit)

      return {
        items: page.map(([type, nft]) => ({ type, nft })),
        total
      }
    } catch (e) {
      params.onError?.(getErrorMessage(e))
    }
  },



};

export type RegistryWorkerAPI = typeof registryWorker;

Comlink.expose(registryWorker);
