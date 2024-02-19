<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Add Link">
    <q-card class="q-dialog-plugin q-pa-md ">
      <q-card-section class="text-h6">Add Link</q-card-section>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-select v-model="uriName" :options="uriOptions" outlined></q-select>
        <q-input v-model="uriValue" label="Value*" outlined clearable :rules="[(v) => v.length > 1 || 'Required']"
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

const uriOptions = [
  { label: 'Icon', value: 'icon', icon: 'image' },
  { label: 'Web', value: 'web', icon: 'web' },
  { label: 'Telegram', value: 'telegram', icon: 'telegram' },
  { label: 'Support', value: 'support', icon: 'support' },
  { label: 'Forum', value: 'forum', icon: 'forum' },
  { label: 'Blog', value: 'blog', icon: 'book' },
  { label: 'X (Formely Twitter)', value: 'x', icon: 'clear' },
  { label: 'YouTube', value: 'youtube', icon: 'smart_display' },
  { label: 'Reddit', value: 'reddit', icon: 'reddit' }
]
const props = defineProps<{
  name?: string,
  value?: string
}>()

const uriName = ref()
const uriValue = ref()

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

function onSubmit() {
  onDialogOK({ [uriName.value.value]: uriValue.value })
}
</script>