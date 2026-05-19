<template>
  <div class="q-gutter-lg">
    <div class="text-h5 q-my-lg">NFT Type</div>
    <q-input v-model="nftType.name" label="Name *" outlined></q-input>
    <q-input v-model="nftType.description" label="Description" outlined></q-input>
    <template v-if="nftType.fields != undefined">
      <div>
        <div class="text-h5 q-my-lg">Fields</div>
        <q-input v-for="f, i in nftType.fields" :key="'nft-type-fields' + i" v-model="nftType.fields[i]"
          placeholder="Enter field name" class="q-mb-md" outlined>
          <template v-slot:after>
            <q-btn icon="remove" @click="() => deleteField(i)"></q-btn>
          </template>
        </q-input>
        <div class="text-right">
          <q-btn v-if="hasNoEmptyField" @click="addField" icon="add" text-color="primary" class="q-mt-md"></q-btn>
        </div>
      </div>
    </template>
    <Uris v-if="nftType.uris" v-model:uris="nftType.uris" />
    <ExtensionsComponent v-if="nftType.extensions" v-model:extensions="nftType.extensions" />
  </div>
</template>

<script setup lang="ts">

import { computed, defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import Uris from './Uris.vue'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import ExtensionsComponent from 'src/components/bcmr/Extensions.vue'
const { t } = useI18n()
defineComponent({ name: 'NftTypeComponent' })

const nftType = defineModel<NftType>('nftType', { required: true })
const hasNoEmptyField = computed(() => nftType.value.fields?.every(i => !!i))

const addField = () => {
  if (nftType.value.fields && nftType.value.fields.length == 0) {
    return nftType.value.fields.push('')
  }
  if (nftType.value.fields && nftType.value.fields[nftType.value.fields.length - 1]) {
    nftType.value.fields.push('')
  }
}

const deleteField = (index: number) => {
  nftType.value?.fields?.splice(index, 1)
}

</script>