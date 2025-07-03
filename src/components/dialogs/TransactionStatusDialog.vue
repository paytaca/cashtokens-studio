<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Add NFT Attribute">
    <q-card class="q-dialog-plugin q-pa-md">
      <q-card-section>
        <div class="row justify-center">
          <q-avatar size="5em" class="col-12">
            <q-icon size="2em" :name="icon.name" :color="icon.color"></q-icon>
          </q-avatar>
          <div class="col-12 text-center text-wrap q-py-sm q-py-sm"
            style="max-width:100%;text-wrap: wrap;overflow-wrap: normal;">
            {{ statusText }}
          </div>
          <div class="col-12 text-center text-wrap q-py-sm"
            style="max-width:100%;text-wrap: wrap;overflow-wrap: normal;">
            <q-btn v-if="statusType !== 'pending'" :href="openTxInExplorer(txid)" target="_blank" flat dense
              color="secondary" label="View Tx in Explorer" />
            <div v-if="statusType !== 'pending'">Tx: {{ shortenTx(txid) }} <q-btn dense icon="content_copy" size="xs"
                @click.stop="copyText(txid)"></q-btn>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="center">
        <q-btn text-color="primary" size="lg" label="OK" @click="ok" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { computed, ref } from 'vue';
import { openTxInExplorer, shortenTx, copyText } from 'src/app/utils';

const props = defineProps<{
  statusType: 'error' | 'info' | 'success' | 'pending'
  statusText: string,
  txid: string
}>()

const icon = computed<{ name: string, color: string }>(() => {
  if (props.statusType === 'error') {
    return { name: 'error', color: 'negative' }
  }
  if (props.statusType === 'success') {
    return { name: 'done_all', color: 'positive' }
  }
  if (props.statusType === 'pending') {
    return { name: 'pending', color: 'orange' }
  }
  return { name: 'info', color: 'info' }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

function ok() {
  onDialogOK()
}

</script>