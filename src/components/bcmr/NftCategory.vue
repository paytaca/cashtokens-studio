<template>
  <div>
    <div class="q-gutter-lg q-mt-lg">
      <div class="text-h4 q-my-lg">{{ title }}</div>
      <q-input v-if="nftCategory.description" v-model="nftCategory.description" label="Description" outlined></q-input>
      <div v-if="nftCategory.fields" class="text-h5 q-my-lg">Fields</div>
      <q-banner v-if="nftCategory.fields" style="background-color: #55454512; color:orange" class="rounded-borders">
        <q-icon icon="warning"></q-icon>Sorry, the UI currently does not support adding fields. Please download the
        registry and add the field values manually.
      </q-banner>
      <div class="text-h5 q-my-lg">Parse</div>
      <q-input v-model="nftCategory.parse.bytecode" label="Bytecode"
        placeholder="Enter parsing bytecode. Leave this empty for sequential NFTs." outlined
        :rules="[(v: string) => !v || /\b[0-9A-Fa-f]+\b/g.test(v) || 'Value must be a hex string']">
        <template v-slot:prepend>
          <span class="text-grey-8 text-italic">0x</span>
        </template>
      </q-input>
      <div v-if="Object.keys(nftCategory.parse.types || {}).length > 0" class="text-h5 q-my-lg">
        {{ nftCollectionType == NFTCollectionType.sequential ? 'NFT Sequence#' : 'Bottom Alt Stack Hex' }}
      </div>
      <div v-for="type, i in Object.keys(nftCategory.parse.types || {})" :key="'nft-category' + i">
        <q-input :model-value="type"
          :label="nftCollectionType == NFTCollectionType.sequential ? 'Sequence#' : 'Bottom Alt Stack Hex'" outlined
          :disable="nftCollectionType == NFTCollectionType.sequential">
        </q-input>
        <NftTypeComponent v-model:nft-type="nftCategory.parse.types[type]" class="q-my-lg" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, defineModel } from 'vue'
import type { NftCategory } from 'mainnet-js'
import { NFTCollectionType } from 'src/apps/bcmr/types';
import NftTypeComponent from './NftType.vue'

export type NftCategoryProps = {
  title?: string,
  hide?: string[],
  labels?: {
    [field: string]: string
  }
}

defineComponent({ name: 'NftCategoryComponent' })
const props = defineProps<NftCategoryProps>()
const nftCategory = defineModel<NftCategory>('nftCategory', { required: true })
const nftCollectionType = computed<NFTCollectionType>(() => {
  return !nftCategory.value.parse.bytecode || nftCategory.value.parse.bytecode == '00cf6b' ? NFTCollectionType.sequential : NFTCollectionType.parsable
})

</script>