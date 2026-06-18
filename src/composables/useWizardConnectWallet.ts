import { DisconnectReason, type PathXpub, type ProtocolMessage, type WalletReadyMessage } from '@wizardconnect/core'
import { useWizardConnect } from 'wizardconnect-vue'
import { ref, shallowRef, watch } from 'vue'
import { WizardConnectExternalWallet } from 'src/core/wallet'

const wallet = shallowRef(new WizardConnectExternalWallet())
const walletLasySync = ref<number>()
const showQR = ref(false)
const qrURI = ref<string | null>(null)
const qrDataURI = ref<string | null>(null)

let _wc: ReturnType<typeof useWizardConnect> | null = null
let _watcherSetup = false

export const useWizardConnectWallet = () => {

    if (!_wc) {
        _wc = useWizardConnect({
            dappName: import.meta.env.VITE_APP_NAME as string,
            dappIcon: import.meta.env.VITE_APP_ICON_URL as string,
            relayUrls: ['wss://relay.riften.net:443', 'wss://relay.cauldron.quest:443'],
            maxReconnectAttempts: 10,
            reconnectInterval: 10000,
        })
    }

    const {
        state,
        manager,
        walletName, uri, qrUri, connect, disconnect,
    } = _wc

    if (!_watcherSetup) {
        _watcherSetup = true

        watch(uri, (newUri) => {
            if (newUri) {
                qrURI.value = newUri
                qrDataURI.value = qrUri.value
                showQR.value = true
            }
        })

        watch(state, (newState) => {
            if (newState === 'connected' || newState === 'disconnected') {
                showQR.value = false
            }
        })
    }

    const wrappedConnect = () => {
        const result = connect()
        if (result) {
            const mgr = manager.value
            if (mgr) {
                mgr.on('disconnect', (reason: DisconnectReason, message: string | undefined) => {
                    console.log('Handle disconnect', reason, message)
                    wallet.value = new WizardConnectExternalWallet()
                })

                mgr.on('walletready', async (message: WalletReadyMessage) => {
                    console.log('Handle wallet ready', message)
                    const session = message.session?.hdwalletv1 as { paths?: PathXpub[] } | undefined
                    if (session) {
                        await wallet.value!.initWallet(session)
                        wallet.value.getBalance({ sync: true })
                        walletLasySync.value = Date.now()
                    }
                })

                mgr.on('messagereceived', (message: ProtocolMessage) => {
                    console.log('Handle message received', message)
                })

                mgr.on('messagesent', (message: ProtocolMessage) => {
                    console.log('Handle message sent', message)
                })
            }
        }
        return result
    }

    watch(state, async (newState, oldState) => {
        console.log('manager', manager.value)
        if(newState === 'connected') {
            if (!wallet.value?.session && manager.value?.getSessionPaths()) {
                wallet.value = new WizardConnectExternalWallet()
                await wallet.value!.initWallet({ paths: manager.value!.getSessionPaths() as PathXpub[] })
                await wallet.value.getBalance({ sync: true })
                walletLasySync.value = Date.now()
            }
        }
    }, { immediate: true })

    return {
        state,
        walletName,
        manager,
        uri,
        qrUri,
        wallet,
        walletLasySync,
        showQR,
        qrURI,
        qrDataURI,
        connect: wrappedConnect,
        disconnect,
    }
}
