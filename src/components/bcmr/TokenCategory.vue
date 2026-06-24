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
        <label>Category</label>
        <q-input v-model="token.category" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <label>Symbol</label>
        <q-input v-model="token.symbol" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <label>Decimals</label>
        <q-input v-model.number="token.decimals" type="number" class="full-width" filled></q-input>
      </FormField>
      <FormField v-if="token.nfts && Object.keys(token.nfts).length > 0">
        <label>NFT Category</label>
        <a v-if="authbase && contentHash && timestamp"
          class="nft-category-link cursor-pointer row items-center q-gutter-x-xs" @click="openNftCategory">
          <q-icon name="token" size="16px" color="primary" />
          <span>View and edit NFT category metadata</span>
          <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
        </a>
        <label v-else class="text-grey-5 text-caption">Available</label>
      </FormField>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { TokenCategory } from 'src/core/bcmr/bcmr-v2.schema'
import { default as reservedCryptoSymbols } from 'src/apps/bcmr/reserved-token-symbols-cryptocurrencies.json'
import FormField from '../FormField.vue';
const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  authbase?: string
  contentHash?: string
  timestamp?: string
}>()

const reservedSymbols = reservedCryptoSymbols.concat(reservedCryptoSymbols)
const token = defineModel<TokenCategory>('token', { required: true })
const hidden = ref<boolean>(false)

const openNftCategory = () => {
  router.push({
    path: '/token/metadata-registry',
    query: {
      authbase: props.authbase,
      contentHash: props.contentHash,
      tab: 'nfts'
    }
  })
}

</script>

<style scoped lang="scss">
.nft-category-link {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #1e1e1e;
  border-radius: 8px;
  color: #7c4dff;
  text-decoration: none;
  transition: background 0.15s ease;

  &:hover {
    background: #2a2a2a;
    color: #9c7cff;
  }
}
</style>