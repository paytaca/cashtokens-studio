import * as Comlink from 'comlink';
import { db, IdentitySnapshotRecord, RegistryRecord } from '../core/client-db'
import { retrieveLastRegistryPublication } from '../core/chaingraph'
import { getErrorMessage } from '../core/utils';

type ProgressErrorListener  = {
  onProgress?: (msg: string) => void,
  onError?: (msg: string) => void
}

export type DownloadRegistryParams = ProgressErrorListener & { authbase: string } 

export type GetIdentitiesParams = ProgressErrorListener & { contentHash: string } 

export type GetIdentityHistoryParams = GetIdentitiesParams & { authbase: string, timestamp: string }

export type GetIdentitySnapshotParams = ProgressErrorListener & { 
  identity?: {
    authbase: string,
    timestamp: string
  }
  category?: string 
}

export type Authbase = string

const registryWorker = {

  async getRegistry(params: DownloadRegistryParams): Promise<Omit<RegistryRecord, 'registry'>|undefined> {
    try {
      const pub = await retrieveLastRegistryPublication({ authbase: params.authbase })
      const uris: string[] = pub[0]?.uris || []
      const contentHash: string = pub[0]?.contentHash
      if (!uris.length) return
      const existing = await db.registry.where('contentHash').equals(contentHash).first();
      if(existing) {
        return { id: existing.id, authbase: params.authbase, contentHash: existing.contentHash, publicationUris: uris  }
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
      
      const id = await db.registry.put({
        authbase: params.authbase,
        contentHash,
        publicationUris: uris,
        registry: registry
      })

      const jsonRegistry = await registry.text()
      const parsedRegistry = JSON.parse(jsonRegistry)
      if (parsedRegistry.identities) {
        const identities = Object.keys(parsedRegistry.identities || {})
          await db.registryIdentities.put({
            contentHash: contentHash,
            identities: identities
          });

        for (const authbase of identities) {
          const identityHistory = Object.keys(parsedRegistry.identities[authbase] || {})
          // identityHistory contains strings of new Date().toISOString() values
          identityHistory.sort((a, b) => b.localeCompare(a)); // latest first
          await db.registryIdentityHistory.put({
            contentHash: contentHash,
            authbase: authbase,
            identityHistory: identityHistory
          });

          const latest = identityHistory[0] as string
          const identitySnapshot = parsedRegistry.identities[authbase][latest]
          if (identitySnapshot.token?.nfts) {
            identitySnapshot.token.nfts = true 
            // Parse nfts on demand
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
      return { id: id, authbase: params.authbase, contentHash: contentHash, publicationUris: uris }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      params.onError?.(message)
    } finally {
      params.onProgress?.('Finished')
    }
  },

  async getIdentities(params: GetIdentitiesParams): Promise<string[]> {

    let identities: string[] = []
    
    try {
      const queryResult = await db.registryIdentities.where('contentHash').equals(params.contentHash).first();
      
      if (queryResult) {
        return queryResult.identities
      }

      const registryQueryResult = await db.registry.where('contentHash').equals(params.contentHash).first()
      // parse the registry blob here
      if (registryQueryResult && registryQueryResult.registry && registryQueryResult.registry instanceof Blob) {
        try {
          // Convert blob to text and parse as JSON
          const text = await registryQueryResult.registry.text();
          const parsedRegistry = JSON.parse(text);
          identities = Object.keys(parsedRegistry.identities || {})
          await db.registryIdentities.put({
            contentHash: params.contentHash,
            identities: identities
          });
  
        } catch (e) {
          params.onError?.(getErrorMessage(e))
        }
      }
    } catch (e) {
      params.onError?.(getErrorMessage(e))
    } finally {
      return identities;    
    }
  },

  async getIdentityHistory(params: GetIdentityHistoryParams): Promise<string[]> {

    let history: string[] = []
    
    try {

      const queryResult = await db.registryIdentityHistory.where('contentHash').equals(params.contentHash).first();
      
      if (queryResult) {
        return queryResult.identityHistory
      }

      const registryQueryResult = await db.registry.where('contentHash').equals(params.contentHash).first()
      // parse the registry blob here
      if (registryQueryResult && registryQueryResult.registry && registryQueryResult.registry instanceof Blob) {
        try {
          // Convert blob to text and parse as JSON
          const text = await registryQueryResult.registry.text();
          const parsedRegistry = JSON.parse(text);
          const identity = parsedRegistry.identities?.[params.authbase]
          history = Object.keys(identity || {})
          await db.registryIdentityHistory.put({
            contentHash: parsedRegistry.contentHash,
            authbase: params.authbase,
            identityHistory: history
          });
          
        } catch (e) {
          params.onError?.(getErrorMessage(e))
        }
      }
    } catch (e) {
      params.onError?.(getErrorMessage(e))
    } finally {
      return history
    }
  },

  async getIdentitySnapshot(params: GetIdentitySnapshotParams): Promise<IdentitySnapshotRecord|undefined> {
    try {

      if (params.identity) {
        const queryResult = await db.registryIdentitySnapshot
          .where('[authbase+timestamp]')
          .equals([params.identity.authbase, params.identity.timestamp])
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
  }
};

export type RegistryWorkerAPI = typeof registryWorker;

Comlink.expose(registryWorker);
