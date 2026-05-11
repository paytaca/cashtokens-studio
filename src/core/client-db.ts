// db.js
import { Dexie, EntityTable} from 'dexie';
import { Registry, TokenCategory, IdentitySnapshot} from './bcmr/bcmr-v2.schema';

export type RegistryRecord = {
    id: number,
    authbase: string,     // for indexing
    category: string,     // for indexing
    contentHash: string,  // for indexing
    latestRevision: string,
    publicationUris: string[],
    registry: Registry
}

export type TokenCategoryRecord = {
  id: number,
  authbase: string,     // for indexing
  category: string     // for indexing
  tokenCategory: TokenCategory & Record<string, any>
}

export type IdentitySnapshotRecord = {
  id: number,
  authbase: string,     // for indexing
  category: string     // for indexing
  identitySnapshot: IdentitySnapshot & Record<string, any>
}

export const db = new Dexie('CashtokensStudioDB') as Dexie & {
    // Use registry for recent active registries only,
    registry: EntityTable<RegistryRecord, 'id'> // primary key "id" (for the typings only)>;
    identitySnapshot: EntityTable<IdentitySnapshotRecord, 'id'>
}

db.version(1).stores({
  registry: '++id, authbase, category, contentHash, latestRevision', // Primary key and indexed props
  identitySnapshot: '++id, authbase, category'
});



