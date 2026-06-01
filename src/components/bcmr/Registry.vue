<template>
  <div class="row justify-center q-gutter-y-md">
    <div class="col-xs-12">
      <slot name="header">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <h5 class="q-my-sm text-bold q-gutter-x-sm">
              <q-icon name="mdi-file-document-multiple"></q-icon>
              <span>
                {{ t('label.registry.registry') }}
              </span>
            </h5>
            <q-label v-if="registryModified" class="text-caption text-warning">[{{ t('label.modified') }}]</q-label>
          </div>
          <q-toggle :false-value="true" :true-value="false" color="red" v-model="registryHidden" />
        </div>
      </slot>
      <template v-if="registry && !registryHidden">
        <FormField>
          <q-label>{{ t('label.registry.schema') }}</q-label>
          <q-input v-model="registry.$schema" class="full-width" filled></q-input>
        </FormField>
        <FormField>
          <q-label>{{ t('label.registry.version') }}</q-label>
          <div class="row q-gutter-x-md">
            <q-input v-model="registry.version.major" label="Major" class="col-3" type="number" filled disable
              required></q-input>
            <q-input v-model="registry.version.minor" label="Minor" class="col-3" type="number" filled disable
              required></q-input>
            <q-input v-model="registry.version.patch" label="Patch" class="col-3" type="number" filled disable
              required></q-input>
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
          <q-select v-if="identitiesOptions.length > 0" :model-value="selectedAuthbase" :options="identitiesOptions"
            class="full-width" @update:model-value="selectIdentitiesAuthbase" filled style="max-width:90vw">
          </q-select>
        </FormField>
        <FormField>
          <q-label>{{ t('label.registry.identityHistory') }}</q-label>
          <q-select :model-value="selectedIdentityHistoryTimestamp" :options="identityHistoryTimestampOptions"
            @update:model-value="selectIdentityHistoryTimestamp" class="full-width" filled style="max-width:90vw"
            bottom-slots>
            <template v-if="identitySnapshotModified" v-slot:prepend>
              <q-icon name="priority_high" color="warning"></q-icon>
            </template>
            <template v-slot:hint>
              <div v-if="identitySnapshotModified" class="flex items-center">
                <span class="text-warning">{{ t('label.registry.unpublished') }}</span>
              </div>
            </template>
          </q-select>
        </FormField>
      </template>
      <slot name="identity-snapshot" :on-changed="onIdentitySnapshotModified">
        <IdentitySnapshotComponent v-if="identitySnapshot" v-model:identity-snapshot="identitySnapshot"
          @changed="onIdentitySnapshotModified" :mode="selectedTimestampIsMostRecent ? 'write' : 'read'" />
      </slot>
    </div>
    <div>
    </div>
    <div class="col-xs-12 flex justify-end">
      <q-btn icon="cloud_upload" color="primary" @click="emit('saved', true)"
        :disable="!registryModified || !identitySnapshotModified">
        {{ t('button.save') }}
      </q-btn>
      <q-btn icon="cloud_upload" color="primary" @click="onPublishClick"
        :disable="!registryModified && !identitySnapshotModified">
        {{ t('button.publishChanges') }}
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Registry, IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import FormField from 'components/FormField.vue'
import { useQuasar } from 'quasar'
import IdentitySnapshotComponent from './IdentitySnapshot.vue'
import RegistryVersionOptionsDialog from './RegistryVersionOptionsDialog.vue'
import { bumpRegistry, BumpRegistryParams } from 'src/core/bcmr/bump-registry'
import { CompactRegistry } from 'src/core/client-db.js'
import type { PublicationStrategy } from './types.js'
const { t } = useI18n()
const $q = useQuasar()

defineComponent({ name: 'RegistryComponent' })

export type RegistryProps = {
  loading?: boolean,
  visibility?: 'hidden' | 'visible',
  showAll?: boolean
}

const props = defineProps<RegistryProps>()
const registry = defineModel<CompactRegistry>('registry', { required: true })
const registryModified = ref<boolean>(false)
const registryOriginalCopy = ref<Registry>()
const registryOriginalVersion = ref<{ major: number, minor: number, patch: number }>()
const registryCopied = ref<boolean>(false)
const registryHidden = ref<boolean>(false)

const selectedAuthbase = ref<string>()
const selectedIdentityHistoryTimestamp = ref<string>()

const identitySnapshot = ref<IdentitySnapshot>()
const identitySnapshotModified = ref<boolean>()

const identityHistoryTimestampOptions = computed(() => {
  if (selectedAuthbase.value) {
    return registry.value!.identities![selectedAuthbase.value]!.sort((a, b) => b.localeCompare(a))
  }
  return []
})

const selectedTimestampIsMostRecent = computed(() => {
  if (selectedIdentityHistoryTimestamp.value && identityHistoryTimestampOptions.value.indexOf(selectedIdentityHistoryTimestamp.value) === 0) {
    return true
  }
  return false
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
  (e: 'update:authbase', authbase: string): void,
  (e: 'changed', modified: boolean): void,
  (e: 'saved', modified: boolean): void,
  (e: 'publish', strategy: PublicationStrategy): void | Promise<void>

}>()


const selectIdentitiesAuthbase = (authbase: string) => {
  selectedAuthbase.value = authbase
  emit('update:authbase', authbase)
  selectIdentityHistoryTimestamp(identityHistoryTimestampOptions.value[0] as string)
}

const selectIdentityHistoryTimestamp = (timestamp: string) => {
  selectedIdentityHistoryTimestamp.value = timestamp
  emit('update:identityHistoryTimestamp', timestamp)
}

const onPublishClick = () => {

  $q.dialog({
    component: RegistryVersionOptionsDialog,
    componentProps: {
      currentRegistryVersion: registryOriginalVersion.value
    }
  }).onOk((version: any) => {
    emit('publish', {
      bumpType: version.bumpType,
      newVersion: version.version
    })
  })
}

const onIdentitySnapshotModified = (isModified: boolean) => {
  identitySnapshotModified.value = isModified
}

const unwatchRegistry = watch(() => registry.value, (newVal, oldVal) => {
  if (newVal && !oldVal && !registryOriginalCopy.value) {
    registryOriginalCopy.value = JSON.parse(JSON.stringify(newVal)) as Registry
    registryOriginalVersion.value = JSON.parse(JSON.stringify(newVal.version))
    registryCopied.value = true
    if (hasIdentities.value) {
      if (isOnchainRegistryIdentity) {
        selectIdentitiesAuthbase(registry.value.registryIdentity as string)
      }
    }
    return
  }

  if (newVal && oldVal) {
    registryModified.value = true
    emit('changed', true)
  }

}, { deep: true, immediate: true })


const unwatchRegistryModified = watch(registryModified, (isModified) => {
  if (isModified) {
    unwatchRegistry()
    unwatchRegistryModified()
  }
})

watch(() => selectedAuthbase.value, (authbase) => {
  if (authbase) {
    selectIdentityHistoryTimestamp(identityHistoryTimestampOptions.value[0] as string)
  }
})

</script>