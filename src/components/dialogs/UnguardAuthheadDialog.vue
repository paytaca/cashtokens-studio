<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card class="q-px-sm q-py-lg full-width">

      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold" style="text-wrap: wrap;">
          {{ t('authguard.releaseAuthhead.title') }}<q-avatar class="q-mx-sm" v-if="icon">
            <img :src="ipfsToGatewayUrl(icon) as string" alt="">
          </q-avatar>
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <div class="q-mx-md text-justify">
          <q-icon name="warning" color="warning" size="sm"></q-icon>
          <span class="text-wrap text-justify">
            {{ t('authguard.releaseAuthhead.message') }}
          </span>
        </div>
        <div class="q-gutter-sm">
          <FormField>
            <label>{{ t('authguard.tokenSymbol') }}</label>
            <q-input :model-value="symbol" outlined disable autogrow></q-input>
          </FormField>
          <FormField>
            <label>{{ t('authguard.tokenCategory') }}</label>
            <q-input :model-value="category" outlined disable autogrow></q-input>
          </FormField>
          <FormField>
            <label v-if="!useCustomDestination">{{ t('authguard.releaseAuthhead.defaultDestinationLabel') }}</label>
            <q-input v-model="finalDestinationAddress" outlined autogrow :disable="!useCustomDestination" />
            <q-checkbox v-model="useCustomDestination" :label="t('authguard.releaseAuthhead.useCustomDestination')"
              color="warning" dense />
            <div v-if="isCustomDestination" class="row items-start no-wrap q-gutter-x-sm text-justify q-mt-xs">
              <q-icon name="warning" color="warning" size="sm" class="q-mt-xs" />
              <span class="text-body2 text-grey-4">
                {{ t('authguard.releaseAuthhead.customDestinationWarning') }}
              </span>
            </div>
          </FormField>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat :label="t('button.cancel')" color="grey-6" @click="onCancel" />
        <q-btn icon="lock_open" :label="t('button.unlock')" color="negative" @click="onUnguard" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormField from '../FormField.vue';
import { computed, ref, watch } from 'vue';
import { ipfsToGatewayUrl } from 'src/core/ipfs/utils.js';

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  icon?: string
  symbol?: string
  category: string,
  defaultDestinationAddress: string
}>()

const finalDestinationAddress = ref<string>(props.defaultDestinationAddress)

/** Off by default: releasing to your own wallet is both the safe and the common case. */
const useCustomDestination = ref<boolean>(false)

// Unticking the box restores the safe default, which also clears the custom-destination warning.
watch(useCustomDestination, (custom) => {
  if (!custom) finalDestinationAddress.value = props.defaultDestinationAddress
})

/** Releasing anywhere other than your own wallet hands the Auth UTXO to whoever owns that address. */
const isCustomDestination = computed(
  () =>
    !!finalDestinationAddress.value.trim() &&
    finalDestinationAddress.value.trim() !== (props.defaultDestinationAddress || '').trim()
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  unguard: [value: string]
}>()

const onCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const onUnguard = () => {
  emit('update:modelValue', false)
  emit('unguard', finalDestinationAddress.value)
}
</script>
