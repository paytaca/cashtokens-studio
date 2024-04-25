<template>
  <div>
    <div class="q-gutter-lg q-my-lg">
      <div v-if="title" class="text-h4 q-my-lg">{{ title }}</div>
      <q-input v-if="!(hide || []).includes('category')" v-model="tokenCategory.category" label="Category *" outlined
        readonly>
        <template v-slot:append>
          <CopyText :text="tokenCategory.category" />
        </template>
      </q-input>
      <q-input label="Symbol *" placeholder="E.g. BITCATS-NFT, BANANA" :rules="symbolRules"
        :model-value="tokenCategory.symbol"
        @update:model-value="(v) => tokenCategory.symbol = String((v ?? '')).toUpperCase()" outlined>
      </q-input>
      <q-input v-if="!(hide || []).includes('decimals')" v-model="tokenCategory.decimals" label="Decimals" outlined
        :rules="decimalsRules">
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
  title?: string,
  hide?: string[],
  labels?: {
    [field: string]: string
  }
}

defineComponent({ name: 'TokenComponent' })
defineProps<TokenCategoryProps>()
const reservedSymbols = reservedCryptoSymbols.concat(reservedCryptoSymbols)
const tokenCategory = defineModel<TokenCategory>('token', { required: true })

const symbolRules = [
  (v: any) => !!v || 'Required',
  (v: any) => /^[A-Z0-9][A-Z0-9-]*$/i
    .test(v) || 'Invalid value.Symbol should only contain capitals letters A-Z, numbers 0-9 or - and start with a letter or number',
  (v: any) => !reservedSymbols.includes(v) || 'Symbol is reserved',
]

const decimalsRules = [
  (v: string | number) => (!v || (Number(v) >= 0 && Number(v) <= 18)) || 'Valid value is between 0 - 18 (inclusive)'
]

</script>