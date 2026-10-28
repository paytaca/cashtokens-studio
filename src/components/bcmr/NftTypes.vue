<template>
  <q-table title="NFT Types" :rows="tableRows" :columns="columns" row-key="hexKey" flat bordered
    :pagination="{ rowsPerPage: 10 }">
    <!-- Top Right Button: Add New Entry -->
    <template v-slot:top-right>
      <q-btn color="primary" icon="add" label="Add Type" @click="addNewRow" />
    </template>

    <!-- Custom Body Slot to make fields editable directly in the row -->
    <template v-slot:body="props">
      <q-tr :props="props">
        <!-- Hex Key Column (The Object Key) -->
        <q-td key="hexKey" :props="props">
          <q-input v-model="props.row.hexKey" dense borderless
            @update:model-value="(val) => updateKey(props.row.originalKey, val as string)" />
        </q-td>

        <!-- NftType Property: Name -->
        <q-td key="name" :props="props">
          <q-input v-model="types[props.row.originalKey]!.name" dense borderless />
        </q-td>

        <!-- Actions Column (Delete Row) -->
        <q-td key="actions" :props="props" align="right">
          <q-btn flat round color="negative" icon="delete" dense @click="deleteRow(props.row.originalKey)" />
        </q-td>
      </q-tr>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QTableColumn } from 'quasar'
import { type NftType } from 'src/core/bcmr/bcmr-v2.schema';
const { t } = useI18n()
const props = defineProps<{
  bytecode?: string
}>()

// Your defineModel layout accepting multiple object keys
const types = defineModel<{ [commitmentOrBottomAtStackHex: string]: NftType }>('nftTypes', { required: true })

// Define Table Columns
const columns: QTableColumn[] = [
  {
    name: 'key',
    align: 'left',
    label: props.bytecode ? 'Bottom Alt Stack Hex' : 'Sequence Number',
    field: 'hexKey',
    sortable: true
  },

  {
    name: 'key',
    align: 'left',
    label: t('label.registry.name'),
    field: 'hexKey',
    sortable: true
  },

]

// Transform the Object {} into an Array [] for q-table consumption
const tableRows = computed(() => {
  return Object.entries(types.value).map(([key, value]) => ({
    originalKey: key, // Kept to track changes even if the user edits the hexKey input
    hexKey: key,
    ...value
  }))
})

// Action: Handle renaming the dictionary key safely
function updateKey(oldKey: string, newKey: string) {
  if (!newKey || oldKey === newKey) return
  if (types.value[newKey]) {
    // Optional: Add logic to handle duplicate key collisions here
    return
  }

  // Clone the value to the new key, then delete the old key
  types.value[newKey] = { ...types.value[oldKey] } as NftType
  delete types.value[oldKey]
}

// Action: Add a blank new type entry
function addNewRow() {
  const tempKey = `new_key_${Date.now()}`
  types.value[tempKey] = {
    name: '',
  }
}

// Action: Remove an entry from the dictionary
function deleteRow(key: string) {
  delete types.value[key]
}
</script>
