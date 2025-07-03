<template>
  <div>
    <q-skeleton v-if="loading" type="rect"></q-skeleton>
    <div v-else>
      <q-btn :label="statusText" :loading="loading" @click="refreshStatus" no-caps flat>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  statusUrl: string
}>();

const emit = defineEmits<{
  (e: 'statusFetched', status: { signingProgress?: string, broadcastStatus?: string, txid?: string }): void
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

const loading = ref<boolean>(true);

const refreshStatus = () => {
  loading.value = true;
  fetch(props.statusUrl)
    .then(response => response.json())
    .then(data => {
      status.value = data;
      emit('statusFetched', data);
    })
    .catch(error => {
      console.error('Error fetching status:', error);
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(async () => {

  await fetch(props.statusUrl)
    .then(response => response.json())
    .then(data => {
      status.value = data;
    })
    .catch(error => {
      console.error('Error fetching status:', error);
    })
    .finally(() => {
      loading.value = false;
    });

})
</script>