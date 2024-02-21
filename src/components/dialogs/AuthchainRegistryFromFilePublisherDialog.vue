<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar class="flex-reverse">
        <q-toolbar-title class="col-12 text-h5 text-bold q-mb-md" style="text-wrap:wrap">Upload and Publish
          Registry
        </q-toolbar-title>
      </q-toolbar>

      <div class="rounded bordered">
        <q-avatar class="q-ma-sm" v-if="authchainIdentity.identitySnapshot?.uris?.icon">
          <img :src="authchainIdentity.identitySnapshot?.uris?.icon" alt="">
        </q-avatar>
        <span v-if="authchainIdentity.identitySnapshot?.token?.symbol" class="q-ma-sm text-bold">{{
          authchainIdentity.identitySnapshot?.token?.symbol }} </span>

        <!-- <TokenCategory :token-id="authchainIdentity.identitySnapshot?.token?.category" /> -->
      </div>

      <div class="q-ma-md text-justify">
        <q-icon name="info" color="secondary" size="sm"></q-icon>
        <span>
          Upload your token's registry (BCMR) file to IPFS and publish it's URI and content hash
          on-chain.
        </span>
      </div>
      <q-card-section>
        <q-uploader @uploaded="onFileUploaded" field-name="registryFile"
          :label="uploaded ? 'BCMR file uploaded' : 'Click + to select file'"
          :url="`api/tokens/registry-file/storage?tokenId=${authchainIdentity.identitySnapshot?.token?.category}`"
          auto-upload flat dense size="sm" style="width:100%;max-width: 100%;" @uploading="() => uploading = true"
          :multiple="false" color="dark" />
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
          @click="publish" :disable="!uploaded || Boolean(authchainIdentity?.processing)" />
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
const emit = defineEmits<{
  (e: 'registryPublished', val: { tokenId: string }): void
}>()
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
        successMsg: `Published ${props.authchainIdentity.identitySnapshot?.token?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`
      })
      emit('registryPublished', { tokenId: props.authchainIdentity!.token!.tokenId })
      ui.setStatusMessage({
        statusMessage: `Published ${props.authchainIdentity.identitySnapshot?.token?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
    }
  } catch (error: any) {
    console.log(error)
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error'
    })
    $q.notify({ type: 'negative', message: error.message })
  }
}

</script>
