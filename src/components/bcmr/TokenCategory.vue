<template>
  <div>
    <div class="q-gutter-lg q-my-lg">
      <div class="text-h4 q-my-lg">Token Metadata</div>
      <q-input v-model="tokenCategory.category" label="Category" outlined readonly>
        <template v-slot:append>
          <CopyText :text="tokenCategory.category" />
        </template>
      </q-input>
      <q-input v-model="tokenCategory.symbol" label="Symbol" :rules="symbolRules" outlined></q-input>
      <q-input v-if="!(hide || []).includes('decimals')" v-model="tokenCategory.decimals" label="Decimals" outlined
        type="number">
      </q-input>
      <NftCategoryComponent v-if="tokenCategory.nfts && !(hide || []).includes('nfts')"
        v-model:nft-category="tokenCategory.nfts" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, defineModel } from 'vue'
import type { TokenCategory } from 'mainnet-js'
import NftCategoryComponent from './NftCategory.vue';
import CopyText from '../CopyText.vue';
import { default as reservedCryptoSymbols } from 'src/app/bcmr/reserved-token-symbols-cryptocurrencies.json'

export type TokenCategoryProps = {
  hide?: string[],
  labels?: {
    [field: string]: string
  }
}

defineComponent({ name: 'TokenComponent' })
const props = defineProps<TokenCategoryProps>()
const reservedSymbols = reservedCryptoSymbols.concat(reservedCryptoSymbols)
const tokenCategory = defineModel<TokenCategory>('token', { required: true })

const symbolRules = [
  (v: any) => !!v || 'Required',
  (v: any) => /^[A-Z0-9][A-Z0-9-]*$/i
    .test(v) || 'Invalid value.Symbol should only contain capitals letters A-Z, numbers 0-9 or - and start with a letter or number',
  (v: any) => !reservedSymbols.includes(v) || 'Symbol is reserved',
]

</script>