<template>
  <q-dialog ref="dialogElRef" v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Release Authchain from Authguard</q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <div class="q-mx-md text-justify">
          <q-icon name="warning" color="warning" size="md"></q-icon>
          <span class="text-wrap">
            You are about to release the authchain's identity output from the AuthGuard covenant.
            Doing so will transfer the authchain identity token to your regular token wallet address.
          </span>
        </div>
        <q-form class="q-gutter-sm">
          <q-input :model-value="authchainIdentity.token?.tokenId" label="Token ID/Category" filled dense disable
            autogrow>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => unguardAuthchain()" :busyLabel="authchainIdentity.processing" label="Unguard Authchain"
          color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { Ref, ref } from 'vue';
import { AuthchainIdentity } from 'src/app'
import BusyButton from 'src/components/BusyButton.vue'
import { useQuasar } from 'quasar';
import shortenTx from 'src/app/utils/shortenTx';
import { useEventBus } from 'src/composables';
import { shortenTokenId } from 'src/app/utils';
import { useUI } from 'src/stores/ui';


const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const emit = defineEmits<{
  (e: 'identityUnguarded'): void
}>()
const $q = useQuasar()
const ui = useUI()
const { $ebus } = useEventBus()
const dialogElRef = ref()

const unguardAuthchain = async () => {
  try {
    const tx = await props.authchainIdentity.unguard()
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTx(tx) })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.unguard',
        timestamp: new Date().getTime(),
        successMsg: `Released ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)} from AuthGuard`
      })
      emit('identityUnguarded')
      dialogElRef.value?.hide()
      ui.setStatusMessage({
        statusMessage: `Released ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)} from AuthGuard`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
    }
  } catch (error: any) {
    console.log(error)
    ui.setStatusMessage({
      statusMessage: `Error! ${error.message}`,
      statusMessageType: 'error',
    })
    $q.notify({ type: 'positive', message: 'Txn Failed ' + error.message })
  }

}

</script>
