<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Release Authchain from Authguard</q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <div>
          <q-icon name="warning" color="warning"></q-icon>
          <span>
            You are about to release the authchain's identity output from the AuthGuard covenant.
            Doing so will transfer the authchain identity token to your regular wallet address.
          </span>
        </div>
        <q-form class="q-gutter-sm">
          <q-input :model-value="authchainIdentity.token?.tokenId" label="Token ID/Category" filled dense disable
            autogrow>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => console.log('Releasing authchain from authguard')" label="Unguard Authchain"
          :busyLabel="authchainIdentity.processing" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity'
import BusyButton from 'src/components/BusyButton.vue'
import { useQuasar } from 'quasar';

const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const $q = useQuasar()
const unguardAuthchain = async () => {
  try {
    const tx = await props.authchainIdentity.unguard()
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + tx })
    }
  } catch (error: any) {
    $q.notify({ type: 'positive', message: 'Txn Failed ' + error.message })
  }

}

</script>
