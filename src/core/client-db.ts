// db.js
import { Dexie, EntityTable} from 'dexie';
import { Registry, IdentitySnapshot, NftType } from './bcmr/bcmr-v2.schema';
import { UtxoTxid, UtxoVout, UtxoWithPath } from './types';

export type BumpArtifact = {
    contentHash: string,
    uris: string[],
    cid: string,
    registry: Blob // Release candidate
}

export type RegistryRecordStatus = 'new' | 'published' | 'modified'

export type RegistryRecord = {
    id: number,
    authbase: string,
    contentHash: string,
    publicationUris: string[],
    authhead?: string,
    rawRegistry: Blob,
    registry: CompactRegistry,
    bumpArtifact?: BumpArtifact,
    status: RegistryRecordStatus,
    tokenCategories?: string[]
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
  status: RegistryRecordStatus
}

export type NftRecord = {
  id?: number,
  contentHash: string,
  authbase: string,
  timestamp: string,
  category: string,
  type: string,
  nft: NftType,
  status: RegistryRecordStatus
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

export type ActivityStatus = 'pending' | 'success' | 'failed'

export type ActivityRecord = {
  id?: number,
  event: string,
  timestamp: number,
  txid?: string,
  status: ActivityStatus
}

export interface Publishable {
  status: RegistryRecordStatus
}

export function setRecordStatus(record: Publishable, status: 'new'|'modified'|'published') {
  if (status === 'modified') {
    record.status = record.status === 'new' ? record.status : status 
  }
  record.status = status
}

class CashtokensStudioDB extends Dexie {

  registry!: EntityTable<RegistryRecord, 'id'> 
  registryIdentitySnapshot!: EntityTable<IdentitySnapshotRecord, 'id'>
  nfts!: EntityTable<NftRecord, 'id'>
  utxo!: EntityTable<UtxoRecord, 'id'>
  activity!: EntityTable<ActivityRecord, 'id'>

  constructor(network: 'chipnet'|'mainnet') {

    super(`CashtokensStudioDB${network}`);
    // this.version(1).stores({
    //   registry: '++id, contentHash, authbase',
    //   registryIdentitySnapshot: '[contentHash+authbase+timestamp], authbase, timestamp, category',
    //   nfts: '[contentHash+authbase+timestamp+type], authbase, timestamp, category, type',
    //   utxo: 'id, walletId'
    // })
    // this.version(2).stores({
    //   registry: '++id, contentHash, authbase',
    //   registryIdentitySnapshot: '[contentHash+authbase+timestamp], authbase, timestamp, category',
    //   nfts: '[contentHash+authbase+timestamp+type], authbase, timestamp, category, type',
    //   utxo: 'id, walletId',
    //   activity: '++id, event, timestamp, status'
    // })
    this.version(1).stores({
      registry: '++id, contentHash, authbase',
      registryIdentitySnapshot: '++id, contentHash, [contentHash+authbase+timestamp], authbase, timestamp, category',
      nfts: '++id, contentHash, [contentHash+authbase+timestamp+type], authbase, timestamp, category, type',
      utxo: 'id, walletId',
      activity: '++id, event, timestamp, status'
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

  async saveActivity(params: {
    event: string,
    txid?: string,
    status: ActivityStatus
  }): Promise<number|undefined> {
    return await this.activity.add({
      event: params.event,
      timestamp: Date.now(),
      txid: params.txid,
      status: params.status
    })
  }

  async setRegistryPublished(authbase: string, contentHash: string): Promise<void> {
    const record = await this.registry.where({ authbase, contentHash }).first()
    if (record) {
      await this.registry.update(record.id!, { status: 'published' })
    }
  }

  async createNftRecord(params: {
    contentHash: string,
    authbase: string,
    timestamp: string,
    category: string,
    type: string,
    nft: NftType
  }): Promise<NftRecord> {
    const existing = await this.nfts
      .where('[contentHash+authbase+timestamp+type]')
      .equals([params.contentHash, params.authbase, params.timestamp, params.type] as [string, string, string, string])
      .first()

    if (existing) {
      return existing
    }

    const record = {
      contentHash: params.contentHash,
      authbase: params.authbase,
      timestamp: params.timestamp,
      category: params.category,
      type: params.type,
      nft: params.nft,
      status: 'new'
    } as NftRecord

    await this.nfts.put(record)
    return record
  }

  async updateNftRecord(params: {
    contentHash: string,
    authbase: string,
    timestamp: string,
    type: string,
    nft: NftType
  }): Promise<NftRecord> {
    const existing = await this.nfts
      .where('[contentHash+authbase+timestamp+type]')
      .equals([params.contentHash, params.authbase, params.timestamp, params.type] as [string, string, string, string])
      .first()

    if (!existing) {
      throw new Error(`NftRecord not found for type ${params.type}`)
    }

    const nftEqual = JSON.stringify(existing.nft) === JSON.stringify(params.nft)
    if (nftEqual) return existing

    existing.nft = params.nft
    if (existing.status === 'published') {
      existing.status = 'modified'
    }
    await this.nfts.put(existing)
    return existing
  }

  async setNftRecordsPublished(params: {
    contentHash: string,
    authbase: string,
    timestamp: string,
    types: string[]
  }): Promise<void> {
    await this.transaction('rw', this.nfts, async () => {
      for (const type of params.types) {
        const record = await this.nfts
          .where('[contentHash+authbase+timestamp+type]')
          .equals([params.contentHash, params.authbase, params.timestamp, type] as [string, string, string, string])
          .first()
        if (record) {
          await this.nfts.update(record.id!, { status: 'published' })
          // await this.nfts.update(
          //   [record.contentHash, record.authbase, record.timestamp, record.type] as [string, string, string, string],
          //   { status: 'published' }
          // )
        }
      }
    })
  }

  async createNewRegistry(params: {
    authbase: string,
    contentHash: string,
    publicationUris: string[],
    rawRegistry: Blob
  }): Promise<ParsedRegistryRecord> {
    const text = await params.rawRegistry.text()
    const parsedRegistry = JSON.parse(text) as Registry
    const compactRegistry = this.toCompactRegistry(parsedRegistry)

    const registryRecord = {
      authbase: params.authbase,
      contentHash: params.contentHash,
      publicationUris: params.publicationUris,
      rawRegistry: params.rawRegistry,
      registry: compactRegistry,
      status: 'new'
    } as RegistryRecord

    const id = await this.registry.add(registryRecord)
    const { rawRegistry, ...rest } = registryRecord
    return { ...rest, id }
  }

  private toCompactRegistry(registry: Registry): CompactRegistry {
    if (!registry.identities) return registry as unknown as CompactRegistry
    const identities = Object.keys(registry.identities)
    const identitiesMap = identities.reduce((acc: { [authbase: string]: string[] }, authbase: string) => {
      acc[authbase] = Object.keys(registry.identities![authbase] || {}).sort((a, b) => b.localeCompare(a))
      return acc
    }, {} as { [authbase: string]: string[] })
    return { ...registry, identities: identitiesMap }
  }

}

export const db = new CashtokensStudioDB(import.meta.env.VITE_BCH_NETWORK)



