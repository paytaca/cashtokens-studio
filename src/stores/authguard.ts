import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { AuthheadId, filterAuthKeys, getLockedAuthheadUtxos } from 'src/core/authguard'
import { fetchAuthheadTxid } from 'src/core/chaingraph'
import type { UtxoWithPath, UtxoWithAuthKey, DecoratedUtxo} from 'src/core/types'
import { useRegistryStore } from './registry'
import { LocalStorage } from 'quasar'
import { stringify } from 'bitauth-libauth-v3'
import { parseLibauthStringified } from 'src/core/utils'
import { db } from 'src/core/client-db'

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
  /**
   * The persisted active authhead is wallet-bound: the stored `walletId` has to match the current
   * wallet's cache id before the row is trusted. A row written without an id (older builds) could
   * belong to any wallet, so it is dropped rather than restored.
   */
  const readStoredActiveAuthhead = (): { walletId: string, authhead: DecoratedUtxo } | undefined => {
    const stored = LocalStorage.getItem('active_authhead') as object | null
    if (!stored) return undefined
    try {
      const parsed = parseLibauthStringified(stored) as { walletId?: string, authhead?: DecoratedUtxo } | null
      if (parsed?.walletId && parsed?.authhead) {
        return { walletId: parsed.walletId, authhead: parsed.authhead }
      }
    } catch (error) {
      console.error('active authhead restore failed:', error)
    }
    LocalStorage.removeItem('active_authhead')
    return undefined
  }
  const storedActiveAuthhead = readStoredActiveAuthhead()
  const activeAuthhead = ref<DecoratedUtxo | null>(storedActiveAuthhead?.authhead ?? null)
  /** Wallet the restored `activeAuthhead` belongs to; kept in sync with it, never persisted on its own. */
  const activeAuthheadWalletId = ref<string | undefined>(storedActiveAuthhead?.walletId)
  const authheadLoading = ref<Record<string, boolean>>({}) // {<txid:vout>: true}
  /** Authheads handed over by the auth UTXO import flow, spotlighted once on the managed tokens page. */
  const receivedAuthheads = ref<DecoratedUtxo[]>([])
  /**
   * Wallet fingerprint for the authhead snapshot cache: an opaque, wallet-scoped id derived by the
   * wallet itself (`ctswz…` from the receive xpub, `ctswc…` from the session address — see
   * `core/wallet/wallet-cache-id`). Stable per wallet and network, and never the raw key material.
   */
  const walletFingerprint = ref<string>()
  

  /**
   * Assumes authkeys was updated somewhere by invoking loadAuthheads
   */
  async function updateActiveAuthhead(params?: {authheadTxid: string, bumpedRegistry: boolean}) {
    if (!activeAuthhead.value || !activeAuthhead.value.authkey?.token?.category) return
    // Re-decorate the authhead from the (possibly bumped) registry so the
    // identitySnapshotIdentifier tracks the current contentHash.
    if (params?.bumpedRegistry !== false) {
      const refreshed = await loadAuthhead({
        authkey: activeAuthhead.value.authkey,
        sync: true,
        // Pin the scan to the expected authhead when the caller knows it: the authguard address can
        // hold more than one unspent authhead, and the first one is not necessarily this one.
        ...(params?.authheadTxid ? { authheadId: `${params.authheadTxid}:0` as AuthheadId } : {})
      })

      if (refreshed) {
        activeAuthhead.value = Object.assign({}, refreshed)
        setActiveAuthhead(activeAuthhead.value)
        return
      }
    }

    

    // Fallback: refresh the UTXO while keeping the previous identity.
    const authheadId = params?.authheadTxid ? `${params.authheadTxid}:0`: params?.authheadTxid
    const latestAuthhead = (await getLockedAuthheadUtxos([activeAuthhead.value.authkey], authheadId as AuthheadId))?.[0]

    if (!latestAuthhead) return 
    latestAuthhead.identitySnapshot = activeAuthhead.value.identitySnapshot
    latestAuthhead.identitySnapshotIdentifier = activeAuthhead.value.identitySnapshotIdentifier
    latestAuthhead.authkey = activeAuthhead.value.authkey
    latestAuthhead.authkey.vout = activeAuthhead.value.authkey.vout
    latestAuthhead.authkey.txid = latestAuthhead.txid
    activeAuthhead.value = Object.assign({}, latestAuthhead)
    setActiveAuthhead(latestAuthhead)
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
  
  /**
   * Render the last known authheads immediately on boot: live rows win, and a snapshot stored
   * under a different wallet fingerprint is never shown. Cached rows count as a completed load
   * (they stamp `authheadsLastSync`), so "first load pending" UIs hand over to the table at once.
   */
  async function hydrateAuthheadsSnapshot() {
    if (authheads.value.length > 0) return
    const walletId = walletFingerprint.value
    if (!walletId) return
    const snapshot = await db.getAuthheadSnapshot(walletId)
    if (!snapshot?.payload) return
    const rows = parseLibauthStringified(snapshot.payload) as unknown
    if (!Array.isArray(rows)) return
    authheads.value = rows as DecoratedUtxo[]
    authheadsLastSync.value = Date.now()
  }

  /** Persist the decorated rows for the next boot, keyed by the wallet fingerprint. Stored as a
   * libauth-stringified payload (same encode/revive pair as `activeAuthhead`): writing the
   * reactive array directly would fail IndexedDB's structured clone on Vue proxies.
   */
  async function persistAuthheadSnapshot() {
    const walletId = walletFingerprint.value
    if (!walletId) return
    const payload = stringify(authheads.value)
    await db.saveAuthheadSnapshot({ walletId, payload })
  }

  /**
   * Background refreshes must not visually "undress" tokens: a scanned row that has no registry
   * decoration yet inherits it from the row already known under the same id (hydrated from the
   * snapshot or a previous load). Rows only change when the chain data actually changed.
   */
  function carryOverIdentitySnapshots(
    scannedRows: DecoratedUtxo[],
    knownRows: DecoratedUtxo[]
  ): DecoratedUtxo[] {
    const knownById = new Map(knownRows.map((row) => [`${row.txid}:${row.vout}`, row]))
    return scannedRows.map((row) => {
      if (row.identitySnapshot) return row
      const known = knownById.get(`${row.txid}:${row.vout}`)
      if (!known?.identitySnapshot) return row
      return {
        ...row,
        identitySnapshot: known.identitySnapshot,
        identitySnapshotIdentifier: known.identitySnapshotIdentifier,
      }
    })
  }

  async function loadAuthheads(authkeyList?: UtxoWithPath[], sync?: boolean, silent = false) {
    try {
      if (!silent) authheadsLoading.value = true;
      const scannedRows = await getLockedAuthheadUtxos(authkeyList || authkeys.value);
      // Background refresh keeps the known identity decoration (see carryOverIdentitySnapshots),
      // so hydrated rows survive the scan without an icon/symbol flash.
      authheads.value = carryOverIdentitySnapshots(scannedRows, authheads.value);
      // The scan result is in hand (possibly empty), so the "first load pending" state ends
      // HERE — before the registry decoration pipeline below, which is the slow part. Pages
      // keep rendering rows while icons and symbols fill in progressively.
      authheadsLastSync.value = Date.now();
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
      // Safety stamp: a thrown load must also end "pending", so pages fall back to the plain
      // empty state instead of holding the scanning skeleton forever.
      authheadsLastSync.value = Date.now();
      // Never let a cache write fail the load itself.
      persistAuthheadSnapshot().catch((error) => console.error('authhead snapshot persist failed:', error));
    }
  } 


  const loadAuthkeys = async (externalWallet: any, sync?: boolean, silent = false) => {
    try {
        if (!silent) authkeysLoading.value = true
        const utxos = await externalWallet.getUtxos({ sync }) as UtxoWithPath[]
        
        authkeys.value = filterAuthKeys(utxos) as UtxoWithPath[]
        authkeysLastSync.value = Date.now()
        walletFingerprint.value = externalWallet?.getCacheId?.() || undefined
        // Last known rows before the (slower) chain scan refreshes them: pages render instantly.
        await hydrateAuthheadsSnapshot().catch((error) => console.error('authhead snapshot hydrate failed:', error))
        return authkeys.value
    } finally {
        authkeysLoading.value = false
    }

  }

  const setActiveAuthhead = (authhead: UtxoWithAuthKey) => {
    activeAuthhead.value = authhead
    // Only a wallet-bound selection may survive a reload: an unbound one could surface under a
    // different wallet later. Choosing `null` clears both the value and the binding.
    activeAuthheadWalletId.value = authhead ? walletFingerprint.value : undefined
    if (authhead && walletFingerprint.value) {
      LocalStorage.setItem('active_authhead', JSON.parse(stringify({
        walletId: walletFingerprint.value,
        authhead,
      })))
    } else {
      LocalStorage.removeItem('active_authhead')
    }
  }

  /**
   * Point the selection at the authhead the authchain actually tracks.
   *
   * The stored selection is only refreshed by the page that spends it (publish/mint), so a mint or
   * publish that ran in another tab, another device or a previous session leaves this session
   * pointing at an ancestor — publishing is then refused by the BCMR guard, and minting would spend
   * a spent UTXO.
   *
   * The authguard address can hold more than one unspent authhead (an abandoned branch left behind
   * by an earlier publication never disappears), so the provider's order is not a tie-breaker:
   * consult chaingraph for the head it tracks and prefer that one. When the tracked head is not
   * among the unspent outputs it has already been spent by a newer, still-unconfirmed transaction —
   * in that case the current selection is the freshest thing this session knows about, so keep it.
   */
  async function reconcileActiveAuthhead() {
    const current = activeAuthhead.value
    const category = current?.authkey?.token?.category
    if (!current || !category) return

    const unspentAuthheads = await getLockedAuthheadUtxos([current.authkey])
    if (unspentAuthheads.length === 0) return

    const authbase = current.identitySnapshotIdentifier?.identity?.authbase || current.token?.category
    let trackedTxid: string | undefined
    if (authbase) {
      try {
        trackedTxid = await fetchAuthheadTxid({ authbase })
      } catch (error) {
        // Offline or a provider outage: fall back to what the scan found.
        console.error(error)
      }
    }

    const currentId = `${current.txid}:${current.vout}`
    const trackedAuthhead = trackedTxid
      ? unspentAuthheads.find((authhead) => authhead.txid === trackedTxid)
      : undefined
    const currentAuthhead = unspentAuthheads.find((authhead) => `${authhead.txid}:${authhead.vout}` === currentId)

    // The tracked head wins even when the current selection is still unspent: only the tracked one
    // may publish without forking the identity.
    const latestAuthhead = trackedAuthhead ?? currentAuthhead ?? unspentAuthheads[0]!
    if (latestAuthhead.txid === current.txid && latestAuthhead.vout === current.vout) return

    const authkey = authkeys.value.find((utxo) =>
      utxo.token?.category === category && utxo.token.nft?.commitment === '00'
    )

    setActiveAuthhead({
      ...latestAuthhead,
      authkey: authkey ?? current.authkey,
      identitySnapshot: current.identitySnapshot,
      identitySnapshotIdentifier: current.identitySnapshotIdentifier,
      isAuthhead: true,
    } as UtxoWithAuthKey)
  }

  /** Keep the authheads an import just delivered, so the managed tokens page can spotlight them once. */
  const setReceivedAuthheads = (utxos: DecoratedUtxo[]) => {
    receivedAuthheads.value = utxos
  }

  /** Called when the user leaves the page: after that the authheads are just like any other. */
  const clearReceivedAuthheads = () => {
    receivedAuthheads.value = []
  }

  /** Hydrate the snapshot the moment the wallet fingerprint becomes known, on any load path. */
  watch(() => walletFingerprint.value, (walletId, previousWalletId) => {
    if (!walletId) return
    // A different wallet means the in-memory rows belong to someone else: drop them before
    // hydrating that wallet's snapshot, rather than flashing one wallet's tokens under another.
    if (previousWalletId && previousWalletId !== walletId) authheads.value = []
    // Same rule for the selected authhead: a selection made under another wallet is not valid here.
    if (activeAuthheadWalletId.value && activeAuthheadWalletId.value !== walletId) {
      setActiveAuthhead(null as any)
    }
    hydrateAuthheadsSnapshot().catch((error) => console.error('authhead snapshot hydrate failed:', error))
  })

  watch(() => authkeysLastSync.value, async (authkeysLastSync, authkeysPrevSync) => {
    // A reset stamps this back to undefined; with no wallet there is nothing to reload.
    if (!walletFingerprint.value) return
    if (authkeysLastSync !== authkeysPrevSync) {
      try {
        await loadAuthheads(authkeys.value || [], true, true)
      } catch (error) {
        console.error(error)
      }
    }
  })

  /**
   * Ends a wallet session: every wallet-scoped row in memory goes away, so the pages never show
   * one wallet's data under another. The on-disk authhead snapshot stays — it is that wallet's
   * cache and hydrates again the next time the same wallet connects.
   *
   * `activeAuthhead` is deliberately left to the fingerprint watcher above: it keeps the selection
   * for the same wallet reconnecting, and clears it (storage included) the moment a different
   * wallet's fingerprint arrives.
   */
  const resetWalletScopedState = () => {
    // Clear the id first: the fingerprint watcher above must stay quiet on the way down.
    walletFingerprint.value = undefined
    authheads.value = []
    authkeys.value = []
    authheadsLastSync.value = undefined
    authkeysLastSync.value = undefined
    authheadsLoading.value = false
    authkeysLoading.value = false
    authheadLoading.value = {}
    receivedAuthheads.value = []
  }


  return {
    authkeys,
    authkeysLastSync,
    authkeysLoading,
    authheads,
    authheadsLastSync,
    authheadsLoading,
    authheadLoading,
    activeAuthhead,
    receivedAuthheads,
    loadAuthkeys,
    loadAuthheads,
    loadAuthhead,
    setActiveAuthhead,
    setReceivedAuthheads,
    clearReceivedAuthheads,
    updateActiveAuthhead,
    reconcileActiveAuthhead,
    resetWalletScopedState
  }
}) 



