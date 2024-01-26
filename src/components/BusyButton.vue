<template>
  <q-btn :disable="Boolean(busyLabel) || forceDisable" size="lg">
    <q-spinner v-if="busyLabel" size="xs" class="q-mx-xs"></q-spinner>
    {{ busyLabel ? busyLabel : label }}
  </q-btn>
</template>
<script setup lang="ts">
import { watch } from 'vue';

const props = defineProps<{ busyLabel?: string, label: string, forceDisable?: boolean }>()

watch(() => props.busyLabel, (v) => {
  if (v) {
    const inputs = document.querySelectorAll('input');
    const selects = document.querySelectorAll('.q-select');

    inputs.forEach(function (input) {
      input.disabled = true;
    });
    selects.forEach(function (input) {
      input.classList.add('q-field--disabled');
    });

  } else {
    const inputs = document.querySelectorAll('input');
    const selects = document.querySelectorAll('.q-select');
    inputs.forEach(function (input) {
      input.disabled = false;
    });
    selects.forEach(function (input) {
      input.classList.remove('q-field--disabled');
    });

  }
})
</script>
