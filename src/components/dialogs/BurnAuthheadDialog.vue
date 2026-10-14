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
        <div class="row q-gutter-sm">
          <q-input class="col-12" :model-value="symbol" disable :label="t('authguard.symbol')" filled></q-input>
          <q-input class="col-12" :model-value="category" disable :label="t('authguard.tokenIdCategory')" filled></q-input>
          <q-input class="col-12" :model-value="amount" disable :label="t('authguard.fungibleReserves')" filled></q-input>
          <q-input class="col-12" :model-value="capability" disable :label="t('authguard.nftCapability')" filled></q-input>
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
import { useI18n } from 'vue-i18n';
import { ipfsToGatewayUrl } from 'src/core/ipfs';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean
  icon?: string
  symbol?: string
  category: string
  amount?: string
  capability?: string
}>()

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
