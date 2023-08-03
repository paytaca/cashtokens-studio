<template>
  <q-btn>
    <q-spinner v-if="busyLabel" size="2em"></q-spinner>
    {{ busyLabel ? busyLabel : label }}
  </q-btn>
</template>
<script setup lang="ts">
defineProps<{ busyLabel?: string, label: string }>()
</script>
