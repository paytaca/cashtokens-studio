import { DisconnectReason, type PathXpub, type ProtocolMessage, type WalletReadyMessage } from '@wizardconnect/core'
import { useWizardConnect } from 'wizardconnect-vue'
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'
import { WizardConnectExternalWallet } from 'src/core/wallet'

const wallet = shallowRef(new WizardConnectExternalWallet({ network: import.meta.env.VITE_BCH_NETWORK}))
const walletLasySync = ref<number>()
const showQR = ref(false)
const qrURI = ref<string | null>(null)
const qrDataURI = ref<string | null>(null)

let _wc: ReturnType<typeof useWizardConnect> | null = null
let _watcherSetup = false

const walletIsReady = computed(() => {
    return wallet.value?.ready
})

export const useWizardConnectWallet = () => {

    if (!_wc) {
        _wc = useWizardConnect({
            dappName: import.meta.env.VITE_APP_NAME as string,
            dappIcon: import.meta.env.VITE_APP_ICON_URL as string,
            relayUrls: ['wss://relay.riften.net:443', 'wss://relay.cauldron.quest:443']
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
                qrURI.value = newUri as any
                qrDataURI.value = qrUri.value
                showQR.value = true
            }
        })
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
        manager,
        uri,
        qrUri,
        wallet,
        walletLasySync,
        walletIsReady,
        showQR,
        qrURI,
        qrDataURI,
        connect: wrappedConnect,
        disconnect,
    }
}
