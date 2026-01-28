<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar class="flex-reverse">
        <q-toolbar-title class="col-12 text-h5 text-bold q-mb-md" style="text-wrap:wrap">Publish BCMR File
        </q-toolbar-title>
      </q-toolbar>
      <div class="rounded bordered">
        <q-avatar class="q-ma-sm" v-if="authchainIdentity.identitySnapshot?.uris?.icon">
          <img :src="authchainIdentity.identitySnapshot?.uris?.icon" alt="">
        </q-avatar>
      </div>
      <div class="q-ma-md text-justify">
        <q-icon name="info"></q-icon>
        <span>
          If you have a BCMR file for this token, you can upload and publish it here.
        </span>
      </div>
      <q-card-section>
        <label>{{ bcmrFileUploading ? 'Uploading' : '' }}
          <q-spinner-dots v-if="bcmrFileUploading" color="warning" class="q-mr-sm">
          </q-spinner-dots>
        </label>
        <q-file ref="bcmrFileRef" v-model="bcmrFile" accept=".json"
          @rejected="() => $q.dialog({ message: 'File, rejected. Please attach a json file.' })"
          :disable="bcmrFileUploading" label="Click here to select BCMR file" outlined bottom-slots>
          <template v-slot:prepend>
            <q-icon name="attach_file"></q-icon>
          </template>
        </q-file>
        <div class="q-mt-sm" style="max-width: 100%;overflow-x: auto;">
          <q-markup-table v-if="uploadArtifact" flat dense>
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
      <q-card-actions class="row justify-end q-gutter-x-md">
        <q-btn v-if="!progress && !authchainIdentity?.processing" text-color="negative" size="lg" label="Cancel"
          @click="onDialogHide()"></q-btn>
        <BusyButton v-if="uploadArtifact" :busy-label="progress || authchainIdentity?.processing" label="Publish"
          color="primary" @click="publish"
          :disable="!uploadArtifact || Boolean(authchainIdentity?.processing) || Boolean(progress)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { ref, watch, nextTick } from 'vue'
import { AuthchainIdentity, ChainGraph } from 'src/apps'
import { shortenTokenId } from 'src/apps/utils'
import { BcmrStorageArtifact } from 'src/apps/types'
import { copyText } from 'src/apps/utils'
import { useEventBus } from 'src/composables'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import BusyButton from 'src/components/BusyButton.vue'
import { Registry } from 'mainnet-js'
import { Draft07 } from 'json-schema-library'
import bcmrSchema from 'src/apps/bcmr/bcmr-schema.json'
import { upload as uploadToIPFS } from 'src/apps/ipfs'


defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $q = useQuasar()
const { $ebus } = useEventBus()
const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const bcmrFile = ref()
const bcmrFileUploading = ref<boolean>()
const bcmrFileRef = ref()
const uploadArtifact = ref<BcmrStorageArtifact>()
const progress = ref<string>()

watch(() => bcmrFile.value, async (v) => {
  if (v) {
    await uploadBCMR()
  }
})

const uploadBCMR = async () => {
  if (bcmrFile.value) {

    const d = new Draft07(bcmrSchema)
    const errors: any = d.validate(JSON.parse(await bcmrFile.value.text()))
    let proceed = true
    if (errors.length > 0) {
      proceed = await new Promise((resolv) => {
        $q.dialog({
          title: 'BCMR Validation Error!',
          message: errors[0].message || 'Format error! Make sure the value conforms to BCMR\'s NftType spec. If you\'re using the `extensions` field, make sure it has a maximum nesting depth of 2 and only has `string` values. Example: {"extensions": "value"}, {"extensions": {"key":"value"}}',
          class: 'q-pa-lg text-justify'
        }).onDismiss(() => {
          resolv(false)
        })
      })
    }

    if (!proceed) return

    try {
      progress.value = 'Uploading...'
      // const formData = new FormData();
      // formData.append('registryFile', bcmrFile.value);
      bcmrFileUploading.value = true
      // const resp = await fetch(`api/tokens/registry-file/storage?tokenId=${props.authchainIdentity.identitySnapshot?.token?.category}`, {
      //   method: 'POST', body: formData
      // })
      // const respJ = await resp.json()
      uploadArtifact.value = await uploadToIPFS(bcmrFile.value, { tokenId: props.authchainIdentity.identitySnapshot?.token?.category }) as BcmrStorageArtifact

    } catch (error) {
      console.log(error)
    } finally {
      bcmrFileUploading.value = false
      progress.value = ''
    }
  }
}

const authenticate = async (authhead: AuthchainIdentity, registry: Registry) => {
  const identities = Object.keys(registry.identities || {})
  let authenticated = true
  identitySearch:
  for (const authbase of identities) {
    const timestamps = Object.keys(registry.identities![authbase] || {})
    for (const t of timestamps) {
      const snapshot = registry.identities![authbase][t]
      if (snapshot) {
        const trackedAuthhead = await (new ChainGraph()).fetchAuthheadTxid(snapshot.token!.category)
        if (trackedAuthhead != authhead.txid) {
          await new Promise(res => {
            $q.dialog({
              message: `This UTXO is not authorized to publish metadata for token ${shortenTokenId(snapshot.token!.category)}`,
              ok: true,
              focus: 'ok',
              class: 'q-pa-lg'
            }).onDismiss(() => res(null))
          })
          authenticated = false
          break identitySearch
        }
      }
    }
  }
  return authenticated
}

const publish = async () => {

  progress.value = 'Verifying authhead'
  const authenticated = await authenticate(props.authchainIdentity, JSON.parse(await bcmrFile.value.text()))
  progress.value = ''
  if (!authenticated) {
    return
  }
  try {

    const tx = await props.authchainIdentity.publish({ url: [uploadArtifact.value!.uris.ipfs!, uploadArtifact.value!.uris.https!], contentHash: uploadArtifact.value!.contentHash })
    if (tx) {
      progress.value = 'Awaiting confirmation'
      await props.authchainIdentity.ownerWallet?.waitForTransaction({ txHash: tx })

      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${props.authchainIdentity.identitySnapshot?.token?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`
      })

      nextTick(() => {
        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `Published ${props.authchainIdentity.identitySnapshot?.token?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`,
            txid: tx
          }
        }).onDismiss(() => {
          onDialogOK({ authbase: props.authchainIdentity.identitySnapshot?.token?.category, tx: tx })
        })
      })

    }
  } catch (error: any) {
    $q.dialog({
      message: error?.toString() || 'Error publishing registry.',
      progress: false,
      class: 'q-pa-lg'
    }).onDismiss(() => onDialogOK(null))

  } finally {
    progress.value = ''
  }
}

</script>