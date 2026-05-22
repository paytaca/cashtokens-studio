<template>
  <div :class="className" class="flex column q-gutter-y-sm q-my-sm">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
defineProps<{ className?: string }>()
</script>