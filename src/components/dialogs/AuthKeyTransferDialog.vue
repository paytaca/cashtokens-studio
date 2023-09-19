<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5">Transfer AuthKey</q-toolbar-title>
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
          <q-input v-model="form.recipient" label="Recipient's Token Address" filled dense></q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => transferAuthKey()" label="Transfer AuthKey" :busyLabel="authKey.processing"
          color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';
import { AuthKey } from 'src/app';
import { ref } from 'vue';
import BusyButton from 'src/components/BusyButton.vue'
import { useUser } from 'src/stores/user';
import { Wallet } from 'mainnet-js';
import shortenTokenId from 'src/app/utils/shortenTokenId';

defineOptions({ name: 'FungibleTokenIssuerDialog' })
const $q = useQuasar()
const user = useUser()
const props = defineProps<{ authKey: AuthKey }>()
defineEmits<{
  (e: 'authKeyTransferred', val: { tokenId: string, to: string, amount: string }): void
}>()

const form = ref<{ recipient: string }>({
  recipient: ''
})

const transferAuthKey = async () => {
  try {
    const tx = await props.authKey.transfer(form.value.recipient)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx' + shortenTokenId(tx) })
    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error!' + error.message })
  }
}

</script>
