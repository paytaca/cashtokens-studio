<template>
  <div>
    <div class="q-gutter-lg q-my-lg">
      <div class="text-h4 q-my-lg">{{ title }}</div>
      <q-input v-if="!hide?.includes('tokenId')" v-model="token.tokenId"
        :label="(labels || {})['tokenId'] ?? 'Token ID'" outlined readonly size="lg">
        <template v-slot:append>
          <CopyText :text="token.tokenId" />
        </template>
      </q-input>
      <q-input v-if="!hide?.includes('amount')" v-model="token.amount" :label="(labels || {})['amount'] ?? 'Amount'"
        outlined style="font-variant-numeric: tabular-nums; font-size: large" class="text-positive" :rules="amountRules"
        :readonly="readonly?.includes('amount')">
        <template v-if="enableMaxAmountSetter" v-slot:append>
          <q-btn text-color="warning" :class="$q.dark.isActive ? '' : 'text-black'" @click="setFtSupplyToMax"
            label="Max" />
        </template>
      </q-input>
      <q-select v-if="!hide?.includes('capability')" v-model="token.capability"
        :options="capabilities ?? [NFTCapability.minting, NFTCapability.mutable, NFTCapability.none]"
        label="NFT Capability" outlined>
      </q-select>
      <q-input v-if="!hide?.includes('commitment')" v-model="token.commitment" label="NFT Commitment"
        outlined></q-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, defineModel, onMounted } from 'vue'
import { NFTCapability, TokenI } from 'mainnet-js'
import CopyText from './CopyText.vue'
import { MAX_FUNGIBLE_AMOUNT } from 'src/app/constants';
defineComponent({ name: 'TokenComponent' })
export type TokenProps = {
  hide?: string[],
  enableMaxAmountSetter?: boolean,
  maxAmount?: string,
  labels?: {
    [field: string]: string
  },
  capabilities?: NFTCapability[],
  title?: string,
  symbol?: string,
  readonly?: string[]
}
const props = defineProps<TokenProps>()
const token = defineModel<Omit<TokenI, 'amount'> & { amount: string }>('token', { required: true })

const setFtSupplyToMax = () => {
  token.value.amount = props.maxAmount || MAX_FUNGIBLE_AMOUNT
}

const amountRules = [
  (v: string) => {
    const sanitizedAmt = (v ?? '').replace('.', '')
    return BigInt(sanitizedAmt) <= BigInt(MAX_FUNGIBLE_AMOUNT) || `Max amount = ${MAX_FUNGIBLE_AMOUNT}`
  },
  (v: string) => {
    const sanitizedAmt = (v ?? '').replace('.', '')
    return BigInt(sanitizedAmt) > 0 || 'Amount should be greater than 0'
  }
]

</script>