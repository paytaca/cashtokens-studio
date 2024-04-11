<template>
  <div class="q-gutter-lg flex flex-wrap">
    <q-input v-model="version.major" label="Major" outlined></q-input> /
    <q-input v-model="version.minor" label="Minor" outlined></q-input> /
    <q-input v-model="version.patch" label="Patch" outlined></q-input>
  </div>
</template>
<script setup lang="ts">
import { defineComponent, defineModel } from 'vue'
defineComponent({ name: 'RegistryVersion' })
const version = defineModel<{ major: number, minor: number, patch: number }>('version', { required: true })
</script>