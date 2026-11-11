<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin bg-dark" style="min-width: 400px">
      <q-toolbar class="q-pa-md q-pb-none">
        <q-toolbar-title class="text-h6 text-white text-weight-medium">
          <q-icon name="schema" size="20px" class="q-mr-sm" color="primary" />
          {{ t('nftCategoryField.title') }}
        </q-toolbar-title>
        <q-btn dense flat round icon="close" color="grey-4" @click="onDialogCancel" />
      </q-toolbar>
      <div class="q-pa-md">
        <div>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              {{ t('nftCategoryField.name') }}
            </label>
            <q-input v-model="field.name" outlined dark clearable
              :placeholder="t('nftCategoryField.namePlaceholder')" autofocus />
          </FormField>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              {{ t('nftCategoryField.description') }}
            </label>
            <q-input v-model="field.description" type="textarea" autogrow outlined dark clearable
              :placeholder="t('nftCategoryField.descriptionPlaceholder')" />
          </FormField>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              {{ t('nftCategoryField.identifier') }}
            </label>
            <q-input v-model="field.identifier" outlined dark clearable
              :placeholder="t('nftCategoryField.identifierPlaceholder')"
              :hint="t('nftCategoryField.identifierHint')"
              :rules="[(val?: string) => !!val || t('nftCategoryField.identifierRequired')]"
              @update:model-value="identifierEdited = true" />
          </FormField>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              {{ t('nftCategoryField.encodingType') }}
            </label>
            <q-select v-model="field.encodingType" :options="encodingTypes" outlined dark
              @update:model-value="onEncodingTypeChange" />
          </FormField>
          <template v-if="field.encodingType === 'number'">
            <FormField>
              <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                {{ t('nftCategoryField.decimals') }}
              </label>
              <q-input v-model="field.decimals" type="number" outlined dark min="0" max="18" />
            </FormField>
            <FormField>
              <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                {{ t('nftCategoryField.unit') }}
              </label>
              <q-input v-model="field.unit" outlined dark :placeholder="t('nftCategoryField.unitPlaceholder')" />
            </FormField>
          </template>
          <div class="row justify-end q-gutter-x-sm q-mt-md">
            <q-btn color="grey-6" :label="t('button.cancel')" flat @click="onDialogCancel" />
            <q-btn color="primary" :label="t('nftCategoryField.submit')" unelevated @click="onSubmit" />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormField from 'components/FormField.vue'

const { t } = useI18n()

const field = ref({
  identifier: '',
  name: '',
  description: '',
  encodingType: 'hex',
  decimals: 0,
  unit: ''
})

const encodingTypes = [
  'binary', 'boolean', 'hex', 'https-url', 'ipfs-cid', 'utf8', 'locktime', 'number'
]

// Once the user edits the identifier by hand, the suggestion stops tracking the name for
// the rest of the dialog (clearing the field does not re-enable it).
const identifierEdited = ref(false)

const toCamelCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, char: string | undefined) => char?.toUpperCase() ?? '')

watch(() => field.value.name, (name) => {
  if (!identifierEdited.value) {
    field.value.identifier = toCamelCase(name ?? '')
  }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const onEncodingTypeChange = (val: string) => {
  if (val !== 'number') {
    field.value.decimals = 0
    field.value.unit = ''
  }
}

const onSubmit = () => {
  const encoding = field.value.encodingType === 'number'
    ? { type: 'number' as const, decimals: field.value.decimals, unit: field.value.unit }
    : { type: field.value.encodingType as any }

  onDialogOK({
    key: field.value.identifier,
    value: {
      name: field.value.name?.trim() || undefined,
      description: field.value.description?.trim() || undefined,
      encoding
    }
  })
}
</script>
