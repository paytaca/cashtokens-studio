<template>
  <div>
    <q-skeleton v-if="loading" type="rect"></q-skeleton>
    <div v-else>
      <q-btn :label="statusText" :loading="loading" :icon-right="!isBroadcasted ? 'refresh' : ''"
        :color="!isBroadcasted ? 'warning' : ''" @click="refreshStatus" no-caps flat>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CashTokenTransaction, TransactionProposalStatus } from 'src/apps/types';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  statusUrl: string,
  transaction: CashTokenTransaction // copy of the CashTokenTransaction object
}>();

const emit = defineEmits<{
  (e: 'statusFetched', data: { status: TransactionProposalStatus, transaction: CashTokenTransaction }): void
}>()

const status = ref<{
  signingProgress?: string,
  broadcastStatus?: string,
  txid?: string
}>()

const statusText = computed(() => {
  let message = ''
  if (status?.value?.signingProgress === 'unsigned') {
    message = 'Unsigned, waiting for signatures'
  }
  if (status?.value?.signingProgress === 'partially-signed') {
    message = 'Partially signed, waiting for more signatures'
  }
  if (status?.value?.signingProgress === 'fully-signed') {
    message = 'Fully signed, waiting for broadcast'
  }
  if (status?.value?.broadcastStatus === 'done') {
    message = 'Multisig transaction completed. Broadcasted successfully.'
  }
  return message
})

const isBroadcasted = computed(() => {
  return status.value?.broadcastStatus === 'done'
});

const loading = ref<boolean>(true);

const refreshStatus = async () => {
  loading.value = true;
  await fetch(props.statusUrl)
    .then(response => response.json())
    .then(data => {
      if (!data.broadcastStatus) {
        // New multisig status url uses 'status' for 'broadcastStatus'
        data.broadcastStatus = data.status
        if (data.broadcastStatus === 'broadcasted') {
          data.broadcastStatus = 'done'
        }
      }
      status.value = {
        // New multisig status url /proposals/<>/status/ api returns different data
        transactionProposal: data.transactionProposal || data.proposal_id,
        ...data
      };
      emit('statusFetched', { status: data, transaction: props.transaction });
    })
    .catch(error => {
      console.error('Error fetching status:', error);
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(async () => {
  await refreshStatus()
})
</script>