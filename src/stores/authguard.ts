import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { AuthheadId, filterAuthKeys, getLockedAuthheadUtxos } from 'src/core/authguard'
import type { UtxoWithPath, UtxoWithAuthKey, AuthheadUtxo, DecoratedUtxo} from 'src/core/types'
import { useRegistryStore } from './registry'

export const useAuthguardStore = defineStore('authguard-store', () => {

  const {
    loadRegistry,
    getIdentitySnapshot
  } = useRegistryStore()

  const authheads = ref<DecoratedUtxo[]>([])
  const authheadsLastSync = ref<number>()
  const authheadsLoading = ref<boolean>()
  const authkeys = ref<UtxoWithPath[]>([])
  const authkeysLastSync = ref<number>()
  const authkeysLoading = ref<boolean>()
  const activeAuthhead = ref<DecoratedUtxo>()
  const authheadLoading = ref<Record<string, boolean>>({}) // {<txid:vout>: true}
  

  async function updateActiveAuthhead() {
    if (!activeAuthhead.value || !activeAuthhead.value.authkey?.token?.category) return
    const latestAuthhead = (await getLockedAuthheadUtxos([activeAuthhead.value.authkey]))?.[0]
    if (!latestAuthhead) return 
    latestAuthhead.identitySnapshot = activeAuthhead.value.identitySnapshot
    latestAuthhead.identitySnapshotIdentifier = activeAuthhead.value.identitySnapshotIdentifier
    latestAuthhead.authkey = activeAuthhead.value.authkey
    latestAuthhead.authkey.vout = activeAuthhead.value.authkey.vout
    latestAuthhead.authkey.txid = latestAuthhead.txid
    activeAuthhead.value = Object.assign({}, latestAuthhead)
  }

  async function loadAuthhead(params: { authkey: UtxoWithPath, sync?: boolean, authheadId?: AuthheadId }) {
    try {
      if (params.authheadId) {
        authheadLoading.value[params.authheadId] = true
      }
      const authhead = (await getLockedAuthheadUtxos([params.authkey], params.authheadId) as DecoratedUtxo[])?.[0];
      if (!authhead) return 
      if (!authhead.token?.category) return // TODO: support non-token authhead

      const index = authheads.value.findIndex((a) => {
        return `${a.txid}:${a.vout}` === `${authhead.txid}:${authhead.vout}`
      })

      if (index !== -1) {
        authheads.value.splice(index, 1, authhead)
      } else {
        authheads.value.push(authhead)
      }

      const authbase = authhead.token?.category;

      try {
        const registryRecord = await loadRegistry(authbase, params.sync);

        if (!registryRecord) return;

        if (!registryRecord.registry.identities?.[authbase]?.[0]) {
          return;
        }

        const identity = {
          contentHash: registryRecord.contentHash,
          identity: {
            authbase,
            timestamp: registryRecord.registry.identities![authbase]![0]!
          },
          registryIdentity: registryRecord.registryIdentity
        };

        const identitySnapshot = await getIdentitySnapshot(identity);
        if (identitySnapshot) {
          authhead.identitySnapshot = identitySnapshot;
          authhead.identitySnapshotIdentifier = identity;
        }
        return authhead
      } catch (error) {
        console.error(`Error processing authhead for category ${authbase}:`, error);
      }
    } finally {
      authheadLoading.value[params.authheadId || ''] = false
    }
  } 
  
  async function loadAuthheads(authkeyList?: UtxoWithPath[], sync?: boolean) {
    try {
      authheadsLoading.value = true;
      authheads.value = await getLockedAuthheadUtxos(authkeyList || authkeys.value);
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
            },
            registryIdentity: registryRecord.registryIdentity
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

    } finally {
      authheadsLoading.value = false;
    }
  } 


  const loadAuthkeys = async (externalWallet: any, sync?: boolean) => {
    try {
        authkeysLoading.value = true
        const utxos = await externalWallet.getUtxos({ sync }) as UtxoWithPath[]
        console.log('loading authkeys', utxos)
        authkeys.value = filterAuthKeys(utxos) as UtxoWithPath[]
        // if (sync) {
        //   await loadAuthheads(sync)
        // }
        authkeysLastSync.value = Date.now()
        return authkeys.value
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
        await loadAuthheads(authkeys.value || [], true)
      } catch (error) {
        console.log(error)
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
    authheadLoading,
    activeAuthhead,
    loadAuthkeys,
    loadAuthheads,
    loadAuthhead,
    setActiveAuthhead,
    updateActiveAuthhead
  }
}) 



