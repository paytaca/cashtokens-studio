<template>
  <div>
    <JsonEditor v-if="editor == 'json'" v-model="identitySnapshot" mode="text" class="jse-theme-dark" />
    <div v-else>
      <div v-if="title" class="text-h4 q-my-lg">{{ title }}</div>
      <q-section class="q-gutter-y-lg">
        <q-input v-model="identitySnapshot.name" label="Token Name *"
          placeholder="E.g. `Bitcats` or `ACME Class A Shares`" required outlined>
        </q-input>
        <q-input v-model="identitySnapshot.description" label="Describe your token"
          placeholder="E.g. Bitcats is the best NFT..." autogrow outlined aria-rowspan="2">
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
import { defineModel, ref } from 'vue'
import type { IdentitySnapshot } from 'mainnet-js'
import JsonEditor from 'json-editor-vue'
import TokenCategoryComponent from './TokenCategory.vue'
import UrisComponent from './Uris.vue'
import ExtensionsComponent from './Extensions.vue'

export type IdentitySnapshotProps = {
  title?: string,
  editor?: 'json' | 'form',
  hide?: string[]
}
const props = defineProps<IdentitySnapshotProps>()
const editor = ref<'json' | 'form'>(props.editor || 'form')
const identitySnapshot = defineModel<IdentitySnapshot>('identitySnapshot', { required: true })

</script>