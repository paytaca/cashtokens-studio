<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 flex justify-center q-pt-lg">
        <div class="text-h4 text-center">Let's personalize your NFT collection</div>
      </div>
      <div class="col-xs-12 col-sm-6 q-mt-lg">
        <div class="row text-right">
          <div class="col-xs-12 q-mb-lg">
            Token Id
            <TokenCategory token-id="d3367b326d33c035e7c9143ccb8aa7b2ebcaf88dc25ebef74972622a56e29cb9" />
          </div>
          <div class="col-xs-12 q-mb-lg">
            AuthKey Id
            <TokenCategory token-id="d3367b326d33c035e7c9143ccb8aa7b2ebcaf88dc25ebef74972622a56e29cb9" />
          </div>
        </div>
        <div class="row">
          <div class="col-xs-12 q-mb-lg">
            <q-uploader id="icon-uploader" ref="iconUploader" label="Upload this NFT's icon" style="width:100%;" flat />
          </div>
          <div class="col-xs-12 q-mb-lg">
            Description
            <q-input v-model="identitySnapshot.description" label="Describe your NFT collection"></q-input>
          </div>
          <div class="col-xs-12 q-mb-lg">
            Token Name
            <q-input v-model="identitySnapshot.name" label="Describe your NFT collection"></q-input>
          </div>
          <div class="col-xs-12 q-mb-lg">
            Token Symbol
            <q-input v-model="token.symbol" label="Describe your NFT collection"></q-input>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { TokenCategory as TokenCategoryType, Registry, IdentitySnapshot, URIs } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue';
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const registry = ref<Registry>({
  version: {
    major: 0,
    minor: 0,
    patch: 0
  },
  latestRevision: new Date().toISOString(),
  registryIdentity: ''
})

const iconUri = ref<URIs>()
const webUri = ref<URIs>()
const registryUri = ref<URIs>()

const identitySnapshot = ref<IdentitySnapshot>({
  name: '',
  description: '',
})

const token = ref<TokenCategoryType>({
  category: '',
  symbol: '',
  decimals: 0
})

</script>
<style>
#icon-uploader .q-uploader__header {
  background-color: unset;
}
</style>
