<template>
  <div>
    <div class="q-gutter-lg q-mt-lg">
      <div class="text-h4 q-my-lg">NFT Category</div>
      <q-input v-if="nftCategory.description" v-model="nftCategory.description" label="Description" outlined></q-input>
      <div v-if="nftCategory.fields" class="text-h5 q-my-lg">Fields</div>
      <q-banner v-if="nftCategory.fields" style="background-color: #55454512; color:orange" class="rounded-borders">
        <q-icon icon="warning"></q-icon>Sorry, the UI currently does not support adding fields. Please download the
        registry and add the field values manually.
      </q-banner>
      <div class="text-h5 q-my-lg">Parse</div>
      <q-input v-model="nftCategory.parse.bytecode" label="Bytecode" outlined></q-input>
      <div v-if="Object.keys(nftCategory.parse.types || {}).length > 0" class="text-h5 q-my-lg">Types</div>
      <div v-for="type, i in Object.keys(nftCategory.parse.types || {})" :key="'nft-category' + i">
        <q-input :model-value="type"
          :label="nftCategory.parse.bytecode && nftCategory.parse.bytecode != '00cf6b' ? 'Sequence #' : 'Bottom Alt Stack Hex'"
          outlined disable>
        </q-input>
        <NftTypeComponent v-model:nft-type="nftCategory.parse.types[type]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, defineModel } from 'vue'
import type { NftCategory } from 'mainnet-js'
import NftTypeComponent from 'src/components/bcmr/NftType.vue'

defineComponent({ name: 'NftCategoryComponent' })
const nftCategory = defineModel<NftCategory>('nftCategory', { required: true })

</script>