import * as Comlink from 'comlink';
import { binToHex, sha256, utf8ToBin } from 'bitauth-libauth-v3';
import { 
  db, 
  IdentitySnapshotRecord, 
  NftRecord, 
  ParsedRegistryRecord, 
  RegistryRecordStatus 
} from '../core/client-db'
import { retrieveLastRegistryPublication } from '../core/chaingraph'
import { getErrorMessage } from '../core/utils';
import type { 
  IdentitySnapshot, NftType, OffChainRegistryIdentity, Registry, RegistryTimestampKeyedValues 
} from '../core/bcmr/bcmr-v2.schema';
import { uploadFile } from '../core/ipfs';
import { hexToBin } from 'mainnet-js';
import { compactRegistry, extractNftTypeKeys, extractTokenCategories, parseRegistryBlob, sortNftTypeKeys } from 'src/core/bcmr/utils';
import { type CompactRegistry } from 'src/core/bcmr/types';
import { NftCollectionType } from 'src/core/bcmr';

type ProgressErrorListener  = {
  onProgress?: (msg: string) => void,
  onError?: (msg: string) => void
}

export type DownloadRegistryParams = ProgressErrorListener & { authbase: string, sync?: boolean, contentHash?: string } 

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
  items: NftRecord[],
  total: number,
  offset: number,
  limit: number,
  lastNftTypeKey: string
}

export type Authbase = string

