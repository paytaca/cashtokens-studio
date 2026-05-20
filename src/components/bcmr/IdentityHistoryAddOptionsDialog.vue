<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Publish Registry">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <!-- <q-avatar>
          <q-icon name="link" size="lg"></q-icon>
        </q-avatar> -->
        <q-toolbar-title><span class="text-weight-bold">{{ t('label.options') }}</span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>
      <q-card-section>
        <q-form class="q-gutter-sm">
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <q-option-group name="preferred_genre" v-model="strategy" :options="[
              { value: 'copy-most-recent', label: t('label.registry.identityHistoryAddOptionsCopyMostRecent') },
              { value: 'create-new', label: t('label.registry.identityHistoryAddOptionsCreateNew') },
            ]
              " color="primary" inline>
              <template v-slot:label="value">
                <div class="q-mb-lg">
                  <div>{{ value.label }}</div>
                  <div v-if="value.value === 'copy-most-recent'">
                    <sub>
                      {{ t('label.registry.identityHistoryAddOptionsCopyMostRecentHint') }}
                    </sub>
                  </div>
                  <div v-if="value.value == 'create-new'">
                    <sub>
                      {{ t('label.registry.identityHistoryAddOptionsCreateNewHint') }}
                    </sub>
                  </div>
                </div>
              </template>
            </q-option-group>
          </div>

        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn color="primary" size="lg" :label="t('ok')" @click.stop="() => onDialogOK(strategy)" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const strategy = ref<'copy-most-recent' | 'create-new'>('copy-most-recent')

defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

</script>