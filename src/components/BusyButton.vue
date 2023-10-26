<template>
  <q-btn :disable="Boolean(busyLabel) || forceDisable" size="lg">
    <q-spinner v-if="busyLabel" size="xs" class="q-mx-xs"></q-spinner>
    {{ busyLabel ? busyLabel : label }}
  </q-btn>
</template>
<script setup lang="ts">
defineProps<{ busyLabel?: string, label: string, forceDisable?: boolean }>()
</script>
