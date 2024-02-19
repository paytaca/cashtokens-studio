<template>
  <q-dialog ref="authchainBurnerDialogRef" v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-avatar class="q-mx-sm" v-if="authchainIdentity.tokenUris?.icon">
        <img :src="authchainIdentity.tokenUris?.icon" alt="">
      </q-avatar>
      <span v-if="authchainIdentity.tokenCategory?.symbol" class="q-mx-sm text-bold">{{
        authchainIdentity.tokenCategory?.symbol }} </span>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Burn Token Identity</q-toolbar-title>
      </q-toolbar>
      <div class="q-mx-md text-justify">
        <q-icon name="warning" color="warning" size="sm"></q-icon>
        <span>
          Warning! This action will burn this token (token of the utxo will be discarded).
          Any fungible token amount and/or minting capability will be lost. This will also
          burn this token identity's AuthHead, this means you'll no longer be able to publish
          an update to the registry.
          <q-btn href="https://github.com/bitjson/chip-bcmr#burned-identities" target="_blank" dense flat no-caps
            color="grey-8" icon="info" size="sm" />
        </span>
      </div>
      <q-card-section>
        <q-form class="row q-gutter-sm">
          <q-input class="col-12" :model-value="authchainIdentity.token?.tokenId" disable label="Token ID/Category"
            filled></q-input>
          <q-input class="col-12" :model-value="authchainIdentity.token?.amount?.toString()" disable
            label="Fungible Reserves" filled></q-input>
          <q-input class="col-12" :model-value="authchainIdentity.token?.capability" disable label="NFT Capability"
            filled></q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton color="primary" :busy-label="authchainIdentity.processing" label="Burn" @click="burn()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';
import { AuthchainIdentity } from 'src/app';
import { shortenTokenId } from 'src/app/utils';
import shortenTx from 'src/app/utils/shortenTx';
import BusyButton from 'src/components/BusyButton.vue'
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { ref } from 'vue';
defineOptions({ name: 'AuthchainBurner' })

const $q = useQuasar()
const { $ebus } = useEventBus()
const ui = useUI()
const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const authchainBurnerDialogRef = ref()
const emit = defineEmits<{
  (e: 'identityBurned'): void
}>()

const burn = async () => {
  try {
    const tx = await props.authchainIdentity.burn()
    if (tx) {
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.burn',
        timestamp: new Date().getTime(),
        successMsg: `Burned ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s token category`
      })

      authchainBurnerDialogRef.value?.hide()
      ui.setStatusMessage({
        statusMessage: `Burned ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)}'s token category`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
      emit('identityBurned')

    }
  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    })
    $q.notify({ type: 'negative', message: 'Failed!' + error.message })
  }
}
</script>
