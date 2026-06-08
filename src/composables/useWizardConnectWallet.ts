import { DisconnectReason, type PathXpub, type ProtocolMessage, type WalletReadyMessage } from '@wizardconnect/core'
import { useWizardConnect } from 'wizardconnect-vue'
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { WizardConnectExternalWallet } from 'src/core/wallet'

const wallet = shallowRef(new WizardConnectExternalWallet())
const walletLasySync = ref<number>()

let _wc: ReturnType<typeof useWizardConnect> | null = null

export const useWizardConnectWallet = () => {

    if (!_wc) {
        _wc = useWizardConnect({
            dappName: import.meta.env.VITE_APP_NAME as string,
            dappIcon: import.meta.env.VITE_APP_ICON_URL as string,
        })
    }

    const {
        state,
        manager,
        walletName, uri, qrUri, connect, disconnect,
    } = _wc

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
                wallet.value.getBalance({ sync: true })
                walletLasySync.value = Date.now()
            }
        }
    })

    return {
        state,
        walletName,
        manager,
        uri,
        qrUri,
        wallet,
        walletLasySync,
        connect: wrappedConnect,
        disconnect,
    }
}
