// db.js
import { Dexie, EntityTable} from 'dexie';
import { Registry } from './bcmr/bcmr-v2.schema';

export type RegistryRecord = {
    id: number,
    authbase: string,     // for indexing
    category: string,     // for indexing
    contentHash: string,  // for indexing
    latestRevision: string,
    publicationUris: string[],
    registry: Registry
}

export const db = new Dexie('CashtokensStudioDB') as Dexie & {
    registry: EntityTable<RegistryRecord, 'id'> // primary key "id" (for the typings only)>;
}

db.version(1).stores({
  registry: '++id, authbase, category, contentHash, latestRevision', // Primary key and indexed props
});



