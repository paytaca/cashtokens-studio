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
              <tr v-for="t, i in transactions?.slice(0, 20)" :key="i">
                <td>{{ i + 1 }}</td>
                <td>
                  <!-- <TransactionId :txid="t.txid" :to="explore(t.txid)" target="_blank" /> -->
                  <!-- <a :href="explore(t.txid)" target="_blank"> -->
                  <!-- {{ shortenTx(t.txid) }} -->
                  <!-- <q-btn :label="shortenTx(t.txid)" flat dense color="secondary" :to="explore(t.txid)"></q-btn> -->
                  <!-- </a> -->
                  <q-btn v-if="t.txid && !t.txidIsUnsignedHash" :href="explore(t.txid)" target="_blank" flat dense
                    color="secondary" size="sm">
                    <template v-slot:default>
                      <code>
                        {{ shortenTx(t.txid) }}
                        <q-tooltip>View in explorer</q-tooltip>
                      </code>
                    </template>
                  </q-btn>
                  <q-btn v-else flat dense color="secondary" size="sm">
                    <template v-slot:default>
                      <code>
                        {{ t.txid ? shortenTx(t.txid) : '...' }}
                        <div>Unsigned Hash</div>
                      </code>
                    </template>
                  </q-btn>
                </td>
                <td>{{ new Date(t.timestamp) }}</td>
                <td>{{ t.txType }}</td>
                <td>
                  <div v-if="t.txid">{{ t.successMsg || t.errorMsg }}</div>
                  <MultisigTransactionStatus v-if="t.statusUrl" :statusUrl="t.statusUrl"
                    @status-fetched="onStatusFetched" />
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
import ClientDB from 'src/app/clientonly/ClientDB';
import { computed, onMounted, ref } from 'vue';
import { CashTokenTransaction } from 'src/app/types';
import { shortenTx } from 'src/app/utils';
import MultisigTransactionStatus from 'src/components/MultisigTransactionStatus.vue';

const transactions = ref<CashTokenTransaction[]>()
const explore = computed(() => {
  return (txid: string) => {
    return `${process.env.TX_EXPLORER_BASE_URL}tx/${txid}`
  }
})

const onStatusFetched = (status: { signingProgress?: string, broadcastStatus?: string, txid?: string }) => {
  console.log('Status fetched:', status);
  // You can handle the status update here if needed
}

onMounted(async () => {
  const db = ClientDB.getInstance()
  transactions.value = await db.getCtsTransactions()
})

</script>