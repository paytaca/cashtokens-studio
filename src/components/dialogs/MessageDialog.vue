<template>
  <q-dialog ref="messageDialog" v-close-popup @before-hide="onBeforeHide">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold text-center">{{ ui.statusMessageType }}</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="row justify-center text-center">
          <q-avatar size="5em" class="col-12">
            <q-icon size="2em" :name="icon.name" :color="icon.color"></q-icon>
          </q-avatar>
          <div class="col-12 text-center q-px-lg text-wrap q-py-sm q-py-sm"
            style="max-width:100%;text-wrap: wrap;overflow-wrap: normal;">
            {{ ui.statusMessage }}
          </div>
          <div class="col-12 text-center q-px-lg text-wrap q-py-sm"
            style="max-width:100%;text-wrap: wrap;overflow-wrap: normal;">
            <q-btn v-if="ui.statusMessageTxid" :href="explore(ui.statusMessageTxid)" target="_blank" flat dense
              color="secondary" label="View Tx in Explorer" />
            <div v-if="ui.statusMessageTxid">Tx: {{ shortenTx(ui.statusMessageTxid) }} <q-btn dense icon="content_copy"
                size="xs" @click.stop="copyText(ui.statusMessageTxid)"></q-btn>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-center">
        <q-btn color="primary" size="lg" v-close-popup>Ok</q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useUI } from 'src/stores/ui';
import { computed, ref } from 'vue';
import { shortenTx, copyText } from 'src/app/utils';
const ui = useUI()

const messageDialog = ref()
const icon = computed(() => {
  switch (ui.statusMessageType) {
    case 'success':
      return { name: 'check_circle_outline', color: 'green' }
    case 'error':
      return { name: 'error_outline', color: 'negative' }
    case 'warning':
      return { name: 'warning_amber', color: 'warning' }
  }
  return { name: 'info', color: 'secondary' }
})

const explore = computed(() => {
  return (txid: string) => {
    return `${process.env.TX_EXPLORER_BASE_URL}tx/${txid}`
  }
})

const onBeforeHide = () => {
  ui.clearStatusMessage()
}
</script>