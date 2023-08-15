<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Burn Authhead</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-form>
          <q-input :model-value="authchainIdentity.token?.tokenId" disable label="Token ID/Category"></q-input>
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
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import shortenTokenId from 'src/utils/shortenTokenId';
import BusyButton from 'src/components/BusyButton.vue'
import { ref } from 'vue';

defineOptions({ name: 'AuthchainBurner' })
const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const $q = useQuasar()

const burn = async () => {
  try {
    const tx = await props.authchainIdentity.burn()
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!' + shortenTokenId(tx) })
    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Failed!' + error.message })
  }
}
</script>
