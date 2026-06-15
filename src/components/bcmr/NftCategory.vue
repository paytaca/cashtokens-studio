<template>
  <div>
    <slot name="header">
      <div class="flex justify-between items-center">
        <h5 class="q-my-sm text-bold q-gutter-x-sm">
          <q-icon name="token"></q-icon><span>{{ t('label.registry.nftCategory') }}</span>
        </h5>
        <q-toggle :false-value="true" :true-value="false" color="red" v-model="hidden" />
      </div>
    </slot>
    <FormField>
      <q-item-label>Description</q-item-label>
      <q-input v-model="nftCategory.description" class="full-width" filled></q-input>
    </FormField>
    <slot name="nftCollection">
      <template v-if="(nftCategory.parse as any).bytecode">
        <ParsableNftCollection v-model:parsable-nft-collection="(nftCategory.parse as ParsableNftCollectionType)" />
      </template>
      <template v-else>
        <SequentialNftCollection
          v-model:sequential-nft-collection="(nftCategory.parse as SequentialNftCollectionType)" />
      </template>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  NftCategory,
  ParsableNftCollection as ParsableNftCollectionType,
  SequentialNftCollection as SequentialNftCollectionType
} from 'src/core/bcmr/bcmr-v2.schema'
import { NFTCollectionType } from 'src/apps/bcmr/types';
import ParsableNftCollection from './ParsableNftCollection.vue';
import SequentialNftCollection from './SequentialNftCollection.vue';
const { t } = useI18n()
const hidden = ref<boolean>(false)

const nftCategory = defineModel<NftCategory>('nftCategory', { required: true })
// const parseBytecode = computed({
//   get: () => (isParsableNftCollection(nftCategory.value.parse) ? nftCategory.value.parse.bytecode : ''),
//   set: (bytecode: string) => {
//     if (isParsableNftCollection(nftCategory.value.parse)) {
//       nftCategory.value.parse.bytecode = bytecode
//     } else if (bytecode) {
//       nftCategory.value.parse = { bytecode, types: nftCategory.value.parse.types }
//     }
//   },
// })
// const nftCollectionType = computed<NFTCollectionType>(() => {
//   const bytecode = isParsableNftCollection(nftCategory.value.parse)
//     ? nftCategory.value.parse.bytecode
//     : undefined
//   return !bytecode || bytecode == '00cf6b' ? NFTCollectionType.sequential : NFTCollectionType.parsable
// })


</script>