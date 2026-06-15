<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin bg-dark" style="min-width: 400px">
      <q-toolbar class="q-pa-md q-pb-none">
        <q-toolbar-title class="text-h6 text-white text-weight-medium">
          <q-icon name="palette" size="20px" class="q-mr-sm" color="primary" />
          Add NFT Attribute
        </q-toolbar-title>
        <q-btn dense flat round icon="close" color="grey-4" @click="onDialogCancel" />
      </q-toolbar>
      <q-card-section class="q-pa-md">
        <div>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              Attribute Name
            </label>
            <q-input v-model="attribute.name" outlined dark clearable placeholder="e.g. Color"
              :rules="[(v) => v.length > 0 || 'Required']" autofocus />
          </FormField>
          <FormField>
            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
              Value
            </label>
            <q-input v-model="attribute.value" outlined dark clearable placeholder="e.g. Red"
              :rules="[(v) => v.length > 0 || 'Required']" />
          </FormField>
          <div class="row justify-end q-gutter-x-sm">
            <q-btn color="grey-6" label="Cancel" flat @click="onDialogCancel" />
            <q-btn color="primary" label="Add Attribute" unelevated @click="onSubmit" />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue';
import FormField from 'src/components/FormField.vue'

const props = defineProps<{
  name?: string,
  value?: string
}>()

const attribute = ref<{ name: string, value: string }>({
  name: props.name || '',
  value: props.value || ''
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

function onSubmit() {
  onDialogOK(attribute.value)
}
</script>
