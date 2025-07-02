<template>
  <div>
    <q-skeleton v-if="loading" type="rect"></q-skeleton>
    <div v-else>
      <q-btn :label="`${status?.signingProgress}|${status?.broadcastStatus === 'done' ? 'broadcasted' : 'pending'}`"
        icon-right="refresh" @click="refreshStatus" no-caps flat>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

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