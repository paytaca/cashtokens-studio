<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Transfer Authchain Ownership</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-form>
          <q-input v-model="newOwner" :bottom-slots="true" filled dense :rules="[(v) => (v.length >= 50 && (v.startsWith('bitcoincash') || v.startsWith('bchtest'))) ||
            'Invalid owner address']">
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <!-- <BusyButton @click="transfer" :busyLabel="authchain.processing" label="Transfer" /> -->
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar'
import { AuthchainIdentity } from 'src/app'
import { ref } from 'vue'
import BusyButton from 'src/components/BusyButton.vue'

defineOptions({ name: 'AuthchainTransferer' })
const $q = useQuasar()
const props = defineProps<{ identityOutput: AuthchainIdentity }>()
const newOwner = ref<string>()
const authchain = ref<AuthchainIdentity>(
  // new AuthchainIdentity({ ...props.identityOutput })
)
const transfer = async () => {
  authchain.value = props.identityOutput
  // const tx = await authchain.value.transfer(newOwner.value!)
  // if (tx) {
  //   $q.notify({ type: 'success', message: 'Authchain transferred' })
  // }
}
</script>
