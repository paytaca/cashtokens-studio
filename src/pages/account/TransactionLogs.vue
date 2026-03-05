<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12">
        <h5 class="text-center text-bold">Recent CashTokens Studio Transactions <q-icon name="receipt"></q-icon></h5>
        <p class="text-center">List of recent CashTokens Studio transactions you made on this device. Note: Currently
          this
          logs
          are only
          saved locally in the browser.</p>
        <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
          <q-markup-table separator="cell">
            <thead class="bg-teal text-bold">
              <tr>
                <th>#</th>
                <th>Transaction Id</th>
                <th>Timestamp</th>

                <th>CashToken Transaction</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody class="text-center">
              <tr v-for="t, i in transactions?.slice(0, 50)" :key="i">
                <td>{{ i + 1 }}</td>
                <td>
                  <q-btn :href="explore(t.txid)" :disable="Boolean(t.unsignedHash) && t.broadcastStatus !== 'done'"
                    target="_blank" flat dense color="secondary" size="sm">
                    <template v-slot:default>
                      <code>
                        {{ shortenTx(t.txid) }}
                        <div v-if="(t.unsignedHash) && t.broadcastStatus !== 'done'">[Temporary]</div>
                        <q-tooltip v-if="!t.broadcastStatus || t.broadcastStatus === 'done'">View in explorer</q-tooltip>
                      </code>
                    </template>
                  </q-btn>
                </td>
                <td>{{ new Date(t.timestamp) }}</td>
                <td>{{ t.txType }}</td>
                <td>
                  <div>{{ t.successMsg || t.errorMsg }}</div>
                  <MultisigTransactionStatus v-if="t.statusUrl" :statusUrl="t.statusUrl" :unsignedHash="t.unsignedHash"
                    :transaction="t" @status-fetched="onStatusFetched" />
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-scroll-area>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import ClientDB from 'src/apps/clientonly/ClientDB';
import { EventBus } from 'quasar';
import { computed, onMounted, ref, inject, onBeforeUnmount } from 'vue';
import type { BroadcastStatus, CashTokenTransaction, TransactionProposalStatus } from 'src/apps/types';
import { shortenTx } from 'src/apps/utils';
import MultisigTransactionStatus from 'src/components/MultisigTransactionStatus.vue';
const eventBus = inject<EventBus>('eventBus')

const transactions = ref<CashTokenTransaction[]>()
const explore = computed(() => {
  return (txid: string) => {
    return `${process.env.TX_EXPLORER_BASE_URL}tx/${txid}`
  }
})

// Define the type for the status event, adjust as needed
interface StatusFetchedEvent {
  status: TransactionProposalStatus; // or the actual type of status
  transaction: CashTokenTransaction; // or the actual type of transaction
}

const onStatusFetched = (data: StatusFetchedEvent) => {
  if (data.status.txid) {

    const db = ClientDB.getInstance()
    Promise.all([
      // replace the old transaction log
      db.deleteCtsTransaction(data.transaction.txid),
      db.newCtsTransaction({
        ...data.transaction,
        ...data.status,
        transactionProposal: data.status.transactionProposal || data.status.proposal_id
      })
    ])
      .then(async () => {
        transactions.value = await db.getCtsTransactions();
        eventBus?.emit('updatedPendingMultisigTransactions');
      })
      .catch(error => {
        console.error('Error updating transaction:', error);
        eventBus?.emit('updatedPendingMultisigTransactions');
      });
  }
}

onMounted(async () => {
  const db = ClientDB.getInstance()
  await db.init()
  transactions.value = await db.getCtsTransactions()
})

</script>