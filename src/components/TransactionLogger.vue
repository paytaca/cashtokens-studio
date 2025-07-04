<template>
  <span></span>
</template>
<script setup lang="ts">
import { EventBus } from 'quasar';
import { CashTokenTransaction } from 'src/apps/types';
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import ClientDB from 'src/apps/clientonly/ClientDB';
import { useUI } from 'src/stores/ui';
import { useEventBus } from 'src/composables';
const { $ebus } = useEventBus()
const clientDB = ref<ClientDB>()
const ui = useUI()
onMounted(() => {
  if (window.indexedDB) {
    clientDB.value = ClientDB.getInstance()
    clientDB.value.init()
    $ebus?.on('transaction', (ctTxn: CashTokenTransaction) => {
      clientDB.value?.newCtsTransaction(ctTxn)
      if (!ui.transactionLogs) {
        ui.transactionLogs = []
      }
      ui.transactionLogs.push(ctTxn)
    })
  }
})

onBeforeUnmount(() => {
  $ebus?.off('transaction')
})
</script>