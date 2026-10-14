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
            if (newUri) {
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
                        await wallet.value!.initWallet(session)
                        wallet.value.getBalance({ sync: true })
                        walletLasySync.value = Date.now()
                        triggerRef(wallet)
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
        const sessionPaths = manager.value?.getSessionPaths() || []
        if((newState === 'connected' && newState !== oldState) || sessionPaths.length > 0) {
            if (!wallet.value?.session && manager.value?.getSessionPaths()) {
                wallet.value = new WizardConnectExternalWallet({
                    network: import.meta.env.VITE_BCH_NETWORK
                })
                await wallet.value!.initWallet({ paths: manager.value!.getSessionPaths() as PathXpub[] })
                await wallet.value.getBalance({ sync: true })
                walletLasySync.value = Date.now()
                triggerRef(wallet)
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
