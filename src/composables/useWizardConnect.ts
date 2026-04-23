import { type WalletReadyMessage, type RelayUpdatePayload, type DisconnectReason as DisconnectReasonType } from '@wizardconnect/core';
import { useQuasar } from 'quasar';
import { getDappMgr } from 'src/apps/wizard-connect/connection-manager';
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue';
import { onMounted, ref } from 'vue';

type WZWalletPath = { name: string, xpub: string}

const wzDappMgr = ref();
const wzRelayConn = ref()

export const useWizardConnect = () => {
  const $q = useQuasar()
  const modal = ref()
  const wzSession = ref()

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
    }
  });

  return {
    wzDappMgr,
    wzRelayConn,
    wzSession,
    wzInitiateConnection
  }
};
