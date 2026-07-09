<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Add Link">
    <q-card class="q-dialog-plugin q-pa-md ">
      Add Link
      <q-card-section class="text-h6">
        <div>
          <FormField>
            <label class="q-my-sm">Name</label>
            <q-select v-model="uriName" :options="uriOptions" outlined></q-select>
          </FormField>

          <FormField>
            <label class="q-my-sm">Link</label>
            <q-input v-model="uriValue" outlined clearable :rules="[(v) => v.length > 1 || 'Required']"
              placeholder="https://" bottom-slots>
            </q-input>
          </FormField>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="onDialogCancel" />
        <q-btn color="primary" label="OK" @click="onOkClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue';

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

function onOkClick() {
  onDialogOK({ [uriName.value.value]: uriValue.value })
}
</script>