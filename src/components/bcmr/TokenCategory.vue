<template>
  <div>
    <slot name="header">
      <div class="flex justify-between items-center">
        <h5 class="q-my-sm text-bold q-gutter-x-sm">
          <q-icon name="token"></q-icon><span>{{ t('label.registry.token') }}</span>
        </h5>
        <q-toggle :false-value="true" :true-value="false" color="red" v-model="hidden" />
      </div>
    </slot>
    <template v-if="token && !hidden">
      <FormField>
        <q-label>Category</q-label>
        <q-input v-model="token.category" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <q-label>Symbol</q-label>
        <q-input v-model="token.symbol" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <q-label>Decimals</q-label>
        <q-input v-model="token.decimals" class="full-width" filled></q-input>
      </FormField>
      <slot name="nftCategory">
        <NftCategory v-if="token.nfts && Object.keys(token.nfts || {}).length > 0" v-model:nft-category="token.nfts" />
      </slot>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TokenCategory } from 'src/core/bcmr/bcmr-v2.schema'
import NftCategory from './NftCategory.vue';
import CopyText from '../CopyText.vue';
import { default as reservedCryptoSymbols } from 'src/apps/bcmr/reserved-token-symbols-cryptocurrencies.json'
import FormField from '../FormField.vue';
const { t } = useI18n()
// export type TokenCategoryProps = {
//   title?: string,
//   hide?: string[],
//   labels?: {
//     [field: string]: string
//   }
// }

// defineProps<TokenCategoryProps>()
const reservedSymbols = reservedCryptoSymbols.concat(reservedCryptoSymbols)
const token = defineModel<TokenCategory>('token', { required: true })
const hidden = ref<boolean>(false)

// const symbolRules = [
//   (v: any) => !!v || 'Required',
//   (v: any) => /^[A-Z0-9][A-Z0-9-]*$/i
//     .test(v) || 'Invalid value.Symbol should only contain capitals letters A-Z, numbers 0-9 or - and start with a letter or number',
//   (v: any) => !reservedSymbols.includes(v) || 'Symbol is reserved',
// ]

// const decimalsRules = [
//   (v: string | number) => (!v || (Number(v) >= 0 && Number(v) <= 18)) || 'Valid value is between 0 - 18 (inclusive)'
// ]


</script>