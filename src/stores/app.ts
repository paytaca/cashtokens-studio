import * as Comlink from 'comlink'
import { defineStore } from 'pinia'
import { ParsedRegistryRecord, RegistryRecord } from 'src/core/client-db';
import { ref } from 'vue';

import { type RegistryWorkerAPI } from 'src/workers/registry-worker';
import { Registry } from 'src/core/bcmr/bcmr-v2.schema';
import type { DecoratedUtxo } from 'src/core/types';
let worker: Comlink.Remote<RegistryWorkerAPI> | null = null

export const useAppStore = defineStore('app-store', () => {

    const activeMinter = ref<DecoratedUtxo | undefined>()
    function setActiveMinter(minter: DecoratedUtxo | undefined) {
        activeMinter.value = minter
    }
    
    return {
        activeMinter,
        setActiveMinter
    }
})