<template>
  <div>
    <slot name="nftTypes">
      <!-- <NftTypes v-model:nft-types="sequentialNftCollection.types" /> -->
    </slot>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SequentialNftCollection } from 'src/core/bcmr/bcmr-v2.schema'
import NftTypes from './NftTypes.vue'

const { t } = useI18n()
const sequentialNftCollection = defineModel<SequentialNftCollection>('sequentialNftCollection', { required: true })
</script>
