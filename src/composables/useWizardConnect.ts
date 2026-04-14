import { initiateDappRelay, type RelayUpdatePayload } from '@wizardconnect/core';
import { getDappMgr } from 'src/apps/wizard-connect/connection-manager';
import { onMounted, ref } from 'vue';

const wzDappMgr = ref();
const wzRelayConn = ref()

export const useWizardConnect = () => {

  const wzInitiateConnection = () => {
    wzRelayConn.value = initiateDappRelay(
        (payload: RelayUpdatePayload) => {
          wzDappMgr.value.updateConnection(payload.client, payload.status);
          // also update your own UI state here (connected/disconnected indicator)
        },
        { explicitRelayUrls: ['wss://relay.cauldron.quest:443'] },
      )
  }

  onMounted(async () => {
    wzDappMgr.value = await getDappMgr(
      process.env.APP_NAME as string,
      process.env.APP_ICON_URL as string,
    );

    console.log('paths', wzDappMgr.value.getSessionPaths());
  });

  return {
    wzDappMgr,
    wzRelayConn,
    wzInitiateConnection
  }
};
