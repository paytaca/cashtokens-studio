<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Upload and Publish Registry</q-toolbar-title>
        <TokenCategory :token-id="authchainIdentity?.token?.tokenId" />
      </q-toolbar>
      <div class="q-mx-md text-justify">
        <q-icon name="info" color="secondary" size="md"></q-icon>
        <span>
          This dialog allows you to store a registry from file to IPFS and then publish it's URI and content hash
          on-chain.
        </span>
      </div>
      <q-card-section>
        <q-uploader @uploaded="onFileUploaded" field-name="registryFile"
          :label="uploaded ? 'BCMR file uploaded' : 'Select BCMR(registry) File'"
          :url="`api/tokens/registry-file/storage?tokenId=${authchainIdentity?.token?.tokenId}`" auto-upload flat dense
          size="sm" style="width:100%;max-width: 100%;" @uploading="() => uploading = true" :multiple="false" />
        <div class="q-mt-sm" style="max-width: 100%;overflow-x: auto;">
          <q-markup-table v-if="uploaded && uploadArtifact" flat dense>
            <thead>
              <th colspan="2" class="text-left">
                Registry IPFS upload artifacts
                <q-btn icon="content_copy" dense flat color="grey" size="sm"
                  @click="copyText(JSON.stringify(uploadArtifact))">
                  <q-tooltip>Copy Artifact</q-tooltip>
                </q-btn>
              </th>
            </thead>
            <tbody>
              <tr>
                <td>Registry Https URI</td>
                <td>{{ uploadArtifact.uris.https }}</td>
              </tr>
              <tr>
                <td>Registry IPFS URI</td>
                <td>{{ uploadArtifact.uris.ipfs }}</td>
              </tr>
              <tr>
                <td>Registry Content Hash</td>
                <td>{{ uploadArtifact.contentHash }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>

      </q-card-section>

      <q-card-actions class="row justify-end">
        <div v-if="uploading" class="row items-end text-warning">
          <i class="q-mr-xs">Storing file in IPFS. This may take a while, please wait</i><q-spinner-dots></q-spinner-dots>
        </div>
        <BusyButton v-if="uploaded" :busy-label="authchainIdentity?.processing" label="Publish" color="primary"
          @click="publish" :disable="!uploaded" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';
import { AuthchainIdentity } from 'src/app';
import shortenTx from 'src/app/utils/shortenTx';
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import { useEventBus } from 'src/composables';
import { shortenTokenId } from 'src/app/utils';
import { BcmrStorageArtifact } from 'src/app/types';
import { copyText } from 'src/app/utils';
import { useUI } from 'src/stores/ui';

const $q = useQuasar()
const { $ebus } = useEventBus()
const ui = useUI()
const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const uploaded = ref<boolean>(false)
const uploadArtifact = ref<BcmrStorageArtifact>()
const uploading = ref<boolean>(false)
const form = ref<{ url: string, contentHash: string, isLoadingRegistry?: boolean }>({
  url: '',
  contentHash: ''
})

onMounted(() => {
  console.log('OK')
})

const onFileUploaded = (info: any) => {
  try {
    uploadArtifact.value = JSON.parse(info.xhr.responseText)?.artifact
    console.log(uploadArtifact.value)
    uploading.value = false
    uploaded.value = true
  } catch (error) {
    console.log(error)
  }
}

const publish = async () => {
  if (!uploadArtifact?.value?.uris?.https) {
    return $q.notify({ type: 'negative', message: 'Missing registry url' })
  }
  if (!uploadArtifact?.value?.contentHash) {
    return $q.notify({ type: 'negative', message: 'Missing registry content hash' })
  }
  try {
    const tx = await props.authchainIdentity.publish({ url: uploadArtifact.value!.uris.https!, contentHash: uploadArtifact.value.contentHash })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTx(tx) })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`
      })
      ui.setStatusMessage({
        statusMessage: `Published ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: error.message })
  }
}

</script>
