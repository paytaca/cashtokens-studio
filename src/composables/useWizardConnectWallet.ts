import { DisconnectReason, RelayMsgAction, type PathXpub, type ProtocolMessage, type WalletReadyMessage } from '@wizardconnect/core'
import { useWizardConnect } from 'wizardconnect-vue'
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'
import { WizardConnectExternalWallet } from 'src/core/wallet'

const wallet = shallowRef(new WizardConnectExternalWallet({ network: import.meta.env.VITE_BCH_NETWORK}))
const walletLasySync = ref<number>()
const showQR = ref(false)
const qrURI = ref<string | null>(null)
const qrDataURI = ref<string | null>(null)

/** Timestamp (ms) of the last Pong (keepalive response) received from the wallet. */
const lastPongAt = ref<number | null>(null)
/** Number of Pong replies received during the current session. */
const pongCount = ref(0)

let _wc: ReturnType<typeof useWizardConnect> | null = null
let _watcherSetup = false

export const wizardConnectRelayUrls = [
    'wss://relay.riften.net:443',
    'wss://relay.cauldron.quest:443',
]

export const wizardConnectSessionKey = 'wizardconnect-session'

const walletIsReady = computed(() => {
    return wallet.value?.ready
})

/**
 * `wallet` is a shallowRef holding a class instance, so writes to its properties are invisible to
 * the UI. Every transition of `initializing` has to be paired with a `triggerRef` — the views that
 * read it (`MainLayout`, `RegistryLayout`) only re-render when the ref itself is poked.
 *
 * Without this, `initWallet()`'s window (dynamic import + UTXO fetch) stayed invisible and pages
 * kept rendering the pre-connect state — the index page showed its Connect button until the very
 * end of the init.
 */
const beginWalletInit = () => {
    if (wallet.value) wallet.value.initializing = true
    triggerRef(wallet)
}

const endWalletInit = () => {
    if (wallet.value) wallet.value.initializing = false
    triggerRef(wallet)
}

export const useWizardConnectWallet = () => {

    if (!_wc) {
        _wc = useWizardConnect({
            dappName: import.meta.env.VITE_APP_NAME as string,
            dappIcon: import.meta.env.VITE_APP_ICON_URL as string,
            relayUrls: wizardConnectRelayUrls
        })
    }

    const {
        state,
        manager,
        walletName,
        walletIcon,
        uri, qrUri, connect, disconnect,
    } = _wc

    if (!_watcherSetup) {
        _watcherSetup = true

        watch(uri, (newUri) => {
            // Only use a URI to open the QR while we are still getting into a session: a
            // URI arriving after the handshake completed must not re-open the dialog.
            if (newUri && state.value !== 'connected') {
                qrURI.value = newUri as any
                qrDataURI.value = qrUri.value
                showQR.value = true
            }
        })

        // Track keepalive Pong replies so the UI can show the last ping status.
        // Outgoing pings aren't emitted by the library, but every incoming
        // message (including Pong) is emitted via `messagereceived`.
        let pingManager: any = null
        watch(manager, (mgr) => {
            if (!mgr) {
                pingManager = null
                lastPongAt.value = null
                pongCount.value = 0
                return
            }
            if (mgr === pingManager) return
            pingManager = mgr
            lastPongAt.value = null
            pongCount.value = 0
            // Read the ref here: the watcher hands us the unwrapped manager, which has no `.value`.
            manager.value?.on('messagereceived', (msg: ProtocolMessage) => {
                if (msg?.action === RelayMsgAction.Pong) {
                    lastPongAt.value = Date.now()
                    pongCount.value += 1
                }
            })
        }, { immediate: true })
    }

    const wrappedConnect = () => {
        const result = connect()
        if (result) {
            const mgr = manager.value
            if ((manager.value?.getSessionPaths().length ?? 0) === 0) {
                showQR.value = true
            }

            if (mgr) {

                mgr.on('disconnect', (reason: DisconnectReason, message: string | undefined) => {
                    wallet.value = new WizardConnectExternalWallet({
                        network: import.meta.env.VITE_BCH_NETWORK
                    })
                })

                mgr.on('walletready', async (message: WalletReadyMessage) => {
                    const session = message.session?.hdwalletv1 as { paths?: PathXpub[] } | undefined

                    if (session) {
                        if (!wallet.value) {
                            wallet.value = new WizardConnectExternalWallet({
                                network: import.meta.env.VITE_BCH_NETWORK
                            })
                        }
                        // Flag the window before awaiting: initWallet()'s import and UTXO
                        // fetches are the lag that used to show the Connect button.
                        beginWalletInit()
                        try {
                            await wallet.value!.initWallet(session)
                            wallet.value.getBalance({ sync: true })
                            walletLasySync.value = Date.now()
                        } finally {
                            endWalletInit()
                        }
                    }
                })


            }
        }
        return result
    }

    const wrappedDisconnect = async () => {
        await disconnect()
        wallet.value = new WizardConnectExternalWallet({
            network: import.meta.env.VITE_BCH_NETWORK
        })
        triggerRef(wallet)
    }

    const closeConnectDialog = async () => {
        showQR.value = false
        qrURI.value = null
        qrDataURI.value = null
        if (state.value === 'connecting' || state.value === 'reconnecting') {
            await wrappedDisconnect()
        }
    }

    watch(() => state.value, async (newState, oldState) => {
        // Own the QR's lifetime here, not in a page: the init swap unmounts the router-view, and
        // a page's watcher is stopped at that point — which used to strand `showQR` at true and
        // re-open the dialog as soon as the page remounted.
        if (newState === 'connected') showQR.value = false

        const sessionPaths = manager.value?.getSessionPaths() || []
        if((newState === 'connected' && newState !== oldState) || sessionPaths.length > 0) {
            if (!wallet.value?.session && manager.value?.getSessionPaths()) {
                wallet.value = new WizardConnectExternalWallet({
                    network: import.meta.env.VITE_BCH_NETWORK
                })
                beginWalletInit()
                try {
                    await wallet.value!.initWallet({ paths: manager.value!.getSessionPaths() as PathXpub[] })
                    await wallet.value.getBalance({ sync: true })
                    walletLasySync.value = Date.now()
                } finally {
                    endWalletInit()
                }
            }
        }
    }, { immediate: true })

    return {
        state,
        walletName,
        walletIcon,
        manager,
        uri,
        qrUri,
        wallet,
        walletLasySync,
        walletIsReady,
        showQR,
        qrURI,
        qrDataURI,
        relayUrls: wizardConnectRelayUrls,
        sessionKey: wizardConnectSessionKey,
        lastPongAt,
        pongCount,
        connect: wrappedConnect,
        disconnect: wrappedDisconnect,
        closeConnectDialog,
    }
}
