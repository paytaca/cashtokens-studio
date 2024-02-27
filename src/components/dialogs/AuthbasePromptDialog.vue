<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Publish Registry">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold q-mb-sm">
          <q-icon name="priority_high" color="warning"></q-icon>
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div>
          <p class="text-justify text-grey-4">
            CashTokens Studio is unable to locate the registry because you're using a
            non-token UTXO as authhead. By default, Cashtokens Studio
            uses the authhead UTXO's Token ID as authbase to be able to load the metadata.
          </p>
          <p class="text-justify text-grey-4">
            You can paste the
            authbase or
            Token ID here we'll locate the last published metadata for you.
          </p>
          <q-form class="q-gutter-sm">
            <div class="col-xs-12 col-md-8 q-my-lg q-gutter-y-sm items-center">
              <label>Authbase/Token ID</label>
              <q-input class="registry-field" v-model="authbase" placeholder="Paste authbase or token ID here" outlined
                autofocus></q-input>
            </div>
          </q-form>
        </div>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn @click.stop="onDialogHide()" text-color="negative">Cancel</q-btn>
        <q-btn @click.stop="onDialogOK(authbase)" text-color="primary">Ok</q-btn>
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { ref } from 'vue'
import { useEventBus } from 'src/composables'
import { useUI } from 'src/stores/ui'
import BusyButton from 'src/components/BusyButton.vue'

const $q = useQuasar()
const ui = useUI()
defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const authbase = ref<string>()



</script>