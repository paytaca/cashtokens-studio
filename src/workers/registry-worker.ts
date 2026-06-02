import * as Comlink from 'comlink';
import { CompactRegistry, db, IdentitySnapshotRecord, ParsedRegistryRecord, RegistryRecord, BumpArtifact } from '../core/client-db'
import { retrieveLastRegistryPublication } from '../core/chaingraph'
import { getErrorMessage } from '../core/utils';
import { IdentitySnapshot, NftType, Registry, RegistryTimestampKeyedValues } from 'src/core/bcmr/bcmr-v2.schema';
import { PublicationStrategy } from 'src/components/bcmr/types';
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

  async getRegistry(params: DownloadRegistryParams): Promise<ParsedRegistryRecord|undefined> {
    try {
      
      const pub = await retrieveLastRegistryPublication({ authbase: params.authbase })
      const uris: string[] = pub[0]?.uris || []
      const contentHash: string = pub[0]?.contentHash
      if (!uris.length) return

      const existing = await db.registry.where('contentHash').equals(contentHash).first();
        console.log('EXISTING', existing)

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

              await db.registryIdentitySnapshot.put(identitySnapshotRecord)
            }
          }

          const registryRecord = {
            authbase: params.authbase,
            contentHash,
            publicationUris: uris,
            rawRegistry: registry,
            registry: compactParsedRegistry as CompactRegistry
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
      }
      
      if (!params.category) throw new Error('Identity or category required')

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
            modified: false
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
        modified: false
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
    // registry: CompactRegistry, 
    // identity?: { // The modified or new identity snapshot
    //   authbase: string,
    //   timestamp: string, 
    //   identitySnapshot: IdentitySnapshot
    // },   
    // nfts?: {    // any modified or new nft type
    //   authbase: string,
    //   timestamp: string,
    //   type: string,
    //   nft: NftType
    // } [] 
  }): Promise<{uris: string[], contentHash: string}|undefined> {

    console.log('params', params)
    // const { identities: compactedIdentities, ...restOfRegistry} = params.registry
    // const registry = structuredClone(restOfRegistry as Registry)
    
    const registryRecord = await db.registry.where('contentHash').equals(params.originalContentHash).first()
    console.log('RegistryRecord', registryRecord)
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
        if (identitySnapshotRecord?.modified) {
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
      // Query NftCollectionRecord for this contentHash, authbase, and timestamp
      // Only include those with created or modified attributes
      const nftCollectionRecords = (await db.nfts
        .where('[contentHash+authbase+timestamp]')
        .equals([registryRecord.contentHash, authbase, timestamp])
        .toArray())
        .filter(nft => nft.created || nft.modified);
      
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
          bumpArtifact: { contentHash, uris, cid: artifact.cid }
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
        bumpArtifact: { contentHash, uris, cid: artifact.cid }
      })
    }

    return {
      contentHash,
      uris
    }
  }

};

export type RegistryWorkerAPI = typeof registryWorker;

Comlink.expose(registryWorker);
