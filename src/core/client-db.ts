// db.js
import { Dexie, EntityTable} from 'dexie';
import { Registry, TokenCategory, IdentitySnapshot, SequentialNftCollection, ParsableNftCollection, NftType } from './bcmr/bcmr-v2.schema';
import { UtxoTxid, UtxoVout, UtxoWithPath } from './types';

export type BumpArtifact = {
    contentHash: string,
    uris: string[],
    cid: string
}

export type RegistryRecord = {
    id: number,
    authbase: string,
    contentHash: string,
    publicationUris: string[],
    authhead?: string,
    rawRegistry: Blob,
    registry: CompactRegistry,
    bumpArtifact?: BumpArtifact,
    modified?: boolean, // registry modified
    created?: boolean
}

export type CompactRegistry = Omit<Registry, 'identities'> & { 
  identities?: {
    [authbase: string]: string[] // array of timestamps
  } 
}

export type ParsedRegistryRecord = Omit<RegistryRecord, 'rawRegistry'>
  
export type IdentitySnapshotRecord = {
  id: number,
  contentHash: string,
  authbase: string,
  timestamp: string,
  category: string,
  identitySnapshot: IdentitySnapshot & Record<string, any>,
  modified?: boolean,
  created?: boolean
}

export type NftCollectionRecord = {
  id: number,
  contentHash: string,
  authbase: string,
  timestamp: string,
  category: string,
  type: string,
  nft: NftType,
  modified?: boolean,
  created?: boolean
}

export type UtxoRecord = UtxoWithPath & { 
  walletId: string,
  id:`${UtxoTxid}:${UtxoVout}`, 
}

export type MaybeUtxoRecord = Omit<UtxoRecord, 'id'|'walletId'>  & { 
  id?:`${UtxoTxid}:${UtxoVout}`
  walletId?: string
}

export type IdentitiesRecord = {
  id: number
  contentHash: string
  identities: string[]
}

export type IdentityHistoryRecord = Omit<IdentitiesRecord, 'identities'> & {
  authbase: string,
  identityHistory: string[]
}

class CashtokensStudioDB extends Dexie {

  registry!: EntityTable<RegistryRecord, 'id'> 
  registryIdentitySnapshot!: EntityTable<IdentitySnapshotRecord, 'id'>
  nfts!: EntityTable<NftCollectionRecord, 'id'>
  utxo!: EntityTable<UtxoRecord, 'id'>

  constructor() {

    super('CashtokensStudioDB');
    this.version(1).stores({
      registry: '++id, contentHash, authbase',
      registryIdentitySnapshot: '[contentHash+authbase+timestamp], authbase, timestamp, category',
      nfts: '[contentHash+authbase+timestamp+type], authbase, timestamp, category, type',
      utxo: 'id, walletId'
    })
  }

  async saveUtxos(utxos: MaybeUtxoRecord[], walletId: string) {
    const normalizedNetworkUtxos = utxos.map((u: MaybeUtxoRecord) => {
      const newU = {
        ...u
      }
      if (!newU.id) {
        newU.id = `${u.txid}:${u.vout}`
      }
      if (!newU.walletId) {
        newU.walletId = walletId
      }
      return newU
    });
  
    await this.transaction('rw', this.utxo, async () => {
      // 1. Smoothly insert/overwrite incoming data
      await this.utxo.bulkPut(normalizedNetworkUtxos as UtxoRecord[]);
  
      // 2. Fetch all local primary keys belonging ONLY to this specific type
      const collection = this.utxo.where('walletId').equals(walletId)
      
      const localKeysOfThisType = await collection.primaryKeys(); 
  
      // 3. Create a matching map for rapid verification
      const networkKeySet = new Set(
        normalizedNetworkUtxos.map(u => u.id)
      );
  
      // 4. Identify old entries of this type that are missing from the fresh server dataset
      const keysToPurge = localKeysOfThisType.filter(
        (id) => !networkKeySet.has(id)
      );
  
      // 5. Purge only the spent UTXOs of this particular type
      if (keysToPurge.length > 0) {
        await this.utxo.bulkDelete(keysToPurge);
      }
    });
  }

  async getUtxos(walletId: string): Promise<UtxoRecord[]> {
    return await this.utxo
      .where('walletId')
      .equals(walletId)
      .toArray();
  }

   /**
   * Drops all cached UTXO records linked to a specific walletId instantly.
   * Useful when a user signs out, deletes an account, or requests a hard resync.
   */
   async clearWalletUtxos(walletId: string): Promise<void> {
    // Encapsulate inside a read-write transaction for safety
    await this.transaction('rw', this.utxo, async () => {
      const keysToRemove = await this.utxo
        .where('walletId')
        .equals(walletId)
        .primaryKeys();

      if (keysToRemove.length > 0) {
        await this.utxo.bulkDelete(keysToRemove);
      }
    });
  }
  
}



export const db = new CashtokensStudioDB()



