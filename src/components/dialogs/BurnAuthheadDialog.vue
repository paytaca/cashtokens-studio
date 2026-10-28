<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card class="q-px-sm q-py-lg full-width">

      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">
          {{ t('authguard.burnTokenIdentity') }}
          <q-avatar class="q-mx-sm" v-if="icon">
            <img :src="ipfsToGatewayUrl(icon) as string" alt="">
          </q-avatar>
        </q-toolbar-title>
      </q-toolbar>
      <div class="q-mx-md text-justify">
        <q-icon name="warning" color="warning" size="sm"></q-icon>
        <span>
          {{ t('authguard.burnWarning') }}
          <q-btn href="https://github.com/bitjson/chip-bcmr#burned-identities" target="_blank" dense flat no-caps
            color="grey-8" icon="info" size="sm" />
        </span>
      </div>
      <q-card-section>
        <div class="q-gutter-sm">
          <FormField>
            <label>{{ t('authguard.symbol') }}</label>
            <q-input :model-value="symbol" outlined disable autogrow></q-input>
          </FormField>
          <FormField>
            <label>{{ t('authguard.tokenIdCategory') }}</label>
            <q-input :model-value="category" outlined disable autogrow></q-input>
          </FormField>
          <FormField>
            <label>{{ t('authguard.fungibleReserves') }}</label>
            <q-input :model-value="formattedReserves" outlined disable autogrow></q-input>
          </FormField>
          <FormField>
            <label>{{ t('authguard.nftCapability') }}</label>
            <q-input :model-value="capability" outlined disable autogrow></q-input>
          </FormField>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat :label="t('button.cancel')" color="grey-6" @click="onCancel" />
        <q-btn flat icon="mdi-fire" :label="t('button.burn')" text-color="orange" @click="onBurn" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import FormField from '../FormField.vue';
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import { formatTokenAmount } from 'src/core/utils';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean
  icon?: string
  symbol?: string
  category: string
  amount?: string
  capability?: string
  /** Divisibility of the token, so the raw reserve amount can be shown the way wallets display it. */
  decimals?: number
}>()

/**
 * The fungible reserves as a human-readable amount, matching how the managed tokens page renders it.
 * A pure NFT has no reserves, and an unparseable amount is reported rather than shown raw.
 */
const formattedReserves = computed(() => {
  try {
    const amount = props.amount ? BigInt(props.amount) : 0n
    if (amount === 0n) return t('dashboard.managed.unavailable')
    return formatTokenAmount(amount, props.symbol || '', props.decimals, 'none')
  } catch {
    return t('dashboard.managed.unavailable')
  }
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  burn: []
}>()

const onCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const onBurn = () => {
  emit('update:modelValue', false)
  emit('burn')
}
</script>
