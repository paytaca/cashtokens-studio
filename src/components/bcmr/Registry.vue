<template>
  <div class="row justify-center">
    <div class="col-xs-12">
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
        <div class="flex justify-between items-center">
          <h5 class="q-my-sm text-bold q-gutter-x-sm">
            <q-icon name="mdi-file-document-multiple"></q-icon><span>{{ t('label.registry.identities') }}</span>
          </h5>
        </div>
        <FormField v-if="isOnchainRegistryIdentity">
          <q-label>{{ t('label.registry.authbase') }}</q-label>
          <q-select v-if="identitiesOptions.length > 0" :model-value="registryIdentity" :options="identitiesOptions"
            class="full-width" @update:model-value="onRegistryIdentityChange" filled style="max-width:90vw">
          </q-select>
        </FormField>
        <FormField>
          <q-label>{{ t('label.registry.identityHistory') }}</q-label>
          <q-select :model-value="identityHistoryTimestamp" :options="identityHistoryTimestampOptions"
            @update:model-value="onTimestampChange" class="full-width" filled style="max-width:90vw" bottom-slots>
            <template v-if="identityHistoryUnpublishedTimestamp === identityHistoryTimestamp" v-slot:prepend>
              <q-icon name="priority_high" color="warning"></q-icon>
            </template>
            <template v-slot:hint>
              <div v-if="identityHistoryUnpublishedTimestamp === identityHistoryTimestamp" class="flex items-center">
                <span class="text-warning">{{ t('label.registry.unpublished') }}</span>
              </div>
            </template>
            <template v-slot:after>
              <q-btn v-if="!identityHistoryUnpublishedTimestamp" icon="add" :label="t('button.add')"
                @click="() => onAddIdentityHistory()">
              </q-btn>
              <q-btn v-else icon="history" :label="t('button.reset')" @click="() => onResetIdentityHistory()">
              </q-btn>
            </template>
          </q-select>
        </FormField>
      </template>
      <slot name="identity-snapshot"></slot>
      <FormField v-if="registryModified">
        <q-btn color="primary" @click="onPublishClick">{{ t('button.publishChanges') }}</q-btn>
      </FormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Registry, IdentityHistory, OffChainRegistryIdentity, IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
// import JsonEditor from 'json-editor-vue'
import FormField from 'components/FormField.vue'
import IdentityHistoryStrategyDialog from './IdentityHistoryStrategyDialog.vue'
import { useQuasar } from 'quasar'
import IdentityHistoryAddOptionsDialog from './IdentityHistoryAddOptionsDialog.vue'

const { t } = useI18n()
const $q = useQuasar()

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
const identityHistoryUnpublishedTimestamp = ref<string>()
const identityHistoryResetTriggered = ref<boolean>(false)
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
  (e: 'update:registryIdentity', registryIdentity: string): void,
  (e: 'publish', registry: Registry): void,
}>()

const onRegistryIdentityChange = (selectedRegistryIdentity: string) => {
  registryIdentity.value = selectedRegistryIdentity as string
  if (isOnchainRegistryIdentity.value) {
    identityHistory.value = registry.value!.identities![selectedRegistryIdentity]
    identityHistoryTimestamp.value = identityHistoryTimestampOptions.value[0]
    onTimestampChange(identityHistoryTimestamp.value!)
  }
  emit('update:registryIdentity', selectedRegistryIdentity)
}

const onTimestampChange = (selectedIdentityHistoryTimestamp: string) => {
  identityHistoryTimestamp.value = selectedIdentityHistoryTimestamp
  identitySnapshot.value =
    registry.value!.identities![registryIdentity.value as string]![selectedIdentityHistoryTimestamp]
  emit('update:identityHistoryTimestamp', selectedIdentityHistoryTimestamp)
}

const onPublishClick = () => {
  $q.dialog({
    component: IdentityHistoryStrategyDialog,
    componentProps: {
      version: Object.values(registry.value?.version || {}),
      latestRevision: new Date().toISOString(),
      newRevision: new Date().toISOString(),
      okLabel: 'Ok'
    }
  }).onOk((strategy: 'keep-all' | 'latest-only') => {
    if (strategy === 'latest-only') {
      const timestamp = identityHistoryTimestampOptions.value[0]
      const latestIdentitySnapshot = registry.value!.identities![registryIdentity.value! as string]![timestamp!]
      const unpublishedRegistry = JSON.parse(JSON.stringify(registry.value!))
      unpublishedRegistry.identities = {
        [timestamp as string]: latestIdentitySnapshot
      }
      return emit('publish', unpublishedRegistry as Registry)
    }
    emit('publish', registry.value as Registry) // Published currently modified registry
  })
}

const addIdentitySnapshot = (strategy: 'copy-most-recent' | 'create-new') => {
  identityHistoryUnpublishedTimestamp.value = new Date().toISOString()
  if (strategy === 'copy-most-recent') {
    registry.value!.identities![registryIdentity.value! as string]![identityHistoryUnpublishedTimestamp.value] =
      JSON.parse(JSON.stringify(registry.value!.identities![registryIdentity.value! as string]![identityHistoryTimestamp.value!] as IdentitySnapshot))
  }
  if (strategy === 'create-new') {
    registry.value!.identities![registryIdentity.value! as string]![identityHistoryUnpublishedTimestamp.value] = {
      name: '',
      description: '',
      token: {
        category: '',
        symbol: '',
        decimals: 0,
      },
      uris: {
        icon: '',
        web: ''
      }
    }
  }
  onTimestampChange(identityHistoryUnpublishedTimestamp.value)
}

const onAddIdentityHistory = (strategy?: 'copy-most-recent' | 'create-new') => {
  if (identityHistoryUnpublishedTimestamp.value) return
  if (strategy) {
    return addIdentitySnapshot(strategy)
  }
  $q.dialog({
    component: IdentityHistoryAddOptionsDialog,
  }).onOk((strategy: 'copy-most-recent' | 'create-new') => {
    addIdentitySnapshot(strategy)
  })
}

const onResetIdentityHistory = () => {
  identityHistoryResetTriggered.value = true
  if (isOnchainRegistryIdentity.value && identityHistoryUnpublishedTimestamp.value) {
    delete registry.value!.identities![registryIdentity.value! as string]![identityHistoryUnpublishedTimestamp.value as string]
    identityHistoryUnpublishedTimestamp.value = ''
    onRegistryIdentityChange(registryIdentity.value as string)
  }
}

watch(
  () => {
    const { identities, ...rest } = registry.value || {}
    return JSON.parse(JSON.stringify(rest))
  }, (newVal, oldVal) => {
    if (!oldVal) return
    if (!registryOriginalCopy.value) {
      registryOriginalCopy.value = JSON.parse(JSON.stringify(oldVal)) as Registry
      registryModified.value = true
    }
  })

// Watch for any modification of identities
watch(
  () => {
    return registry.value?.identities
  }, (newVal, oldVal) => {
    if (!registryOriginalCopy.value) {
      registryOriginalCopy.value = JSON.parse(JSON.stringify(registry.value)) as Registry
      registryModified.value = true
    }
    if (identityHistoryResetTriggered.value) {
      identityHistoryResetTriggered.value = false
      return
    }
    // Auto copy most recent if any field is modified
    onAddIdentityHistory('copy-most-recent')
  }, { deep: true })

onMounted(() => {
  console.log('Mounted', isOnchainRegistryIdentity.value, hasIdentities.value)
  if (isOnchainRegistryIdentity.value && hasIdentities.value) {
    onRegistryIdentityChange(registry.value!.registryIdentity as string)
  }
})
</script>