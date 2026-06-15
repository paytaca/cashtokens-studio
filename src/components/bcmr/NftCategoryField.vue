<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin bg-dark" style="min-width: 400px">
      <q-toolbar class="q-pa-md q-pb-none">
        <q-toolbar-title class="text-h6 text-white text-weight-medium">
          <q-icon name="schema" size="20px" class="q-mr-sm" color="primary" />
          Add Field
        </q-toolbar-title>
        <q-btn dense flat round icon="close" color="grey-4" @click="onDialogCancel" />
      </q-toolbar>
      <div class="q-pa-md">
        <div>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              Identifier
            </label>
            <q-input v-model="field.identifier" outlined dark clearable placeholder="e.g. pledgedBch"
              :rules="[(v: string) => v.length > 0 || 'Required']" autofocus />
          </FormField>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              Name
            </label>
            <q-input v-model="field.name" outlined dark clearable placeholder="e.g. BCH Pledged" />
          </FormField>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              Encoding Type
            </label>
            <q-select v-model="field.encodingType" :options="encodingTypes" outlined dark
              @update:model-value="onEncodingTypeChange" />
          </FormField>
          <template v-if="field.encodingType === 'number'">
            <FormField>
              <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                Decimals
              </label>
              <q-input v-model="field.decimals" type="number" outlined dark min="0" max="18" />
            </FormField>
            <FormField>
              <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                Unit
              </label>
              <q-input v-model="field.unit" outlined dark placeholder="e.g. BCH" />
            </FormField>
          </template>
          <div class="row justify-end q-gutter-x-sm q-mt-md">
            <q-btn color="grey-6" label="Cancel" flat @click="onDialogCancel" />
            <q-btn color="primary" label="Add Field" unelevated @click="onSubmit" />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue'
import FormField from 'components/FormField.vue'

const field = ref({
  identifier: '',
  name: '',
  encodingType: 'hex',
  decimals: 0,
  unit: ''
})

const encodingTypes = [
  'binary', 'boolean', 'hex', 'https-url', 'ipfs-cid', 'utf8', 'locktime', 'number'
]

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

  onDialogOK({ key: field.value.identifier, value: { name: field.value.name || undefined, encoding } })
}
</script>
