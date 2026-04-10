<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Publish Registry">
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end">
        <q-btn flat color="negative" icon="close" v-close-popup></q-btn>
      </div>
      <q-avatar class="q-mx-sm" v-if="authhead.identitySnapshot?.uris?.icon">
        <img :src="authhead.identitySnapshot?.uris?.icon" alt="" />
      </q-avatar>
      <span
        v-if="authhead.identitySnapshot?.token?.symbol"
        class="q-mx-sm text-bold"
        >{{ authhead.identitySnapshot?.token?.symbol }}
      </span>
      <q-toolbar>
        <q-toolbar-title
          class="text-h5 text-bold q-mb-md"
          style="text-wrap: wrap"
        >
          Publish Registry
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="q-mt-sm" style="max-width: 100%; overflow-x: auto">
          <template v-if="authhead?.token?.tokenId">
            <q-form class="q-gutter-sm">
              <q-input
                :filled="true"
                :model-value="authhead?.token?.tokenId"
                type="url"
                label="Token ID"
                dense
                square
                standout
                disable
              ></q-input>
              <q-input
                :filled="true"
                v-model="form.url"
                @change="onUrlChange"
                type="url"
                label="Registry URL *"
                dense
                square
                standout
                :disable="Boolean(authhead?.processing)"
                clearable
              ></q-input>
              <q-input
                :filled="true"
                v-model="form.contentHash"
                :loading="form.isLoadingRegistry"
                type="url"
                label="Content hash *"
                dense
                square
                :disable="Boolean(authhead?.processing)"
              >
                <template v-slot:loading>
                  <q-spinner-facebook color="primary" />
                </template>
                <template v-slot:append>
                  <q-btn
                    color="primary"
                    size="sm"
                    no-caps
                    flat
                    dense
                    @click="loadRegistryHashFromUrl"
                    disable
                  >
                    <q-tooltip>Resolve from the above URL</q-tooltip>
                  </q-btn>
                </template>
              </q-input>
            </q-form>
          </template>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <BusyButton
          :busy-label="authhead?.processing"
          label="Publish"
          color="primary"
          @click="publish"
          :disable="Boolean(authhead?.processing)"
        />
        <q-btn v-if="uploaded" text-color="primary" label="Ok" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';
import { stringify } from 'querystring';
import { AuthchainIdentity, Bcmr, ChainGraph } from 'src/apps';
import { fetchBcmrContentHash } from 'src/apps/bcmr';
import { shortenTokenId, shortenTx } from 'src/apps/utils';
import { BcmrStorageArtifact } from 'src/apps/types';
import { copyText } from 'src/apps/utils';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import TokenCategory from 'src/components/TokenCategory.vue';
import BusyButton from 'src/components/BusyButton.vue';
import { delay } from 'mainnet-js';
const { $ebus } = useEventBus();

const $q = useQuasar();
const ui = useUI();
const form = ref<{
  url: string;
  contentHash: string;
  isLoadingRegistry?: boolean;
}>({
  url: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json',
  contentHash: '',
});
const props = defineProps<{
  authhead: AuthchainIdentity;
  httpsUri?: string;
  ipfsUri?: string;
  contentHash?: string;
  unattended?: boolean;
}>();
const uploaded = ref<boolean>(false);
defineEmits([...useDialogPluginComponent.emits]);
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

onMounted(async () => {
  if (props.unattended && props.httpsUri && props.contentHash) {
    form.value.url = props.httpsUri;
    form.value.contentHash = props.contentHash;
    await publish();
  }
});

const onUrlChange = async () => {
  loadRegistryHashFromUrl();
};

const publish = async () => {
  // read the bcmr
  // get the category being updated
  // get the authhead of this category in chaingraph
  // if the authhead of this category is not this authhead, then unauthorized
  // TODO: Do this in the server
  let tokenId: string | undefined;

  let d = $q.dialog({
    message: 'Checking the registry from the provided URL',
    class: 'q-pa-lg',
    ok: false,
    progress: true,
    persistent: true,
  });

  try {
    await delay(1000);
    const resp = await fetch(form.value.url);
    d.hide();

    if (resp.status == 200) {
      const bcmr = new Bcmr({ ...(await resp.json()) });
      for (const authbase of bcmr.getAuthbase()) {
        if (bcmr.getIdentityHistory(authbase)[0]) {
          tokenId = bcmr.getIdentitySnapshot(
            authbase,
            bcmr.getIdentityHistory(authbase)[0],
          )?.token?.category;
        }
      }
    } else {
      await new Promise((res) => {
        $q.dialog({
          message:
            'Error fetching registry from the provided URL, make sure the URL is correct.',
          progress: false,
        }).onDismiss(() => res(null));
      });
      return;
    }
  } catch (error) {
    await new Promise((res) => {
      $q.dialog({
        message:
          'Error fetching registry from the provided URL, make sure the URL is correct.',
        progress: false,
        class: 'q-pa-lg',
      }).onDismiss(() => res(null));
    });
    return;
  }
  if (!tokenId) {
    await new Promise((res) => {
      $q.dialog({
        message: 'No token category found on the registry',
        progress: false,
        class: 'q-pa-lg',
      }).onDismiss(() => res(null));
    });
    return;
  }

  const trackedAuthhead = await new ChainGraph().fetchAuthheadTxid(tokenId);
  if (trackedAuthhead != props.authhead.txid) {
    await new Promise((res) => {
      $q.dialog({
        message: `This UTXO is not authorized to publish metadata for token ${shortenTokenId(tokenId)}`,
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg',
      }).onDismiss(() => res(null));
    });
    return;
  }

  try {
    const tx = await props.authhead.publish({
      url: form.value.url,
      contentHash: form.value.contentHash,
    });
    if (tx) {
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'authhead.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${props.authhead.identitySnapshot?.token?.symbol || shortenTokenId(props.authhead.token!.tokenId)}'s registry`,
      });

      ui.setStatusMessage({
        statusMessage: `Published ${props.authhead.identitySnapshot?.token?.symbol || shortenTokenId(props.authhead.token!.tokenId)}'s registry`,
        statusMessageType: 'success',
        statusMessageTxid: tx,
      });
      onDialogOK(tx);
    }
  } catch (error: any) {
    console.log(error);
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    });
    $q.notify({ type: 'negative', message: error.message });
  }
};

const loadRegistryHashFromUrl = () => {
  form.value.isLoadingRegistry = true;
  if (form.value.url) {
    fetchBcmrContentHash(form.value.url)
      .then((v) => {
        form.value.contentHash = v as string;
        form.value.isLoadingRegistry = false;
      })
      .catch((e) => {
        console.log(e);
        form.value.isLoadingRegistry = false;
      });
  }
};
</script>
