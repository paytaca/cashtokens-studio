<template>
  <span>
    <q-icon name="warning_amber" :size="iconSize || '1em'" color="warning">
    </q-icon>
    <q-tooltip>Unable to resolve {{ fieldName || 'field' }} from registry</q-tooltip>
  </span>
</template>
<script setup lang="ts">
defineOptions({ name: 'TokenUnresolvedField' })
defineProps<{ fieldName?: string, iconSize?: string }>()
</script>
