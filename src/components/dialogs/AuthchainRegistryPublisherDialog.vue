<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-avatar class="q-mx-sm" v-if="authchainIdentity.tokenUris?.icon">
        <img :src="authchainIdentity.tokenUris?.icon" alt="">
      </q-avatar>
      <span v-if="authchainIdentity.tokenCategory?.symbol" class="q-mx-sm text-bold">{{
        authchainIdentity.tokenCategory?.symbol }} </span>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Publish Registry</q-toolbar-title>
        <TokenCategory :token-id="authchainIdentity?.token?.tokenId" />
      </q-toolbar>
      <q-card-section>
        <template v-if="authchainIdentity?.token?.tokenId">
          <q-form class="q-gutter-sm">
            <q-input :filled="true" :model-value="authchainIdentity?.token?.tokenId" type="url" label="Token ID" dense
              square standout disable></q-input>
            <q-input :filled="true" v-model="form.url" type="url" label="Registry URL *" dense square standout
              :disable="Boolean(authchainIdentity?.processing)" clearable></q-input>
            <q-input :filled="true" v-model="form.contentHash" :loading="form.isLoadingRegistry" type="url"
              label="Content hash *" dense square :disable="Boolean(authchainIdentity?.processing)">
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
          :disable="Boolean(authchainIdentity?.processing) || !form.contentHash" />
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
import { fetchAuthChainAuthheadFromChainGraph, fetchAuthhead, shortenTokenId } from 'src/app/utils';
import { useUI } from 'src/stores/ui';
import { BCMR, Network } from 'mainnet-js';

const $q = useQuasar()
const ui = useUI()
const emit = defineEmits<{
  (e: 'registryPublished', val: { tokenId: string }): void
}>()
const { $ebus } = useEventBus()
const props = defineProps<{ authchainIdentity: AuthchainIdentity, url?: string, contentHash?: string }>()
const form = ref<{ url: string, contentHash: string, isLoadingRegistry?: boolean }>({
  url: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json',
  contentHash: ''
})

onMounted(async () => {
  if (props.url) {
    form.value.url = props.url
  }
  if (props.contentHash) {
    form.value.contentHash = props.contentHash
  }

  const authhead = await fetchAuthChainAuthheadFromChainGraph({
    chaingraphUrl: 'https://gql.chaingraph.pat.mn/v1/graphql',
    transactionHash: props.authchainIdentity.token?.tokenId || props.authchainIdentity.txid,
    network: props.authchainIdentity.ownerWallet!.network
  })
  // TODO: authenticate authchainIdentity check if it's the authhead, show Authentication Failure dialog if not.
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

      ui.setStatusMessage({
        statusMessage: `Published ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s registry`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
      emit('registryPublished', { tokenId: props.authchainIdentity!.token!.tokenId })
    }
  } catch (error: any) {
    console.log(error)
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    })
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
