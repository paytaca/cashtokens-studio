<template>
  <div>
    <JsonEditor v-if="editor == 'json'" v-model="identitySnapshot" mode="text" class="jse-theme-dark" />
    <div v-else>
      <div v-if="title" class="text-h4 q-my-lg">{{ title }}</div>
      <q-section class="q-gutter-y-lg">
        <q-input v-model="identitySnapshot.name" :label="labels?.name || 'Token Name *'" :placeholder="namePlaceholder"
          required outlined :rules="[(v: any) => !!v || 'Required']" hide-bottom-space>
        </q-input>
        <q-input v-model="identitySnapshot.description" :label="labels?.description || 'Describe your token'"
          :placeholder="descriptionPlaceholder" autogrow outlined aria-rowspan="2">
        </q-input>
      </q-section>
      <q-section>
        <slot name="token">
          <TokenCategoryComponent v-if="identitySnapshot.token" v-model:token="identitySnapshot.token" :hide="hide" />
        </slot>
      </q-section>
      <q-section>
        <slot name="uris">
          <UrisComponent v-if="identitySnapshot.uris" v-model:uris="identitySnapshot.uris" />
        </slot>
      </q-section>
      <q-section>
        <slot name="extensions">
          <ExtensionsComponent v-if="identitySnapshot.extensions" v-model:extensions="identitySnapshot.extensions" />
        </slot>
      </q-section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineModel, ref } from 'vue'
import type { IdentitySnapshot } from 'mainnet-js'
import JsonEditor from 'json-editor-vue'
import TokenCategoryComponent from './TokenCategory.vue'
import UrisComponent from './Uris.vue'
import ExtensionsComponent from './Extensions.vue'

export type IdentitySnapshotProps = {
  title?: string,
  editor?: 'json' | 'form',
  hide?: string[],
  labels?: {
    [field: string]: string
  }
}
const props = defineProps<IdentitySnapshotProps>()
const editor = ref<'json' | 'form'>(props.editor || 'form')
const identitySnapshot = defineModel<IdentitySnapshot>('identitySnapshot', { required: true })
const namePlaceholder = computed(() => {
  if (identitySnapshot.value?.token?.nfts) {
    return 'E.g. My NFT, Bitcats NFT, CashNinjas NFT'
  }
  return 'E.g. `ACME Class A Shares`, `ACME Registry`, `Satoshi Nakamoto`, etc.'
})
const descriptionPlaceholder = computed(() => {
  if (identitySnapshot.value?.token?.nfts) {
    return 'E.g. My NFT, is a collection of 1000 digital artworks...'
  }
  return ''
})
</script>