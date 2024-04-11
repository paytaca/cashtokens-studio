<template>
  <div>
    <div class="q-gutter-lg q-my-lg">
      <q-section>
        <v-slot name="uris">
          <UrisComponent v-model:uris="model.uris" />
        </v-slot>
      </q-section>
      <q-section>
        <v-slot name="tags"></v-slot>
      </q-section>
      <q-section>
        <v-slot name="extensions">
          <ExtensionsComponent v-model:extensions="model.extensions" />
        </v-slot>
      </q-section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel } from 'vue'
import type { OffChainRegistryIdentity } from 'mainnet-js'
import ExtensionsComponent from './Extensions.vue'
import UrisComponent from './Uris.vue'
const model = defineModel<OffChainRegistryIdentity>('registryPrimaryFields', { required: true })

</script>