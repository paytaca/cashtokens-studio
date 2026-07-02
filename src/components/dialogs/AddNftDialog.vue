<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold" style="text-wrap: wrap;">
          Add NFT Metadata
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <FormField>
          <label class="q-mb-xs">Enter the {{ isSequential ? 'NFTs sequence number' : 'NFTs hex identifier' }}</label>
          <q-input v-model="inputValue" outlined :type="isSequential ? 'number' : 'text'" :hint="hint"
            @keyup.enter="onConfirm" autofocus />
        </FormField>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat label="Cancel" @click="onCancel" />
        <q-btn label="Ok" color="primary" @click="onConfirm" :disable="!isValid" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'

const props = defineProps<{
  collectionType: 'sequential' | 'parsable'
}>()

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const inputValue = ref('')

const isSequential = computed(() => props.collectionType === 'sequential')

const inputLabel = computed(() => isSequential.value ? 'NFT Sequence/Item Number' : 'Bottom Alt Stack Hex')

const hint = computed(() => isSequential.value ? 'e.g. 1, 2, 3...' : 'Hex string e.g. 00ab')

const isValid = computed(() => {
  if (!inputValue.value) return false
  if (isSequential.value) {
    return /^\d+$/.test(inputValue.value) && BigInt(inputValue.value) >= 0n
  }
  // For parsable, require even-length hex string
  return /^[0-9a-fA-F]{2,}$/.test(inputValue.value) && inputValue.value.length % 2 === 0
})

const onCancel = () => {
  inputValue.value = ''
  onDialogCancel()
}

const onConfirm = () => {
  if (!isValid.value) return
  const typeKey = inputValue.value.trim()
  inputValue.value = ''
  onDialogOK(typeKey)
}
</script>
