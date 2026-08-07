import { Dexie, EntityTable } from 'dexie';
import { Registry, IdentitySnapshot, NftType } from './bcmr/bcmr-v2.schema';
import { UtxoTxid, UtxoVout, UtxoWithPath } from './types';
import { CompactRegistry } from './bcmr/types';

export type BumpArtifact = {
  contentHash: string,
  uris: string[],
  cid: string,
  registry: Blob // Release candidate
}

export type RegistryRecordStatus = 'new' | 'published' | 'modified' | 'deleted'

export type RegistryRecord = {
  id: number,
  authbase: string,
  contentHash: string,
  publicationUris: string[],
  authhead?: string,
  rawRegistry: Blob,
  registry: CompactRegistry,
  registryIdentity: string | `offchain:${string}`;
  bumpArtifact?: BumpArtifact,
  status: RegistryRecordStatus,
  identities?: string[] // [`authbase:timestamp:[category]`, ...]
  categories?: string[]
}

export type ParsedRegistryRecord = Omit<RegistryRecord, 'rawRegistry'>

export type IdentitySnapshotRecord = {
  id: number,
  contentHash: string,
  authbase: string,
  timestamp: string,
  category: string,
  registryIdentity: string | `offchain:${string}`,
  identitySnapshot: IdentitySnapshot & Record<string, any>,
  /**
   * NftType keys found on this identity snapshot
   */
  nftTypeKeys: string[],
  status: RegistryRecordStatus
}

export type NftRecord = {
  id: number,
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
  id: `${UtxoTxid}:${UtxoVout}`,
}

export type MaybeUtxoRecord = Omit<UtxoRecord, 'id' | 'walletId'> & {
  id?: `${UtxoTxid}:${UtxoVout}`
  walletId?: string
}

export type ActivityStatus = 'pending' | 'success' | 'failed'

export type ActivityRecord = {
  id?: number,
  event: string,
  timestamp: number,
  txid?: string,
  status: ActivityStatus
}

class CashtokensStudioDB extends Dexie {

  registry!: EntityTable<RegistryRecord, 'id'>
  identitySnapshot!: EntityTable<IdentitySnapshotRecord, 'id'>
  nfts!: EntityTable<NftRecord, 'id'>
  utxo!: EntityTable<UtxoRecord, 'id'>
  activity!: EntityTable<ActivityRecord, 'id'>
  authhead!: EntityTable<UtxoRecord, 'id'>

  constructor(network: 'chipnet' | 'mainnet') {
    super(`CashtokensStudioDB${network}`);
    this.version(1).stores({
      registry: '++id, contentHash, authbase, *categories, registryIdentity',
      identitySnapshot: '++id, contentHash, [contentHash+authbase+timestamp], authbase, timestamp, category',
      nfts: '++id, [contentHash+authbase+timestamp+type], [contentHash+authbase+timestamp+status], contentHash, authbase, timestamp, category, type',
      utxo: 'id, walletId',
      activity: '++id, event, timestamp, status'
    })
  }

  async saveUtxos(utxos: MaybeUtxoRecord[], walletId: string) {
    const normalizedNetworkUtxos: UtxoRecord[] = utxos.map((u) => ({
      ...u,
      id: u.id ?? `${u.txid}:${u.vout}`,
      walletId: u.walletId ?? walletId,
    }));

    await this.transaction('rw', this.utxo, async () => {
      // 1. Smoothly insert/overwrite incoming data
      await this.utxo.bulkPut(normalizedNetworkUtxos);

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
  }): Promise<number | undefined> {
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
    nft: NftType,
    status?: RegistryRecordStatus
  }): Promise<NftRecord> {
    const existing = await this.nfts
      .where('[contentHash+authbase+timestamp+type]')
      .equals([params.contentHash, params.authbase, params.timestamp, params.type])
      .first()

    if (existing) {
      return existing
    }

    const record: NftRecord = {
      id: 0,
      contentHash: params.contentHash,
      authbase: params.authbase,
      timestamp: params.timestamp,
      category: params.category,
      type: params.type,
      nft: params.nft,
      status: params.status || 'new'
    }

    const id = await this.nfts.put(record)
    return { ...record, id }
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
      .equals([params.contentHash, params.authbase, params.timestamp, params.type])
      .first()

    if (!existing) {
      throw new Error(`NftRecord not found for type ${params.type}`)
    }

    const nftEqual = JSON.stringify(existing.nft) === JSON.stringify(params.nft)
    if (nftEqual) return existing

    const updated: NftRecord = {
      ...existing,
      nft: params.nft,
      status: existing.status === 'published' ? 'modified' : existing.status,
    }

    await this.nfts.put(updated)
    return updated
  }

  async setNftRecordStatus(params: {
    contentHash: string,
    authbase: string,
    timestamp: string,
    type: string,
    status: RegistryRecordStatus
  }): Promise<void> {
    const record = await this.nfts
      .where('[contentHash+authbase+timestamp+type]')
      .equals([params.contentHash, params.authbase, params.timestamp, params.type])
      .first()

    if (!record) return

    const nextStatus: RegistryRecordStatus =
      params.status === 'modified' && record.status === 'new'
        ? record.status
        : params.status;

    await this.nfts.put({ ...record, status: nextStatus })
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
          .equals([params.contentHash, params.authbase, params.timestamp, type])
          .first()
        if (record) {
          await this.nfts.put({ ...record, status: 'published' })
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

    const registryRecord: RegistryRecord = {
      id: 0,
      authbase: params.authbase,
      contentHash: params.contentHash,
      publicationUris: params.publicationUris,
      rawRegistry: params.rawRegistry,
      registry: compactRegistry,
      registryIdentity: '',
      status: 'new'
    }

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

