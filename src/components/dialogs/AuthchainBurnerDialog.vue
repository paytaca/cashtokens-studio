<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5">Burn Token Identity</q-toolbar-title>
      </q-toolbar>
      <div class="q-mx-md text-justify">
        <q-icon name="warning" color="warning" size="md"></q-icon>
        <span>
          Warning! This action will burn this token (token of the utxo will be discarded).
          Any fungible token amount and/or minting capability will be lost. This will also
          burn this token identity's on-chain registry
          <q-btn href="https://github.com/bitjson/chip-bcmr#burned-identities" target="_blank" dense flat no-caps
            color="secondary" icon="info" />
        </span>
      </div>
      <q-card-section>
        <q-form>
          <q-input :model-value="authchainIdentity.token?.tokenId" disable label="Token ID/Category"></q-input>
          <q-input :model-value="authchainIdentity.token?.amount" disable label="Fungible Reserves"></q-input>
          <q-input :model-value="authchainIdentity.token?.capability" disable label="NFT Capability"></q-input>
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
import shortenTx from 'src/app/utils/shortenTx';
import BusyButton from 'src/components/BusyButton.vue'

defineOptions({ name: 'AuthchainBurner' })
const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const $q = useQuasar()

const burn = async () => {
  try {
    const tx = await props.authchainIdentity.burn()
    if (tx) {
      // $q.notify({ type: 'positive', message: 'Success!' + shortenTx(tx) })
      $q.notify({ type: 'positive', message: 'Success!' + tx })
    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Failed!' + error.message })
  }
}
</script>
