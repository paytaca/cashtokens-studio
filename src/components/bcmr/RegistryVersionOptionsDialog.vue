<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Publish Registry">
    <q-card class="q-px-sm q-py-md full-width">
      <!-- Header Toolbar -->
      <q-toolbar>
        <q-avatar color="primary" icon="gavel" size="md" />
        <q-toolbar-title class="q-ml-sm">
          <span class="text-weight-bold">{{ t('label.registry.publishTitle') }}</span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>

      <q-card-section class="q-pt-none">
        <!-- Display Current Version Context -->
        <div class=" q-pa-sm rounded-borders row justify-around text-center q-mb-md">
          <div>
            <div class="text-caption text-grey-7">{{ t('label.now') }}</div>
            <div class="text-subtitle1 text-weight-bold text-grey-9">
              {{ currentVersion.major }}.{{ currentVersion.minor }}.{{ currentVersion.patch }}
            </div>
          </div>
          <q-icon name="arrow_forward" size="sm" class="self-center text-grey-5" />
          <div>
            <div class="text-caption text-primary text-weight-medium">{{ t('label.new') }}</div>
            <div class="text-subtitle1 text-weight-bold text-primary">
              {{ targetVersion.major }}.{{ targetVersion.minor }}.{{ targetVersion.patch }}
            </div>
          </div>
        </div>

        <q-form class="q-gutter-md">
          <!-- Selection Mode -->
          <div class="text-weight-medium text-subtitle2 q-mb-xs">
            {{ t('label.registry.versionTypeOfChange') }}
          </div>
          <q-list class="rounded-borders">
            <!-- PATCH OPTION -->
            <q-item tag="label" v-ripple :active="selectedBump === 'patch'" active-class="bg-grey-10">
              <q-item-section avatar top>
                <q-radio v-model="selectedBump" val="patch" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-primary">{{ t('label.registry.versionPatchUpgrade')
                }}</q-item-label>
                <q-item-label caption class="text-justify text-caption">
                  {{ t('label.registry.versionPatchHint') }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <!-- MINOR OPTION -->
            <q-item tag="label" v-ripple :active="selectedBump === 'minor'" active-class="bg-grey-10">
              <q-item-section avatar top>
                <q-radio v-model="selectedBump" val="minor" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-primary">{{ t('label.registry.versionMinorUpgrade')
                  }}</q-item-label>
                <q-item-label caption class="text-justify text-caption">
                  {{ t('label.registry.versionMinorHint') }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <!-- MAJOR OPTION -->
            <q-item tag="label" v-ripple :active="selectedBump === 'major'" active-class="bg-grey-10">
              <q-item-section avatar top>
                <q-radio v-model="selectedBump" val="major" color="negative" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-negative">{{ t('label.registry.versionMajorUpgrade')
                  }}</q-item-label>
                <q-item-label caption class="text-justify text-caption">
                  {{ t('label.registry.versionMajorHint') }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-banner>
            {{ t('label.registry.versionDefaultHint') }}
          </q-banner>
        </q-form>
      </q-card-section>

      <!-- Action Buttons -->
      <q-card-actions class="row justify-end q-px-md">
        <q-btn flat color="grey-7" :label="t('cancel', 'Cancel')" @click="onDialogCancel" />
        <q-btn color="primary" class="q-px-md" :label="t('ok', 'Confirm & Publish')" @click="handleConfirm" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface BCMRVersion {
  major: number
  minor: number
  patch: number
}

// Expect the current active version from your schema state passed as a prop
const props = withDefaults(defineProps<{
  currentRegistryVersion?: BCMRVersion
}>(), {
  currentRegistryVersion: () => ({ major: 0, minor: 0, patch: 0 })
})

const { t } = useI18n()

// Track choice type
const selectedBump = ref<'major' | 'minor' | 'patch'>('patch')

const currentVersion = computed<BCMRVersion>(() => props.currentRegistryVersion)

// Calculate semantic outcome on-the-fly
const targetVersion = computed<BCMRVersion>(() => {
  const base = { ...currentVersion.value }
  if (selectedBump.value === 'major') {
    base.major += 1
    base.minor = 0
    base.patch = 0
  } else if (selectedBump.value === 'minor') {
    base.minor += 1
    base.patch = 0
  } else if (selectedBump.value === 'patch') {
    base.patch += 1
  }
  return base
})

// Dynamic instruction guidelines from the schema criteria text
const implicationText = computed(() => {
  if (selectedBump.value === 'patch') {
    return 'Wallets will overwrite existing information in-place. Use this for spelling error fixes or high-resolution icon upgrades.'
  }
  if (selectedBump.value === 'minor') {
    return 'Wallets will process this as a clean historical point-in-time snapshot. This provides a better user experience by highlighting rebrandings explicitly.'
  }
  return 'This triggers breaking changes for indexers. Only select this if an entire identity namespace is being dropped.'
})

defineEmits([
  ...useDialogPluginComponent.emits,
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

function handleConfirm() {
  // Passes the raw configuration choice along with the fully computed version structural object back to parent handler
  onDialogOK({
    bumpType: selectedBump.value,
    version: targetVersion.value
  })
}
</script>
