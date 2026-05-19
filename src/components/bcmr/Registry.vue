<template>
  <div class="row">
    <div class="col-xs-12 col-sm-8">
      <slot name="header">
        <div class="flex justify-between items-center">
          <h5 class="q-my-sm text-bold q-gutter-x-sm">
            <q-icon name="mdi-file-document-multiple"></q-icon><span>{{ t('label.registry.registry') }}</span>
          </h5>
          <q-toggle :false-value="true" :true-value="false" color="red" v-model="registryHidden" />
        </div>
      </slot>
      <template v-if="registry && !registryHidden">
        <FormField>
          <q-label>{{ t('label.registry.schema') }}</q-label>
          <q-input :model-value="registry.$schema" class="full-width" filled></q-input>
        </FormField>
        <FormField>
          <q-label>{{ t('label.registry.version') }}</q-label>
          <div class="row q-gutter-x-md">
            <q-input v-model="registry.version.major" label="Major" class="col-3" filled></q-input>
            <q-input v-model="registry.version.minor" label="Minor" class="col-3" filled></q-input>
            <q-input v-model="registry.version.patch" label="Patch" class="col-3" filled></q-input>
          </div>
        </FormField>
        <FormField>
          <q-label>{{ t('label.registry.latestRevision') }}</q-label>
          <q-input :model-value="registry.latestRevision" class="full-width" readonly filled></q-input>
        </FormField>
        <FormField v-if="isOnchainRegistryIdentity">
          <q-label>{{ t('label.registry.registryIdentity') }}</q-label>
          <q-input v-model="registry.registryIdentity as string" readonly autogrow filled></q-input>
        </FormField>
        <FormField v-else>
          // TODO: DISPLAY OffChainRegistryIdentity
        </FormField>

        <FormField v-if="isOnchainRegistryIdentity">
          <q-label>{{ t('label.registry.identities') }}</q-label>
          <q-select v-if="identitiesOptions.length > 0" :model-value="registryIdentity" :options="identitiesOptions"
            class="full-width" @update:model-value="onRegistryIdentityChange" filled style="max-width:90vw">
          </q-select>
        </FormField>
        <FormField>
          <q-label>{{ t('label.registry.identityHistory') }}</q-label>
          <q-select :model-value="identityHistoryTimestamp" :options="identityHistoryTimestampOptions"
            @update:model-value="onTimestampChange" class="full-width" filled style="max-width:90vw">
          </q-select>
        </FormField>
      </template>
      <slot name="identity-snapshot"></slot>
      <FormField v-if="registryModified">
        <q-btn color="primary">{{ t('button.publishChanges') }}</q-btn>
      </FormField>
    </div>

  </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Registry, IdentityHistory, OffChainRegistryIdentity, IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
// import JsonEditor from 'json-editor-vue'
import FormField from 'components/FormField.vue'

const { t } = useI18n()
defineComponent({ name: 'RegistryComponent' })

export type RegistryProps = {
  loading?: boolean,
  visibility?: 'hidden' | 'visible',
  showAll?: boolean
}

const props = defineProps<RegistryProps>()
const registry = defineModel<Registry>('registry', { required: false })
const registryIdentity = ref<string | OffChainRegistryIdentity>()
const registryModified = ref<boolean>(false)
const registryOriginalCopy = ref<Registry>()
const registryHidden = ref<boolean>(false)
const identitySnapshot = ref<IdentitySnapshot>()
const identityHistory = ref<IdentityHistory>()
const identityHistoryTimestamp = ref<string>()
const identityHistoryTimestampOptions = computed(() => {
  return Object.keys(identityHistory.value || {}).sort((a, b) => b.localeCompare(a))
})
const identitiesOptions = computed(() => {
  return Object.keys(registry.value?.identities || {})
})
const hasIdentities = computed(() => {
  return identitiesOptions.value.length > 0
})

const isOnchainRegistryIdentity = computed(() => {
  return (
    registry.value?.registryIdentity &&
    typeof (registry.value.registryIdentity) === 'string' &&
    registry.value?.registryIdentity !== 'undefined'
  )
})

const emit = defineEmits<{
  (e: 'update:identityHistoryTimestamp', identityHistoryTimestamp: string): void,
  (e: 'update:registryIdentity', registryIdentity: string): void
}>()

const onRegistryIdentityChange = (selectedRegistryIdentity: string) => {
  console.log('onRegistryIdentityChange', selectedRegistryIdentity)
  registryIdentity.value = selectedRegistryIdentity as string

  if (isOnchainRegistryIdentity.value) {
    console.log('Triggered')
    identityHistory.value = registry.value!.identities![selectedRegistryIdentity]
    identityHistoryTimestamp.value = identityHistoryTimestampOptions.value[0]
    onTimestampChange(identityHistoryTimestamp.value!)
  }
  emit('update:registryIdentity', selectedRegistryIdentity)
}

const onTimestampChange = (selectedIdentityHistoryTimestamp: string) => {
  console.log('Timestamp changed', selectedIdentityHistoryTimestamp)
  identityHistoryTimestamp.value = selectedIdentityHistoryTimestamp
  identitySnapshot.value =
    registry.value!.identities![registryIdentity.value as string]![selectedIdentityHistoryTimestamp]
  emit('update:identityHistoryTimestamp', selectedIdentityHistoryTimestamp)
}

watch(() => registry.value, (newVal, oldVal) => {
  console.log('NEW VAL,', newVal)
  if (!oldVal) return
  if (registryModified.value) return
  registryOriginalCopy.value = JSON.parse(JSON.stringify(newVal)) as Registry
  if (isOnchainRegistryIdentity.value && hasIdentities.value) {
    registry.value = newVal
    if (registry.value) {
      const latestRevision = new Date().toISOString()
      registry.value.latestRevision = latestRevision
      registry.value.identities![registryIdentity.value! as string]![latestRevision] =
        JSON.parse(JSON.stringify(registryOriginalCopy.value!.identities![registryIdentity.value! as string]![identityHistoryTimestamp.value!]))
    }
  }
  registryModified.value = true
  console.log('original', registryOriginalCopy.value)
  console.log('new registry', registry.value)
}, { deep: true })

onMounted(() => {
  console.log('Mounted', isOnchainRegistryIdentity.value, hasIdentities.value)
  if (isOnchainRegistryIdentity.value && hasIdentities.value) {
    onRegistryIdentityChange(registry.value!.registryIdentity as string)
  }
})
</script>