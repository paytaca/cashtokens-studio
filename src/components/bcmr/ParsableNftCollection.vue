<template>
  <div>
    <FormField>
      <label class="form-label q-mb-xs">
        Bytecode
      </label>
      <q-input v-model="parsableNftCollection.bytecode" outlined placeholder="Enter parsing bytecode (hex string)"
        :rules="[(v: string) => !v || /\b[0-9A-Fa-f]+\b/g.test(v) || 'Must be a hex string']" />
    </FormField>
    <FormField>
      <div class="row items-center justify-between q-mb-sm">
        <label class="form-label">
          Fields
        </label>
        <q-btn icon="add" color="secondary" label="Add Field"
          :disable="!parsableNftCollection.bytecode && mode === 'view'" @click="addField" no-caps dense flat />
      </div>
      <div v-if="fieldEntries.length > 0" class="q-gutter-y-xs">
        <div v-for="entry in fieldEntries" :key="entry.key"
          class="row items-center justify-between bg-grey-9 q-pa-sm border-radius-8">
          <div class="text-body2 text-white">
            <span class="text-weight-medium">{{ entry.key }}:</span>
            <span class="text-grey-4 q-ml-xs">{{ entry.encodingType }}</span>
          </div>
          <q-btn dense flat round icon="close" size="sm" color="negative" @click="removeField(entry.key)" />
        </div>
      </div>
      <div v-else class="text-caption text-grey-6">No fields defined</div>
    </FormField>
    <slot name="nftTypes">
      <!-- <FormField>
        <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
          NFTs
        </label>
        <NftTypes v-model:nft-types="parsableNftCollection.types" />
      </FormField> -->
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import type { NftCategoryField as NftCategoryFieldI, ParsableNftCollection } from 'src/core/bcmr/bcmr-v2.schema'
import NftTypes from './NftTypes.vue'
import NftCategoryField from './NftCategoryField.vue'
import FormField from 'components/FormField.vue'
import { useRoute } from 'vue-router'

const $q = useQuasar()
const route = useRoute()
const parsableNftCollection = defineModel<ParsableNftCollection>('parsableNftCollection', { required: true })
const fields = defineModel<NftCategoryFieldI>('fields')

const mode = computed(() => {
  return route.path.endsWith('edit') ? 'edit' : 'view'
})

const fieldsModel = computed({
  get: () => fields.value ?? {},
  set: (val) => { fields.value = val }
})

const fieldEntries = computed(() => {
  return Object.entries(fieldsModel.value).map(([key, val]) => ({
    key,
    encodingType: val.encoding.type
  }))
})

const addField = () => {
  $q.dialog({
    component: NftCategoryField,
  }).onOk((result: { key: string, value: { name?: string, encoding: any } }) => {
    fieldsModel.value = { ...fieldsModel.value, [result.key]: result.value }
  })
}

const removeField = (key: string) => {
  const next = { ...fieldsModel.value }
  delete (next as any)[key]
  fieldsModel.value = next
}
</script>
