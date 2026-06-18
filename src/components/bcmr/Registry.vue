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
            <label v-if="registryModified || unpublishedChanges?.registry" class="text-caption text-warning">[{{
              t('label.modified') }}]</label>
          </div>
          <q-toggle :false-value="true" :true-value="false" color="red" v-model="registryHidden" />
        </div>
      </slot>
      <template v-if="registry && !registryHidden">
        <FormField>
          <label>{{ t('label.registry.schema') }}</label>
          <q-input v-model="registry.$schema" class="full-width" outlined></q-input>
        </FormField>
        <FormField>
          <label class="form-label">{{ t('label.registry.version') }}</label>
          <div class="row q-gutter-x-md">
            <q-input v-model="registry.version.major" label="Major" class="col-3" type="number" outlined disable
              required></q-input>
            <q-input v-model="registry.version.minor" label="Minor" class="col-3" type="number" outlined disable
              required></q-input>
            <q-input v-model="registry.version.patch" label="Patch" class="col-3" type="number" outlined disable
              required></q-input>
          </div>
        </FormField>
        <FormField>
          <label>{{ t('label.registry.latestRevision') }}</label>
          <q-input :model-value="registry.latestRevision" class="full-width" readonly outlined></q-input>
        </FormField>
        <FormField v-if="isOnchainRegistryIdentity">
          <label>{{ t('label.registry.registryIdentity') }}</label>
          <q-input v-model="(registry.registryIdentity as string)" readonly autogrow outlined></q-input>
        </FormField>
        <FormField v-else>
          <!-- // TODO: DISPLAY OffChainRegistryIdentity -->
        </FormField>
        <template v-if="!embedded">
          <div class="flex justify-between items-center">
            <h5 class="q-my-sm text-bold q-gutter-x-sm">
              <q-icon name="mdi-file-document-multiple"></q-icon><span>{{ t('label.registry.identities') }}</span>
            </h5>
          </div>
          <FormField v-if="isOnchainRegistryIdentity">
            <label>{{ t('label.registry.authbase') }}</label>
            <q-select v-if="identitiesOptions.length > 0" :model-value="selectedAuthbase" :options="identitiesOptions"
              class="full-width" @update:model-value="selectIdentitiesAuthbase" outlined style="max-width:90vw">
            </q-select>
          </FormField>
          <FormField>
            <label>{{ t('label.registry.identityHistory') }}</label>
            <q-select :model-value="selectedIdentityHistoryTimestamp" :options="identityHistoryTimestampOptions"
              @update:model-value="selectIdentityHistoryTimestamp" class="full-width" outlined style="max-width:90vw"
              bottom-slots>
              <template v-if="identitySnapshotModified" v-slot:prepend>
                <q-icon name="priority_high" color="warning"></q-icon>
              </template>
              <template v-slot:hint>
                <div
                  v-if="identitySnapshotModified || (unpublishedChanges?.identity?.authbase === selectedAuthbase && unpublishedChanges?.identity?.timestamp === selectedIdentityHistoryTimestamp)"
                  class="flex items-center">
                  <span class="text-warning">{{ t('label.registry.unpublished') }}</span>
                </div>
              </template>
            </q-select>
          </FormField>
        </template>
      </template>

      <IdentitySnapshotComponent v-if="!embedded && identitySnapshot" v-model:identity-snapshot="identitySnapshot"
        @changed="onIdentitySnapshotModified" :mode="selectedTimestampIsMostRecent ? 'write' : 'read'"
        :authbase="selectedAuthbase" :content-hash="contentHash" :timestamp="selectedIdentityHistoryTimestamp" />
    </div>
    <template v-if="!embedded">
      <div class="col-xs-12 flex justify-end q-gutter-md">
        <q-btn icon="mdi-undo" color="warning" @click="onResetClick"
          :disable="!registryModified && !identitySnapshotModified && !Boolean(unpublishedChanges)">
          {{ t('button.reset') }}
        </q-btn>
        <q-btn icon="cloud_upload" color="primary" @click="handleSave"
          :disable="!registryModified && !identitySnapshotModified">
          {{ t('button.save') }}
        </q-btn>
        <q-btn icon="cloud_upload" color="primary" @click="onPublishClick"
          :disable="!registryModified && !identitySnapshotModified && !Boolean(unpublishedChanges)">
          {{ t('button.publish') }}
        </q-btn>
      </div>
    </template>
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
import { CompactRegistry } from 'src/core/client-db.js'
import type { PublicationStrategy } from './types.js'
const { t } = useI18n()
const $q = useQuasar()

