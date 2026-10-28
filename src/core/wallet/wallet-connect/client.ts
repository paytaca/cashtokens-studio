/**
 * WalletConnect v2 client — framework-free.
 *
 * A WalletConnect session exposes a single address (no xpubs), so this module carries only the
 * connection lifecycle and the two BCH JSON-RPC methods the app uses. Everything it needs — project
 * id, metadata, chain id — is injected by the caller: it reads no env and holds no Vue state.
 *
 * `@walletconnect/*` is imported lazily so the feature stays out of the main bundle until a
 * WalletConnect session is actually opened.
 */

type SignClientModule = typeof import('@walletconnect/sign-client')

export type WalletConnectClient = Awaited<ReturnType<SignClientModule['SignClient']['init']>>

/** Only the parts of a session this app reads. */
export type WalletConnectSession = {
  topic: string
  /** UNIX timestamp in seconds, as WalletConnect reports it. */
  expiry?: number
  namespaces?: Record<string, { accounts?: string[] } | undefined>
  peer?: { metadata?: { name?: string; icons?: string[] } }
}

/** Only the parts of the modal this app drives. */
export type WalletConnectModal = {
  openModal(options: { uri: string }): Promise<void>
  closeModal(): void
  /** Fires on open/close transitions; returns the unsubscribe function. */
  subscribeModal(callback: (state: { open: boolean }) => void): () => void
}

/**
 * Thrown when the user closes the WalletConnect dialog before approving. Callers should treat it as
 * a cancel — return to idle silently — not as a connection failure.
 */
export class WalletConnectCancelledError extends Error {
  constructor(message = 'WalletConnect dialog closed before approval') {
    super(message)
    this.name = 'WalletConnectCancelledError'
  }
}

export type WalletConnectClientConfig = {
  projectId: string
  metadata: { name: string; description: string; url: string; icons: string[] }
  relayUrl?: string
}

export type WalletConnectSignRequest = {
  transaction: unknown
  sourceOutputs: unknown[]
  broadcast?: boolean
  userPrompt?: string
}

export type WalletConnectSignMessageRequest = {
  message: string
  broadcast?: boolean
  userPrompt?: string
}

const DEFAULT_RELAY_URL = 'wss://relay.walletconnect.com'

/**
 * `bch:bitcoincash` on mainnet, `bch:bchtest` everywhere else — the two chains BCH wallets
 * advertise. Derived from the app's network, not from a build-time environment name.
 */
export function walletConnectChainId(network?: string): string {
  return network === 'chipnet' || network === 'testnet' ? 'bch:bchtest' : 'bch:bitcoincash'
}

export async function initWalletConnectClient(config: WalletConnectClientConfig): Promise<WalletConnectClient> {
  const { SignClient } = await import('@walletconnect/sign-client')
  return SignClient.init({
    projectId: config.projectId,
    relayUrl: config.relayUrl ?? DEFAULT_RELAY_URL,
    metadata: config.metadata,
  })
}

/**
 * `bch_signTransactionP2SHMultisig` is optional: only non-HD multisig wallets advertise it, and a
 * wallet that does not support it must still be able to connect for the plain P2PKH flows.
 */
function connectNamespaces(chainId: string) {
  return {
    requiredNamespaces: {
      bch: {
        chains: [chainId],
        methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
        events: ['addressesChanged']
      }
    },
    optionalNamespaces: {
      bch: { chains: [chainId], methods: ['bch_signTransactionP2SHMultisig'], events: [] }
    }
  }
}

/** The address a session is connected as, normalised out of the `bch:<address>` account string. */
export function addressFromSession(session: WalletConnectSession | undefined): string | undefined {
  const account = session?.namespaces?.bch?.accounts?.[0]
  return account?.replace(/^bch:/, '')
}

/** The most recent stored session, if the wallet still has one. */
export function restoreWalletConnectSession(client: WalletConnectClient): WalletConnectSession | undefined {
  const sessions = client.session.getAll()
  return sessions[sessions.length - 1]
}

export async function connectWalletConnect(
  client: WalletConnectClient,
  params: { chainId: string; modal: WalletConnectModal }
): Promise<WalletConnectSession | undefined> {
  const { uri, approval } = await client.connect(connectNamespaces(params.chainId))
  if (!uri) return approval()

  // `approval()` only settles on approval, protocol rejection, or pairing expiry (~5 min) — closing
  // the dialog settles nothing. Watch the modal's own open state and race it against approval, so a
  // user who closes the dialog gets an immediate, distinguishable cancel instead of a stuck session.
  let unsubscribeModal: () => void = () => undefined
  const cancelled = new Promise<never>((_resolve, reject) => {
    let sawOpen = false
    unsubscribeModal = params.modal.subscribeModal((modalState) => {
      // modal-core publishes the current state on subscribe: ignore it, react to transitions.
      if (modalState.open) {
        sawOpen = true
        return
      }
      if (!sawOpen) return
      unsubscribeModal()
      reject(new WalletConnectCancelledError())
    })
    void params.modal.openModal({ uri }).catch(() => undefined)
  })

  const approvalSettled = approval()
  // After a cancel (or expiry) nothing reads approval()'s outcome; keep its eventual rejection from
  // surfacing as an unhandled one.
  approvalSettled.catch(() => undefined)

  try {
    return await Promise.race([approvalSettled, cancelled])
  } finally {
    // Unsubscribe before closing: the programmatic close must not look like a user cancel.
    unsubscribeModal()
    params.modal.closeModal()
  }
}

/**
 * Signs through the session's wallet.
 *
 * The request is already transport-safe — every builder serialises its source outputs through
 * `jsonReplacer` — so it travels as plain JSON, unlike the WizardConnect path which has its own
 * lossless serializer.
 */
export async function walletConnectSignTransaction(
  client: WalletConnectClient,
  session: WalletConnectSession,
  params: { chainId: string; request: WalletConnectSignRequest }
): Promise<{ signedTransaction: string }> {
  return client.request({
    chainId: params.chainId,
    topic: session.topic,
    request: { method: 'bch_signTransaction', params: params.request }
  })
}

export async function walletConnectSignMessage(
  client: WalletConnectClient,
  session: WalletConnectSession,
  params: { chainId: string; request: WalletConnectSignMessageRequest }
): Promise<string> {
  return client.request({
    chainId: params.chainId,
    topic: session.topic,
    request: { method: 'bch_signMessage', params: params.request }
  })
}

export async function disconnectWalletConnect(
  client: WalletConnectClient,
  session: WalletConnectSession
): Promise<void> {
  await client.disconnect({
    topic: session.topic,
    reason: { code: 6000, message: 'Disconnecting' }
  })
}
