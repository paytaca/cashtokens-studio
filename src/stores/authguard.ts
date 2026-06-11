import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { filterAuthKeys, getLockedAuthheadUtxos } from 'src/core/authguard'
import type { UtxoWithPath, UtxoWithAuthKey, AuthheadUtxo} from 'src/core/types'
import { useRegistryStore } from './registry'

export const useAuthguardStore = defineStore('authguard-store', () => {

  const {
    loadRegistry,
    getIdentitySnapshot
  } = useRegistryStore()

  const authheads = ref<AuthheadUtxo[]>([])
  const authheadsLastSync = ref<number>()
  const authheadsLoading = ref<boolean>()
  const authkeys = ref<UtxoWithPath[]>([])
  const authkeysLastSync = ref<number>()
  const authkeysLoading = ref<boolean>()
  const activeAuthhead = ref<AuthheadUtxo>()

  async function loadAuthheads(sync?: boolean) {
  try {
    authheadsLoading.value = true;
    authheads.value = await getLockedAuthheadUtxos(authkeys.value);
    // Create a pipeline task for each individual authhead
    const tasks = authheads.value.map(async (authhead) => {
      if (!authhead.token) return;

      const authbase = authhead.token.category;

      try {
        const registryRecord = await loadRegistry(authbase, sync);

        if (!registryRecord) return;

        if (!registryRecord.registry.identities?.[authbase]?.[0]) {
          return;
        }

        const identity = {
          contentHash: registryRecord.contentHash,
          identity: {
            authbase,
            timestamp: registryRecord.registry.identities![authbase]![0]!
          }
        };

        const identitySnapshot = await getIdentitySnapshot(identity);
        if (identitySnapshot) {
          authhead.identitySnapshot = identitySnapshot;
          authhead.identitySnapshotIdentifier = identity;
        }
      } catch (error) {
        console.error(`Error processing authhead for category ${authbase}:`, error);
      }
    });

    await Promise.allSettled(tasks);

  } catch (error) {
    throw error;
  } finally {
    authheadsLoading.value = false;
  }
  } 


  const loadAuthkeys = async (externalWallet: any, sync?: boolean) => {
    try {
        authkeysLoading.value = true
        const utxos = await externalWallet.getUtxos({ sync }) as UtxoWithPath[]
        authkeys.value = filterAuthKeys(utxos) as UtxoWithPath[]
        if (sync) {
          authkeysLastSync.value = Date.now()
        }
        
    } catch (error) {
        throw error
    } finally {
        authkeysLoading.value = false
    }
  }

  const setActiveAuthhead = (authhead: UtxoWithAuthKey) => {
    activeAuthhead.value = authhead
  }

  watch(() => authkeysLastSync.value, async (authkeysLastSync, authkeysPrevSync) => {
    if (authkeysLastSync !== authkeysPrevSync) {
        try {
          authheadsLoading.value = true
          await loadAuthheads(true)
        } catch (error) {
            console.log(error)
        } finally {
            authheadsLoading.value = false
        }
    }
})


  return {
    authkeys,
    authkeysLastSync,
    authkeysLoading,
    authheads,
    authheadsLastSync,
    authheadsLoading,
    activeAuthhead,
    loadAuthkeys,
    loadAuthheads,
    setActiveAuthhead
  }
}) 