defineComponent({ name: 'RegistryComponent' })

export type RegistryProps = {
  loading?: boolean,
  visibility?: 'hidden' | 'visible',
  showAll?: boolean,
  unpublishedChanges?: SaveEventPayload
  contentHash?: string
  embedded?: boolean
}

const props = withDefaults(defineProps<RegistryProps>(), {
  embedded: false
})
const registry = defineModel<CompactRegistry>('registry', { required: true })
const registryModified = ref<boolean>(false)
const registryOriginalCopy = ref<Registry>()
const registryOriginalVersion = ref<{ major: number, minor: number, patch: number }>()
const registryCopied = ref<boolean>(false)
const registryHidden = ref<boolean>(false)


const selectedAuthbase = ref<string>()
const selectedIdentityHistoryTimestamp = ref<string>()
// The identitySnapshot of the selectedAuthbase and selectedIdentityHistoryTimestamp
const identitySnapshot = defineModel<IdentitySnapshot | null>('identitySnapshot', { required: false, type: Object })
// const identitySnapshot = ref<IdentitySnapshot>()
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

type SaveEventPayload = {
  registry?: boolean,
  identity?: {
    authbase: string,
    timestamp: string,
    identitySnapshot: IdentitySnapshot
  }
}

const emit = defineEmits<{
  (e: 'select:identityHistoryTimestamp', identityHistoryTimestamp: string): void,
  (e: 'select:authbase', authbase: string): void,
  (e: 'select:identity', authbase: string, timestamp: string): void,
  (e: 'changed', modified: boolean): void,
  (e: 'change:registry', modified: boolean): void,
  (e: 'save', save: SaveEventPayload): void,
  (e: 'reset'): void,
  (e: 'publish', strategy: PublicationStrategy): void | Promise<void>
}>()


const selectIdentitiesAuthbase = (authbase: string) => {
  selectedAuthbase.value = authbase
  emit('select:authbase', authbase)
  selectIdentityHistoryTimestamp(identityHistoryTimestampOptions.value[0] as string)
}

const selectIdentityHistoryTimestamp = (timestamp: string) => {
  selectedIdentityHistoryTimestamp.value = timestamp
  emit('select:identityHistoryTimestamp', timestamp)
  emit('select:identity', selectedAuthbase.value!, timestamp)
}

const handleSave = () => {
  const payload: SaveEventPayload = {}
  payload.registry = registryModified.value

  if (identitySnapshotModified.value) {
    payload.identity = {
      authbase: selectedAuthbase.value as string,
      timestamp: selectedIdentityHistoryTimestamp.value as string,
      identitySnapshot: identitySnapshot.value as IdentitySnapshot
    }
  }
  emit('save', payload)
}

const onPublishClick = () => {
  handleSave()
  $q.dialog({
    component: RegistryVersionOptionsDialog,
    componentProps: {
      currentRegistryVersion: registryOriginalVersion.value
    }
  }).onOk((version: any) => {
    setTimeout(() => {
      emit('publish', {
        bumpType: version.bumpType,
        newVersion: version.version
      })
    }, 1500)
  })
}

const onResetClick = () => {
  emit('reset')
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
      if (isOnchainRegistryIdentity.value) {
        selectIdentitiesAuthbase(registry.value.registryIdentity as string)
      }
    }
    return
  }

  if (newVal && oldVal) {
    registryModified.value = true
    emit('changed', true)
    emit('change:registry', true)
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