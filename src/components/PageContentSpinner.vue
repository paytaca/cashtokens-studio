<template>
  <div class="row justify-center">
    <q-spinner-grid class="col-12" size="5em"></q-spinner-grid>
    <span>{{ caption }}</span>
  </div>
</template>
<script setup lang="ts">
defineProps<{caption?: string}>()
</script>
