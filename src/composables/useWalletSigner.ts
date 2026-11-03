import { computed, effectScope, ref, shallowRef, triggerRef, watch } from 'vue'
import type { SignTransactionRequest } from '@wizardconnect/core'
import type { WalletConnectExternalWallet } from 'src/core/wallet/wallet-connect'
import type { WizardConnectExternalWallet } from 'src/core/wallet'
import { useWizardConnectWallet } from './useWizardConnectWallet'
import { useWalletConnectWallet } from './useWalletConnectWallet'

export type WalletProvider = 'wizard-connect' | 'wallet-connect'

/**
 * The one place that knows both connect paths exist.
 *
 * It picks the active provider and forwards the call — it does not merge the two implementations.
 * WizardConnect keeps its own composable and its own manager; WalletConnect keeps its own composable
 * and its own signer. Removing the WalletConnect branch below (and the files it points at) leaves
 * WizardConnect exactly as it is.
 */
const createWalletSigner = () => {
  const wizardConnect = useWizardConnectWallet()
  const walletConnect = useWalletConnectWallet()

  const activeProvider = computed<WalletProvider | undefined>(() => {
    if (walletConnect.wallet.value?.ready) return 'wallet-connect'
    if (wizardConnect.wallet.value?.ready || wizardConnect.manager.value) return 'wizard-connect'
    return undefined
  })

  /**
   * A plain `computed` is a trap here.
   *
   * Both wallets are class instances held in a `shallowRef`, and both publish in-place field changes
   * (`ready`, `initializing`, `utxos`) with `triggerRef`. A computed that re-evaluates to the *same*
   * instance never bumps its dep version, so its subscribers are never invalidated and the value
   * stays cached — which is what left WizardConnect stuck on "Initializing Wallet" long after
   * `ready` had flipped to true.
   *
   * Mirroring into our own shallowRef and re-triggering it keeps the "poke the ref" contract that
   * `triggerRef` depends on.
   */
  const wallet = shallowRef<WizardConnectExternalWallet | WalletConnectExternalWallet>()

  const syncWallet = () => {
    wallet.value =
      activeProvider.value === 'wallet-connect'
        ? walletConnect.wallet.value
        : wizardConnect.wallet.value
    // The instance is usually the same one, so the assignment alone would not notify subscribers.
    triggerRef(wallet)
  }

  /**
   * Tick for readers that keep their own copy of the wallet's UTXO set (the authkey and vault forms
   * do). WizardConnect deliberately publishes background syncs without poking the wallet ref, so
   * without this a page would stay on the snapshot it read at mount until a full reload.
   */
  const utxosVersion = ref(0)
  const publishUtxos = () => { utxosVersion.value = Date.now() }
  let lastWalletInstance: WizardConnectExternalWallet | WalletConnectExternalWallet | undefined

  /**
   * Detached scope: a `watch()` created during the setup of whichever page happens to use this
   * composable first is stopped when that page unmounts, which would freeze wallet mirroring and
   * the sync tick for the rest of the session. The wallet outlives every page, so its watchers must
   * too.
   */
  effectScope(true).run(() => {
    watch(
      [wizardConnect.wallet, walletConnect.wallet, activeProvider],
      syncWallet,
      { immediate: true, flush: 'sync' }
    )

    watch(wizardConnect.walletLasySync, publishUtxos)

    // Only a different instance means a different UTXO set; `triggerRef` re-fires with the same one.
    watch(wallet, (current) => {
      if (current === lastWalletInstance) return
      lastWalletInstance = current
      publishUtxos()
    })
  })

  const walletIsReady = computed(() => Boolean(wallet.value?.ready))

  const walletName = computed(() =>
    activeProvider.value === 'wallet-connect'
      ? walletConnect.walletName.value
      : wizardConnect.walletName.value
  )

  const walletIcon = computed(() =>
    activeProvider.value === 'wallet-connect'
      ? walletConnect.walletIcon.value
      : wizardConnect.walletIcon.value
  )

  const isConnecting = computed(() =>
    activeProvider.value !== 'wallet-connect' &&
    (wizardConnect.state.value === 'connecting' || wizardConnect.state.value === 'reconnecting')
  )

  const signTransaction = async (
    request: SignTransactionRequest,
    options?: { signal?: AbortSignal }
  ) => {
    if (activeProvider.value === 'wallet-connect') {
      return walletConnect.signTransaction(request, options)
    }

    const manager = wizardConnect.manager.value
    if (!manager) throw new Error('No wallet is connected')
    return manager.signTransaction(request, options)
  }

  const disconnect = async () => {
    if (activeProvider.value === 'wallet-connect') return walletConnect.disconnect()
    return wizardConnect.disconnect()
  }

  return {
    activeProvider,
    wallet,
    walletIsReady,
    walletName,
    walletIcon,
    isConnecting,
    /** Watch this to re-read the wallet's UTXOs after a background sync or a reconnect. */
    utxosVersion,
    signTransaction,
    disconnect
  }
}

type WalletSigner = ReturnType<typeof createWalletSigner>

/**
 * Shared at module scope like the two composables it sits between: one set of refs and one watcher
 * for the whole app, and a `triggerRef` from any page reaches every reader.
 *
 * Built lazily on first use because it pulls in `useWizardConnectWallet`, which registers lifecycle
 * hooks and must therefore be created inside a component setup.
 */
let walletSigner: WalletSigner | null = null

export const useWalletSigner = (): WalletSigner => {
  if (!walletSigner) walletSigner = createWalletSigner()
  return walletSigner
}