const registryWorker = {

  async loadRegistry(params: DownloadRegistryParams): Promise<ParsedRegistryRecord|undefined> {
    try {
      if (params.contentHash) {
        const cached = await db.registry.where('contentHash').equals(params.contentHash).first()
        if (cached?.rawRegistry) {
          const { rawRegistry , ...rest } = cached
          const parsedRegistry = compactRegistry(await parseRegistryBlob(cached.rawRegistry))
          return { ...rest, registry: parsedRegistry as CompactRegistry }
        }
      }

      if (!params.sync) {
        const existing = await db.registry.where('authbase').equals(params.authbase).first()
        if (existing?.rawRegistry) {
          const { rawRegistry, ...rest } = existing
          const parsedRegistry = compactRegistry(await parseRegistryBlob(rawRegistry))
          return { ...rest, registry: parsedRegistry as CompactRegistry }
        }
      }

      const pub = await retrieveLastRegistryPublication({ authbase: params.authbase })
      const uris: string[] = pub[0]?.uris || []
      const contentHash: string = pub[0]?.contentHash
      if (!uris.length) return

      const existing = await db.registry.where('contentHash').equals(contentHash).first();
        if(existing) {
          const { rawRegistry, ...rest } = existing
          const parsedRegistry = compactRegistry(await parseRegistryBlob(rawRegistry))
          return { 
            ...rest, registry: parsedRegistry as CompactRegistry
          }
        }

        params.onProgress?.('Downloading registry...');

        const httpUris = Array.from(new Set(
          uris.map((uri: string) => {

            let cid = ''
  
            if (uri.startsWith('ipfs://') ) {
              cid = uri.replace('ipfs://', '')
            }
  
            if (uri.startsWith('ipfs.paytaca.com/ipfs/')) {
              cid = uri.replace('ipfs.paytaca.com/ipfs/', '')
            }
  
            if (cid) {
              return [
                `/api/ipfs/${cid}`,
                `https://gateway.pinata.cloud/ipfs/${cid}`
              ]
            }
  
            return [uri]
          })?.flat()
        ))
        
        const fetchPromises = httpUris.map(async (uri: string) => {
          const controller = new AbortController()
          const id = setTimeout(() => controller.abort(), 30_000)
          try {
            const res = await fetch(uri, { signal: controller.signal })
            if (!res.ok) {
              throw new Error(`Gateway ${uri} returned status ${res.status}`)
            }
            return res
          } finally {
            clearTimeout(id)
          }
        })
        
        const response = await Promise.any(fetchPromises)
        const registry: Blob = await response.blob();
        const parsedRegistry = await parseRegistryBlob(registry) as Registry
        const tokenCategories = extractTokenCategories(parsedRegistry)
        const compactParsedRegistry = compactRegistry(parsedRegistry)
        return await db.transaction('rw', [db.registry, db.registryIdentitySnapshot], async () => {
          if (parsedRegistry.identities) {
            const identities = Object.keys(parsedRegistry.identities || {})
            for (const authbase of identities) {
              const identityHistory = Object.keys(parsedRegistry.identities[authbase] || {})
              // identityHistory contains strings of new Date().toISOString() values
              identityHistory.sort((a, b) => b.localeCompare(a)); // latest first
              const latest = identityHistory[0] as string
              const identitySnapshot = parsedRegistry.identities![authbase]![latest] as IdentitySnapshot
              const nftTypeKeys = extractNftTypeKeys(identitySnapshot)
              if (identitySnapshot.token?.nfts?.parse?.types) {
                // Remove nfts types from snapshot, it's too expensive, Parse nfts on demand
                identitySnapshot.token.nfts.parse.types = {} as { [key: string]: NftType }
              }

              // Avoid race condition
              const existingSnapshot = await db.registryIdentitySnapshot
                .where('[contentHash+authbase+timestamp]')
                .equals([contentHash, authbase, latest] as [string, string, string])
                .first()

              const identitySnapshotRecord = {
                id: existingSnapshot?.id,
                contentHash: contentHash,
                authbase: authbase,
                timestamp: latest,
                identitySnapshot: identitySnapshot,
                nftTypeKeys: nftTypeKeys
              } as IdentitySnapshotRecord
                
              if (identitySnapshot.token?.category) {
                identitySnapshotRecord.category = identitySnapshot.token.category
              }
              

              await db.registryIdentitySnapshot.put(identitySnapshotRecord)
            }
          }

          let registryIdentity = compactParsedRegistry.registryIdentity

          if (typeof(compactParsedRegistry.registryIdentity) !== 'string') {
            registryIdentity = `offchain:${binToHex(sha256.hash(utf8ToBin(JSON.stringify(compactParsedRegistry.registryIdentity))))}`
          }

          // Avoid race condition
          const existingRegistry = await db.registryIdentitySnapshot
          .where('contentHash')
          .equals(contentHash)
          .first()

          const registryRecord = {
            authbase: params.authbase,
            contentHash,
            publicationUris: uris,
            rawRegistry: registry,
            registry: compactParsedRegistry as CompactRegistry,
            status: 'published' as RegistryRecordStatus,
            registryIdentity: registryIdentity as string,
            categories: tokenCategories
          }

          const id = await db.registry.put({ id: existingRegistry?.id, ...registryRecord })
          const { rawRegistry, ...restOfRegistryRecord } = registryRecord
          return { id, ...restOfRegistryRecord }
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
          const parsedRegistry = await parseRegistryBlob(registryRecord.rawRegistry) as Registry
          const identitySnapshot = parsedRegistry.identities?.[params.identity.authbase]?.[params.identity.timestamp]
          if (identitySnapshot) {
            const nftTypeKeys = extractNftTypeKeys(identitySnapshot)
            // Strip nft types from snapshot (matching getRegistry behavior)
            const snapshot = JSON.parse(JSON.stringify(identitySnapshot)) as IdentitySnapshot
            if (snapshot.token?.nfts?.parse?.types) {
              snapshot.token.nfts.parse.types = {} as { [key: string]: NftType }
            }

            const identitySnapshotRecord = {
              contentHash: params.contentHash,
              authbase: params.identity.authbase,
              timestamp: params.identity.timestamp,
              identitySnapshot: snapshot,
              nftTypeKeys,
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
      
      // Return identitySnapshot of category with latest timestamp
      const records = await db.registryIdentitySnapshot
          .where('category')
          .equals(params.category)
          .toArray()
      records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      return records[0]
    } catch (e) {
      params.onError?.(getErrorMessage(e))
    } 
  },

  async resetRegistry(params: { contentHash: string }): Promise<ParsedRegistryRecord|undefined> {
    try {
      const existing = await db.registry.where('contentHash').equals(params.contentHash).first();
      if (!existing?.registry) return

      const parsedRegistry = await parseRegistryBlob(existing.rawRegistry) as Registry

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

      const compactParsedRegistry = compactRegistry(await parseRegistryBlob(existing.rawRegistry))

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
    newVersion?: { major: number, minor: number, patch: number },
    targetIdentity?: {
      authbase: string,
      timestamp: string
    }
  }): Promise<{uris: string[], contentHash: string}|undefined> {

    const registryRecord = await db.registry.where('contentHash').equals(params.originalContentHash).first()
    if (!registryRecord?.rawRegistry) {
        return
    }

    const { identities, ...r } = registryRecord.registry
    const { identities: originalIdentities } = await parseRegistryBlob(registryRecord.rawRegistry) as Registry
    const registryCandidate: Registry = r
    const originalVersion = registryCandidate.version
    registryCandidate.version = params.newVersion || {
        major: originalVersion.major + (params.bumpType === 'major' ? 1 : 0),
        minor: originalVersion.minor + (params.bumpType === 'minor' ? 1 : 0),
        patch: originalVersion.patch + (params.bumpType === 'patch' ? 1 : 0),
    }
    
    registryCandidate.latestRevision = new Date().toISOString()
    if (originalIdentities) { // Attach original identities 
      registryCandidate.identities = originalIdentities
    }

    const unpublishedIdentities: {[authbase: string]: RegistryTimestampKeyedValues<IdentitySnapshot> } = {}

    if (params.targetIdentity) {
      const identitySnapshotRecord = 
          await db.registryIdentitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([registryRecord.contentHash, params.targetIdentity.authbase, params.targetIdentity.timestamp] as [string, string, string]).first();

      let identitySnapshot = identitySnapshotRecord?.identitySnapshot
      if (!identitySnapshot) {
        identitySnapshot = registryCandidate.identities?.[params.targetIdentity.authbase]?.[params.targetIdentity?.timestamp]
        if (!identitySnapshot) {
          throw new Error('Target identity not found')
        }
      }
      unpublishedIdentities[params.targetIdentity.authbase] = {
        [params.targetIdentity.timestamp]: identitySnapshot
      }
    }


    if (!params.targetIdentity && registryRecord.registry.identities) {
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
      const nftRecords = (await db.nfts
        .where('[contentHash+authbase+timestamp]')
        .equals([registryRecord.contentHash, authbase, timestamp])
        .toArray())
        .filter(nft => nft.status === 'new' || nft.status === 'modified');
        
      if (nftRecords.length > 0 && !registryCandidate.identities![authbase]![timestampCandidate]?.token!.nfts) {
        registryCandidate.identities![authbase]![timestampCandidate]!.token!.nfts = {
              parse: {
                types: {}
              }
            }
      }
      nftRecords.forEach((nftRecord) => {
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

    const parsedRegistry = await parseRegistryBlob(newRawRegistry) as Registry
    const compactParsedRegistry = compactRegistry(await parseRegistryBlob(newRawRegistry)) as CompactRegistry

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

  async getNfts(params: ProgressErrorListener & {
    contentHash: string,
    authbase: string,
    timestamp: string,
    offset?: number,
    limit?: number,
    order?: 'asc' | 'desc',
    identitySnapshotId?: number,
    status?: RegistryRecordStatus | undefined | ''
  }): Promise<PaginatedNftTypesResult|undefined> {
    try {
      
        const identitySnapshotRecord = await this.getIdentitySnapshot({
          contentHash: params.contentHash, 
          identity: { authbase: params.authbase, timestamp: params.timestamp }
        })

        const targetNftTypeKeys = identitySnapshotRecord?.nftTypeKeys?.slice(params.offset ?? 0, params.limit || 5) || []

        const collectionType = !(identitySnapshotRecord?.identitySnapshot?.token?.nfts?.parse as any).bytecode ? NftCollectionType.parsable : NftCollectionType.sequential
        
        /**
         * Pre sort so we can get the last sequence or last type
         */
        sortNftTypeKeys({ keys: targetNftTypeKeys, order: 'desc', collectionType })
        
        const lastNftTypeKey = targetNftTypeKeys[0] || ''

        if (params.order !== 'desc') {
          sortNftTypeKeys({ keys: targetNftTypeKeys, order: 'desc', collectionType })
        }

        if (params.status && params.status !== 'published') {
          const items = await db.nfts
              .where('[contentHash+authbase+timestamp+status]')
              .equals([params.contentHash, params.authbase, params.timestamp, params.status] as string[]) 
              .toArray()

            return {
              items,
              total: items.length,
              offset: params.offset ?? 0,
              limit: params.limit || 5,
              lastNftTypeKey
            }
        }

        

        const paginatedNftTypeKeys = targetNftTypeKeys.slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit || 5))
        const total = identitySnapshotRecord?.nftTypeKeys?.length ?? 0
        const items = []

        let parsedRegistry = null
        for (const key of paginatedNftTypeKeys) {
          const nftRecord = await db.nfts.where('[contentHash+authbase+timestamp+type]')
                      .equals([params.contentHash, params.authbase, params.timestamp, key])
                      .first() 
          if (nftRecord) {
            items.push(nftRecord)
            continue 
          }

          if (!parsedRegistry) {
            const rawRegistry = (await db.registry.where('contentHash').equals(params.contentHash).first())?.rawRegistry
            if (!rawRegistry) break
            parsedRegistry = await parseRegistryBlob(rawRegistry)
          }

          const nft = parsedRegistry.identities?.[params.authbase]?.[params.timestamp]?.token?.nfts?.parse?.types[key]
          if (!nft) continue
          const newNftRecord = {
            contentHash: params.contentHash,
            authbase: params.authbase,
            timestamp: params.timestamp,
            category: identitySnapshotRecord?.identitySnapshot.token?.category || '',
            type: key,
            nft: nft,
            status: 'published' as RegistryRecordStatus
          }
          
          await db.createNftRecord(newNftRecord)

          items.push(newNftRecord)          
        }

        return {
          items,
          total,
          offset: params.offset ?? 0,
          limit: params.limit || 5,
          lastNftTypeKey
        }

    } catch (e) {
      params.onError?.(getErrorMessage(e))
    }
  },
};

export type RegistryWorkerAPI = typeof registryWorker;

Comlink.expose(registryWorker);
