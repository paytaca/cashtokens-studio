<template>
  <q-chip color="primary" :class="$q.screen.gt.xs ? 'text-bold' : ''" square outline :label="symbol"
    :style="$q.screen.xs ? 'letter-spacing:1px;' : 'letter-spacing: 5px;'" />
</template>
<script setup lang="ts">
defineProps<{ symbol: string }>()
</script>