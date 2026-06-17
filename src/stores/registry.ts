import * as Comlink from 'comlink'
import { defineStore } from 'pinia'
import { ParsedRegistryRecord, RegistryRecord } from 'src/core/client-db';
import { ref } from 'vue';

import { type RegistryWorkerAPI } from 'src/workers/registry-worker';
import { NftType, Registry } from 'src/core/bcmr/bcmr-v2.schema';
let worker: Comlink.Remote<RegistryWorkerAPI> | null = null

export type ActiveNft = {
    contentHash: string,
    authbase: string,
    timestamp: string,
    category: string,
    bytecode?: string,
    commitmentOrBottomAltStack: string,
    nft: NftType,
    allowEdit?: boolean
}


export const useRegistryStore = defineStore('registry-store', () => {

    if (typeof window !== 'undefined' && !worker) {
        const w = new Worker(
            // Note: Verify if your project root alias handles 'src/...'. 
            // Relative paths like './registry-worker.ts' are usually safer for bundlers.
            new URL('../workers/registry-worker.ts', import.meta.url),
            { type: 'module' }
        );
        worker = Comlink.wrap(w)
    }

    const registries = ref<ParsedRegistryRecord[]>([] as any)
    const activeNft = ref<ActiveNft|undefined|null>()
    const identitySnapshotCache = ref<Record<string, any>>({})

    const setActiveNft = (newActiveNft: ActiveNft | undefined | null) => {
        activeNft.value = newActiveNft
    }

    const loadRegistry = async (authbase: string, sync?: boolean) => {
        try {
            const result = await worker?.loadRegistry({ authbase, sync })
            console.log('Result load regisry', result)
            if (result) {
                const i = registries.value?.findIndex((r) => { r.id === result!.id })
                if (i === -1) registries.value.push(result as ParsedRegistryRecord)
            }
            return result
        } catch (error) {
            console.log('ERROR LAODING REGISTRY', error)
        }
        
    }

    const fetchIdentitySnapshot = async (category: string) => {
        if (identitySnapshotCache.value[category]) {
            return identitySnapshotCache.value[category]
        }
        const response = await fetch(`${import.meta.env.VITE_BCMR_INDEXER_URL}/api/tokens/${category}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log(`Identity snapshot for ${category}:`, data)
        identitySnapshotCache.value[category] = data
        return data;
      }

    const getIdentitySnapshotByCategory = async(category: string) => {
        const identitySnapshotRecord = await worker?.getIdentitySnapshot({ category })
        return identitySnapshotRecord?.identitySnapshot
    }

    const getIdentitySnapshotRecordByCategory = async(category: string) => {
        const identitySnapshotRecord = await worker?.getIdentitySnapshot({ category })
        return identitySnapshotRecord
    }

    const getIdentitySnapshot = async(params: { contentHash: string, identity: { authbase: string, timestamp: string } }) => {
        const identitySnapshotRecord = await worker?.getIdentitySnapshot(params)
        return identitySnapshotRecord?.identitySnapshot
    }

    const getRegistryByAuthbase = async(authbase: string) => {
        const registryRecord = await worker?.loadRegistry({ authbase })
        return registryRecord
    }

    return {
        registries,
        activeNft,
        setActiveNft,
        loadRegistry,
        getRegistryByAuthbase,
        getIdentitySnapshot,
        getIdentitySnapshotByCategory,
        getIdentitySnapshotRecordByCategory,
        fetchIdentitySnapshot,
        identitySnapshotCache
    }
})
