<template>
  <div>
    <q-skeleton v-if="loading" type="rect"></q-skeleton>
    <div v-else>
      <span v-if="status?.broadcastStatus === 'unknown:not-found'" style="color: orange">
        Failed to retrieve transaction proposal from status URL. It was likely deleted.
      </span>
      <span v-if="status?.broadcastStatus === 'unknown:server-error'" style="color: orange">
        Failed to retrieve transaction proposal from status URL. Server Error.
      </span>
      <q-btn :label="statusText" :loading="loading"
        :icon-right="!isBroadcasted && status?.broadcastStatus !== 'unknown:not-found' ? 'refresh' : ''"
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

/**
 * Extracts a proposal ID from a URL string.
 * @param {string} url - The full API URL.
 * @returns {string|null} - The extracted ID or null if not found.
 */
const extractProposalIdentifier = (url: string) => {
  // Regex Breakdown:
  // proposals\/  -> Matches literal "proposals/"
  // ([^/]+)      -> Capturing group: matches 1+ characters that are NOT a slash
  // \/status     -> Matches literal "/status"
  const regex = /proposals\/([^/]+)\/status/;
  const match = url.match(regex);

  return match ? match[1] : null;
};

const refreshStatus = async () => {
  loading.value = true;
  try {
    const response = await fetch(props.statusUrl)

    let statusQueryResult: TransactionProposalStatus = {}

    if (response?.status === 404 || response?.status === 500) {
      // If proposal was deleted on the server CSStudio already has the previous broadcast txid ignore
      if (props.transaction.broadcastStatus === 'done' || props.transaction.txid !== props.transaction.unsignedHash) {
        status.value = {
          signingProgress: props.transaction.signingProgress,
          broadcastStatus: props.transaction.broadcastStatus
        }
        return
      }

      if (response.status === 404) {
        statusQueryResult.signingProgress = 'unknown:not-found'
        statusQueryResult.broadcastStatus = 'unknown:not-found'
      }
      if (response.status === 500) {
        statusQueryResult.signingProgress = 'unknown:server-error'
        statusQueryResult.broadcastStatus = 'unknown:server-error'
      }
    }

    if (response.status === 200) {
      statusQueryResult = await response.json()
    }

    if (!statusQueryResult.broadcastStatus) {
      // New multisig status url uses 'status' for 'broadcastStatus'
      statusQueryResult.broadcastStatus = statusQueryResult.status
      if (statusQueryResult.broadcastStatus === 'broadcasted') {
        statusQueryResult.broadcastStatus = 'done'
      }
    }
    status.value = {
      // New multisig status url /proposals/<>/status/ api returns different data
      transactionProposal: statusQueryResult.transactionProposal || statusQueryResult.proposal_id,
      ...statusQueryResult
    };

    emit('statusFetched', { status: statusQueryResult, transaction: props.transaction });

  } catch (error) {
    console.log(`@refreshStatus: `, error)
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refreshStatus()
})
</script>