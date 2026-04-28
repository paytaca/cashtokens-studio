import { type WalletReadyMessage, type RelayUpdatePayload, type DisconnectReason as DisconnectReasonType, Hdwalletv1Session } from '@wizardconnect/core';
import BigNumber from 'bignumber.js';
import { publicKeyToP2pkhCashAddress } from 'bitauth-libauth-v3';
import { HDWallet, Utxo } from 'mainnet-js-v3';
import { useQuasar } from 'quasar';
import { getHDWalletClass } from 'src/apps/utils';
import { getDappMgr } from 'src/apps/wizard-connect/connection-manager';
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue';
import { onMounted, ref } from 'vue';

type WZWalletPath = { name: string, xpub: string}
type WZWallet = {
  receive: HDWallet,
  change: HDWallet,
  defi: HDWallet,
  balance: bigint
}

const wzDappMgr = ref();
const wzRelayConn = ref()

export const useWizardConnect = () => {
  const $q = useQuasar()
  const modal = ref()
  const wzSession = ref()
  const wzWallet = ref<WZWallet>()

  const wzInitiateConnection = async () => {
    const { initiateDappRelay } = await import('@wizardconnect/core')
    wzRelayConn.value = initiateDappRelay(
        (payload: RelayUpdatePayload) => {
          wzDappMgr.value.updateConnection(payload.client, payload.status);
        },
        { explicitRelayUrls: ['wss://relay.cauldron.quest:443'] },
      )

    modal.value = $q.dialog({
      component: QrCodeModal,
      componentProps: { contents: wzRelayConn.value.uri }
    })

    wzDappMgr.value.attachRelay(wzRelayConn.value)

    wzDappMgr.value.on("walletready", (msg: WalletReadyMessage) => {
      if (msg.action === 'wallet_ready') {
        modal.value?.hide()
        wzDappMgr.value.pushDappReady()
      }
    })

    // Listen for wallet-initiated disconnect or protocol mismatch:
    const { DisconnectReason } = await import('@wizardconnect/core')
    wzDappMgr.value.on("disconnect", (reason: DisconnectReasonType, msg: WalletReadyMessage) => {
      if (reason === DisconnectReason.ProtocolMismatch) {
        console.error("Protocol mismatch:", msg);
      } else {
        console.log("Wallet disconnected:", reason, msg);
      }
      wzRelayConn.value?.cleanup();
      wzDappMgr.value?.clearStoredSession();
    });
  }

  onMounted(async () => {
    const { loadSession } = await import('@wizardconnect/dapp')
    if (!wzDappMgr.value) {
      wzDappMgr.value = await getDappMgr(
        process.env.APP_NAME as string,
        process.env.APP_ICON_URL as string,
      );
      wzSession.value = loadSession()

      const receiveXPub = wzSession.value.paths.find((p: WZWalletPath) => p.name === 'receive').xpub
      const changeXPub = wzSession.value.paths.find((p: WZWalletPath) => p.name === 'change').xpub
      const defiXPub = wzSession.value.paths.find((p: WZWalletPath) => p.name === 'defi').xpub

      const HDWalletClass = await getHDWalletClass()
      const receiveWallet = await HDWalletClass.fromXPub(receiveXPub)
      const changeWallet = await HDWalletClass.fromXPub(changeXPub)
      const defiWallet = await HDWalletClass.fromXPub(defiXPub)
      wzWallet.value = {
        receive: receiveWallet,
        change: changeWallet,
        defi: defiWallet,
        balance: 0n
      }

      const utxoRequests = [
        { name: 'receive', req: receiveWallet.getUtxos() },
        { name: 'change', req: changeWallet.getUtxos() },
        { name: 'defi', req: defiWallet.getUtxos() }
      ]
      
      const utxoPromiseResults = await Promise.allSettled([...utxoRequests.map((r) => r.req)])

      let utxos: Utxo[] = []
      
      for (const i in utxoRequests) {
        if(utxoPromiseResults[i].status === 'rejected') continue
        utxos = utxos.concat((utxoPromiseResults[i] as PromiseFulfilledResult<Utxo[]>).value.map((u: Utxo) => ({ ...u, pathName: utxoRequests[i].name })))
      }
      const utxoMap = new Map()
      const balance = utxos.reduce((acc, next) => {
        if (next.token) return acc
        if(utxoMap.has(`${next.txid}:${next.vout}`)) return acc
        utxoMap.set(`${next.txid}:${next.vout}`, next)
        acc = acc + next.satoshis
        return acc
      }, 0n)
      wzWallet.value.balance = balance
    }
  });

  return {
    wzDappMgr,
    wzRelayConn,
    wzSession,
    wzWallet,
    wzInitiateConnection
  }
};
