import { type RelayUpdatePayload } from '@wizardconnect/core';
import { useQuasar } from 'quasar';
import { getDappMgr } from 'src/apps/wizard-connect/connection-manager';
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue';
import { onMounted, ref } from 'vue';

const wzDappMgr = ref();
const wzRelayConn = ref()

export const useWizardConnect = () => {

  const $q = useQuasar()

  const wzInitiateConnection = async () => {
    const { initiateDappRelay } = await import('@wizardconnect/core')
    wzRelayConn.value = initiateDappRelay(
        (payload: RelayUpdatePayload) => {
          wzDappMgr.value.updateConnection(payload.client, payload.status);
          // also update your own UI state here (connected/disconnected indicator)
        },
        { explicitRelayUrls: ['wss://relay.cauldron.quest:443'] },
      )
    
    $q.dialog({
      component: QrCodeModal,
      componentProps: { contents: wzRelayConn.value.uri }
    })
  }

  onMounted(async () => {
    wzDappMgr.value = await getDappMgr(
      process.env.APP_NAME as string,
      process.env.APP_ICON_URL as string,
    );
  });

  return {
    wzDappMgr,
    wzRelayConn,
    wzInitiateConnection
  }
};
