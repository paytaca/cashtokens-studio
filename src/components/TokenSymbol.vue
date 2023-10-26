<template>
  <q-chip color="primary" class="q-p-sm text-bold" square outline :label="symbol" />
</template>
<script setup lang="ts">
defineProps<{ symbol: string }>()
</script>