<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Add NFT Attribute">
    <q-card class="q-dialog-plugin q-pa-md q-gutter-md">
      <q-card-section class="text-h6">Add NFT Attribute</q-card-section>
      <q-form @submit.prevent="onSubmit">
        <q-input v-model="attribute.name" label="Attribute Name*" outlined clearable
          :rules="[(v) => v.length > 0 || 'Required']" bottom-slots></q-input>
        <q-input v-model="attribute.value" label="Value*" outlined clearable :rules="[(v) => v.length > 1 || 'Required']"
          bottom-slots></q-input>
        <q-card-actions align="right">
          <q-btn color="negative" size="lg" flat label="Cancel" @click="onDialogCancel" />
          <q-btn color="primary" size="lg" flat label="OK" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue';
import { stringify } from 'querystring';

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