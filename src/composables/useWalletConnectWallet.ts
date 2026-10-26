import { computed, ref, shallowRef, triggerRef } from 'vue'
import type { SignTransactionRequest } from '@wizardconnect/core'
import {
  addressFromSession,
  connectWalletConnect,
  createWalletConnectSigner,
  disconnectWalletConnect,
  initWalletConnectClient,
  restoreWalletConnectSession,
  walletConnectChainId,
  WalletConnectCancelledError,
  WalletConnectExternalWallet,
  type WalletConnectClient,
  type WalletConnectModal,
  type WalletConnectSession,
  type WalletConnectSigner
} from 'src/core/wallet/wallet-connect'

export type WalletConnectState = 'idle' | 'connecting' | 'connected'

/**
 * WalletConnect is the second connect path, next to WizardConnect, for the non-HD wallets that
 * expose a single address. It is a self-contained stack: nothing here is read by WizardConnect and
 * nothing in WizardConnect is read by it. `useWalletSigner` is the only place that knows about both.
 *
 * State lives at module scope so every caller shares one session, the same way
 * `useWizardConnectWallet` does.
 */
const network = (import.meta.env.VITE_BCH_NETWORK as 'chipnet' | 'mainnet' | 'testnet') || 'mainnet'
const chainId = walletConnectChainId(network)

const wallet = shallowRef<WalletConnectExternalWallet>()
const signer = shallowRef<WalletConnectSigner>()
const state = ref<WalletConnectState>('idle')
const walletName = ref<string | null>(null)
const walletIcon = ref<string | null>(null)
const address = ref<string | null>(null)
/** The live session, so a UI can show its topic/expiry without reaching into the client. */
const activeSession = shallowRef<WalletConnectSession>()

const walletIsReady = computed(() => Boolean(wallet.value?.ready))

let client: WalletConnectClient | null = null
let modal: WalletConnectModal | null = null

/**
 * Enabled unless an environment explicitly turns it off (`VITE_ENABLE_WALLET_CONNECT=false`), and
 * only once a project id is configured — without one the client cannot be initialised at all. Read
 * here, in the app layer, so `src/core/` stays free of build-time configuration.
 */
export const isWalletConnectEnabled = () =>
  import.meta.env.VITE_ENABLE_WALLET_CONNECT !== 'false' &&
  Boolean(import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID)

const resetWallet = () => {
  activeSession.value = undefined
  wallet.value = undefined
  signer.value = undefined
  address.value = null
  walletName.value = null
  walletIcon.value = null
  state.value = 'idle'
  triggerRef(wallet)
}

const ensureClient = async (): Promise<WalletConnectClient> => {
  if (client) return client

  client = await initWalletConnectClient({
    projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID as string,
    metadata: {
      name: import.meta.env.VITE_APP_NAME as string,
      description: 'CashTokens Studio',
      url: import.meta.env.VITE_WALLET_CONNECT_VERIFIED_URL as string,
      icons: [import.meta.env.VITE_APP_ICON_URL as string]
    }
  })

  // The wallet can drop the session from its side; mirror that locally.
  client.on('session_delete', (event: { topic?: string }) => {
    if (event?.topic && event.topic === activeSession.value?.topic) resetWallet()
  })

  return client
}

const ensureModal = async (): Promise<WalletConnectModal> => {
  if (modal) return modal

  const { WalletConnectModal } = await import('@walletconnect/modal')
  modal = new WalletConnectModal({
    projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID as string,
    themeMode: 'dark',
    themeVariables: {
      '--wcm-background-color': '#20c997',
      '--wcm-accent-color': '#20c997',
      '--wcm-z-index': '9999'
    },
    explorerExcludedWalletIds: 'ALL'
  }) as unknown as WalletConnectModal

  return modal
}

/** Rebuilds the local wallet + signer from an approved (or restored) session. */
const adoptSession = async (activeClient: WalletConnectClient, session: WalletConnectSession) => {
  const connectedAddress = addressFromSession(session)
  if (!connectedAddress) return

  activeSession.value = session
  address.value = connectedAddress
  walletName.value = session.peer?.metadata?.name ?? null
  walletIcon.value = session.peer?.metadata?.icons?.[0] ?? null
  state.value = 'connected'
  signer.value = createWalletConnectSigner({ client: activeClient, session, chainId })

  const externalWallet = new WalletConnectExternalWallet({ network })
  externalWallet.session = session
  await externalWallet.initWallet(connectedAddress)
  wallet.value = externalWallet
  triggerRef(wallet)
}

export const useWalletConnectWallet = () => {
  /**
   * Re-attaches to a session the wallet still remembers. Called once from `App.vue` on mount —
   * it touches `localStorage` and the relay, so it must not run during SSR. Best-effort: a session
   * the wallet no longer honours, or a failed UTXO sync, must not break app start-up.
   */
  const restore = async () => {
    if (!isWalletConnectEnabled()) return
    try {
      const activeClient = await ensureClient()
      const session = restoreWalletConnectSession(activeClient)
      if (session) await adoptSession(activeClient, session)
    } catch {
      resetWallet()
    }
  }

  const connect = async () => {
    state.value = 'connecting'
    try {
      const activeClient = await ensureClient()
      const activeModal = await ensureModal()
      const session = await connectWalletConnect(activeClient, { chainId, modal: activeModal })
      if (session) await adoptSession(activeClient, session)
      else resetWallet()
    } catch (error) {
      resetWallet()
      // Closing the dialog is a cancel, not a failure: back to idle without an error toast.
      if (!(error instanceof WalletConnectCancelledError)) throw error
    }
  }

  const disconnect = async () => {
    try {
      if (client && activeSession.value) await disconnectWalletConnect(client, activeSession.value)
    } catch {
      // A wallet that is already gone must not block the local disconnect.
    } finally {
      resetWallet()
    }
  }

  const signTransaction = async (
    request: SignTransactionRequest,
    options?: { signal?: AbortSignal }
  ) => {
    if (!signer.value) throw new Error('No WalletConnect session is active')
    return signer.value.signTransaction(request, options)
  }

  return {
    isEnabled: isWalletConnectEnabled(),
    wallet,
    walletIsReady,
    state,
    walletName,
    walletIcon,
    address,
    session: activeSession,
    chainId,
    restore,
    connect,
    disconnect,
    signTransaction
  }
}
