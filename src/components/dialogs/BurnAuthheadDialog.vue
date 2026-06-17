<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end">
        <q-btn flat color="negative" icon="close" @click="onCancel" />
      </div>
      <q-avatar class="q-mx-sm" v-if="icon">
        <img :src="icon" alt="">
      </q-avatar>
      <span v-if="symbol" class="q-mx-sm text-bold">{{ symbol }}</span>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Burn Token Identity</q-toolbar-title>
      </q-toolbar>
      <div class="q-mx-md text-justify">
        <q-icon name="warning" color="warning" size="sm"></q-icon>
        <span>
          Warning! This action will burn this token (token of the utxo will be discarded).
          Any fungible token amount and/or minting capability will be lost. This will also
          burn this token identity's AuthHead, this means you'll no longer be able to publish
          an update to the registry.
          <q-btn href="https://github.com/bitjson/chip-bcmr#burned-identities" target="_blank" dense flat no-caps
            color="grey-8" icon="info" size="sm" />
        </span>
      </div>
      <q-card-section>
        <div class="row q-gutter-sm">
          <q-input class="col-12" :model-value="symbol" disable label="Symbol" filled></q-input>
          <q-input class="col-12" :model-value="category" disable label="Token ID/Category" filled></q-input>
          <q-input class="col-12" :model-value="amount" disable label="Fungible Reserves" filled></q-input>
          <q-input class="col-12" :model-value="capability" disable label="NFT Capability" filled></q-input>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat label="Cancel" color="grey-6" @click="onCancel" />
        <q-btn flat icon="mdi-fire" label="Burn" text-color="orange" @click="onBurn" />
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
  amount?: string
  capability?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  burn: []
}>()

const onCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const onBurn = () => {
  emit('update:modelValue', false)
  emit('burn')
}
</script>
