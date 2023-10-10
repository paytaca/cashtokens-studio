<template>
  <q-dialog ref="authKeyTransferDialog">
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Transfer AuthKey</q-toolbar-title>
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
          color="primary" :disable="!Boolean(form.recipient)" />
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
import { Wallet, fromUtxoId } from 'mainnet-js';
import shortenTokenId from 'src/app/utils/shortenTokenId';
import { useEventBus } from 'src/composables';
import { shortenAddress } from 'src/app/utils';

defineOptions({ name: 'FungibleTokenIssuerDialog' })
const $q = useQuasar()
const { $ebus } = useEventBus()
const props = defineProps<{ authKey: AuthKey }>()
const authKeyTransferDialog = ref()
const emit = defineEmits<{
  (e: 'authKeyTransferred'): void
}>()

const form = ref<{ recipient: string }>({
  recipient: ''
})

const transferAuthKey = async () => {
  try {

    const tx = await props.authKey.transfer(form.value.recipient)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx' + shortenTokenId(tx) })

      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.releaseTokensFromReserveSupply',
        timestamp: new Date().getTime(),
        successMsg: `Transferred AuthKey, id=${shortenTokenId(props.authKey.token!.tokenId)} to ${shortenAddress(form.value.recipient)}`
      })
      emit('authKeyTransferred')
      authKeyTransferDialog.value.hide()

    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error!' + error.message })
  }
}

</script>
