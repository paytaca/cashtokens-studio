<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Publish Registry">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <!-- <q-avatar>
          <q-icon name="link" size="lg"></q-icon>
        </q-avatar> -->
        <q-toolbar-title><span class="text-weight-bold">{{ t('label.registry.identityHistoryStrategy') }}</span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>
      <q-card-section>
        <q-form class="q-gutter-sm">
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <q-option-group name="preferred_genre" v-model="strategy" :options="[
              { value: 'latest-only', label: t('label.registry.identityHistoryStrategyLatestOnly') },
              { value: 'keep-all', label: t('label.registry.identityHistoryStrategyKeepAll') },
            ]
              " color="primary" inline>
              <template v-slot:label="value">
                <div class="q-mb-lg flex items-top">
                  <div>{{ value.label }}</div>
                  <div v-if="value.value == 'latest-only'">
                    <sub>
                      {{ t('label.registry.identityHistoryStrategyLatestOnlyHint') }}
                    </sub>
                  </div>
                  <div v-if="value.value == 'keep-all'">
                    <sub>
                      {{ t('label.registry.identityHistoryStrategyKeepAllHint') }}
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
const strategy = ref<'keep-all' | 'latest-only'>('latest-only')

defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

</script>