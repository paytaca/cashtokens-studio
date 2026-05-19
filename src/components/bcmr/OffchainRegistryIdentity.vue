<template>
  <div>
  </div>
</template>

<script setup lang="ts">
import type { OffChainRegistryIdentity } from 'src/core/bcmr/bcmr-v2.schema'
import { useI18n } from 'vue-i18n'
import ExtensionsComponent from './Extensions.vue'
import UrisComponent from './Uris.vue'
const { t } = useI18n()

const model = defineModel<OffChainRegistryIdentity>('registryPrimaryFields', { required: true })

</script>