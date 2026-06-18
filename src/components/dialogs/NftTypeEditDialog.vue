<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin bg-dark text-grey-2" style="min-width: 400px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEdit ? 'Edit NFT Type' : 'Add NFT Type' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogHide" />
      </q-card-section>
      <q-card-section class="q-gutter-y-md">
        <FormField>
          <label class="text-caption text-grey-5">Type (Hex Key)</label>
          <q-input v-model="form.type" filled :disable="isEdit" :rules="[(v: string) => !!v || 'Type key is required']" />
        </FormField>
        <FormField>
          <label class="text-caption text-grey-5">Name</label>
          <q-input v-model="form.name" filled :rules="[(v: string) => !!v || 'Name is required']" />
        </FormField>
        <FormField>
          <label class="text-caption text-grey-5">Description</label>
          <q-input v-model="form.description" type="textarea" filled autogrow />
        </FormField>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey-6" @click="onDialogHide" />
        <q-btn flat label="Save" color="primary" :disable="!form.type || !form.name" @click="onOKClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import FormField from 'components/FormField.vue'

const props = defineProps<{
  nftType?: NftType
  typeKey?: string
}>()

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const isEdit = computed(() => !!props.nftType && !!props.typeKey)

const form = ref({
  type: props.typeKey || '',
  name: props.nftType?.name || '',
  description: props.nftType?.description || ''
})

const onOKClick = () => {
  const nft: NftType = {
    name: form.value.name,
    description: form.value.description || undefined
  }
  onDialogOK({ type: form.value.type, nft })
}
</script>
