<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-avatar class="q-mx-sm" v-if="icon">
        <img :src="icon" alt="">
      </q-avatar>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold" style="text-wrap: wrap;">
          Unlock
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <div class="q-mx-md text-justify">
          <q-icon name="warning" color="warning" size="sm"></q-icon>
          <span class="text-wrap text-justify">
            You are about to release the token identity output from the Authguard Vault.
            Doing so will transfer the token category's identity output to your regular token wallet address and it will
            be removed from the Created Tokens dashboard.
          </span>
        </div>
        <div class="q-gutter-sm">
          <q-input :model-value="symbol" label="Symbol" filled dense disable autogrow></q-input>
          <q-input :model-value="category" label="Token ID/Category" filled dense disable autogrow></q-input>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat label="Cancel" color="grey-6" @click="onCancel" />
        <q-btn flat icon="lock_open" label="Unlock" color="primary" @click="onUnguard" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  icon?: string
  symbol?: string
  category: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  unguard: []
}>()

const onCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const onUnguard = () => {
  emit('update:modelValue', false)
  emit('unguard')
}
</script>
