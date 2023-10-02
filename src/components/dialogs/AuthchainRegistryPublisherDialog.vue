<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Publish Registry</q-toolbar-title>
        <TokenCategory :token-id="authchainIdentity?.token?.tokenId" />
      </q-toolbar>
      <q-card-section>
        <template v-if="authchainIdentity?.token?.tokenId">
          <q-form class="q-gutter-sm">
            <q-input :filled="true" :model-value="authchainIdentity?.token?.tokenId" type="url" label="Token ID" dense
              square standout disable></q-input>
            <q-input :filled="true" v-model="form.url" type="url" label="Registry URL *" dense square standout></q-input>
            <q-input :filled="true" v-model="form.contentHash" :loading="form.isLoadingRegistry" type="url"
              label="Content hash *" dense square>
              <template v-slot:loading>
                <q-spinner-facebook color="primary" />
              </template>
              <template v-slot:append>
                <q-btn color="primary" size="sm" icon="cloud_download" no-caps flat dense
                  @click="loadRegistryHashFromUrl">
                  <q-tooltip>Resolve from the above URL</q-tooltip>
                </q-btn>
              </template>
            </q-input>
          </q-form>
        </template>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton :busy-label="authchainIdentity?.processing" label="Publish" color="primary" @click="publish"
          :disable="!form.contentHash" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';
import { AuthchainIdentity } from 'src/app';
import { fetchBcmrContentHash } from 'src/app/bcmr'
import shortenTx from 'src/app/utils/shortenTx';
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import { useEventBus } from 'src/composables';
import { shortenTokenId } from 'src/app/utils';

const $q = useQuasar()
const { $ebus } = useEventBus()
const props = defineProps<{ authchainIdentity: AuthchainIdentity, url?: string, contentHash?: string }>()
const form = ref<{ url: string, contentHash: string, isLoadingRegistry?: boolean }>({
  url: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json',
  contentHash: ''
})

onMounted(() => {
  if (props.url) {
    form.value.url = props.url
  }
  if (props.contentHash) {
    form.value.contentHash = props.contentHash
  }
})
const publish = async () => {
  try {
    const tx = await props.authchainIdentity.publish({ url: form.value.url, contentHash: form.value.contentHash })
    if (tx) {
      // $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTx(tx) })
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTx(tx) })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`
      })
    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: error.message })
  }
}

const loadRegistryHashFromUrl = () => {
  form.value.isLoadingRegistry = true
  if (form.value.url) {
    fetchBcmrContentHash(form.value.url)
      .then((v) => {
        form.value.contentHash = v as string
        form.value.isLoadingRegistry = false
      })
      .catch((e) => {
        console.log(e)
        form.value.isLoadingRegistry = false
      })
  }
}
</script>
