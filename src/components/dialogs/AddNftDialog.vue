<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold" style="text-wrap: wrap;">
          Add NFT Type
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <div class="q-mx-md text-justify">
          <q-icon name="info" color="primary" size="sm" />
          <span class="text-wrap text-justify">
            Enter the {{ isSequential ? 'sequence/item number' : 'bottom alt stack hex' }}
            to identify this new NFT type. You'll then be taken to the NFT editor.
          </span>
        </div>
        <div class="q-gutter-sm">
          <q-input v-model="inputValue" :label="inputLabel" filled dense
            :type="isSequential ? 'number' : 'text'"
            :hint="hint"
            @keyup.enter="onConfirm"
            autofocus />
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat label="Cancel" color="grey-6" @click="onCancel" />
        <q-btn flat icon="add" label="Add" color="primary" @click="onConfirm" :disable="!isValid" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  collectionType: 'sequential' | 'parsable'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  ok: [typeKey: string]
}>()

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
  emit('update:modelValue', false)
  emit('cancel')
}

const onConfirm = () => {
  if (!isValid.value) return
  const typeKey = inputValue.value.trim()
  inputValue.value = ''
  emit('update:modelValue', false)
  emit('ok', typeKey)
}
</script>
