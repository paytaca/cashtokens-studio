<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Transfer AuthKey</q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-banner rounded>

          <div class="text-center">
            <q-icon name="warning" color="warning"></q-icon>
            <span class="q-ml-sm">Warning! You are about to transfer an AuthKey. This will
              transfer permissions
              to manage
              any tokens locked by
              this key.</span>
          </div>
        </q-banner>
        <q-form class="q-gutter-sm">
          <q-input :model-value="authKey.token?.tokenId" label="AuthKey ID" filled dense disable></q-input>
          <q-input v-model="form.recipient" label="Recipient" filled dense></q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => transferAuthKey()" label="Transfer AuthKey" :busyLabel="authKey.processing" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';
import AuthNFT from 'src/models/AuthNFT';
import { ref } from 'vue';
import BusyButton from 'src/components/BusyButton.vue'

defineOptions({ name: 'FungibleTokenIssuerDialog' })
const $q = useQuasar()
const props = defineProps<{ authKey: AuthNFT }>()
defineEmits<{
  (e: 'authKeyTransferred', val: { tokenId: string, to: string, amount: string }): void
}>()

const form = ref<{ recipient: string }>({
  recipient: ''
})

const transferAuthKey = async () => {
  console.log('Transferring authkey')
  try {
    const tx = await props.authKey.transfer({ recipient: form.value.recipient })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx' + tx })
    }
  } catch (error: any) {
    $q.notify({ type: 'negative', message: 'Error!' + error.message })
  }
}

</script>
