<!-- Quasar dialog -->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" full-width persistent>
    <q-card class="q-px-sm full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5  text-center">
          {{ title || 'NFT Metadata' }}
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-table v-model:pagination="nftTypesPagination" flat :rows="nftsTypes" color="warning"
          style="background:unset;margin-bottom: 3rem;" :columns="[
    {
      name: 'nfttype', label: 'Nft Type',
      field: r => '',
      align: 'left',
      headerStyle: 'padding: 1.5em',
    },
    {
      name: 'actions', label: '',
      field: r => '',
      align: 'center',
      headerStyle: 'padding: 1.5em',
    },
  ]" :rows-per-page-options="[12, 24, 36]" row-key="id" :visible-columns="['nfttype', 'actions']" bordered>
          <template v-slot:body-cell-nfttype="value">
            <td>
              <div class="row justify-left items-center flex wrap q-gutter-sm">
                <div class="col-auto">
                  <q-avatar v-if="value.row[Object.keys(value.row)[0]]?.uris?.icon" rounded>
                    <q-img :src="ipfsToGatewayUrl(value.row[Object.keys(value.row)[0]].uris.icon)" />
                  </q-avatar>
                  <q-avatar v-else-if="value.row[Object.keys(value.row)[0]]?.uris?.image" rounded>
                    <q-img :src="ipfsToGatewayUrl(value.row[Object.keys(value.row)[0]].uris.image)" />
                  </q-avatar>
                  <q-avatar v-else-if="value.row[Object.keys(value.row)[0]]?.uris?.asset" rounded>
                    <q-img :src="ipfsToGatewayUrl(value.row[Object.keys(value.row)[0]].uris.asset)" />
                  </q-avatar>
                  <q-icon v-else name="broken_image" size="xl" color="grey-8" round></q-icon>
                </div>
                <div class="col text-wrap text-left" style="font-size: 1.5em; letter-spacing: 2px;">
                  <div style="font-variant-numeric: tabular-nums;" class="text-grey-4 text-bold">
                    {{ !value.row.identitySnapshot?.nfts?.parse?.bytecode &&
    value.row.identitySnapshot?.nfts?.parse?.bytecode !== '00d26b' ?
    `#${formatCommitment(Object.keys(value.row)[0], 'vm-number',
      'decimal')}` :
    Object.keys(value.row)[0] }}
                  </div>
                  <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                    {{ `(${value.row[Object.keys(value.row)[0]]?.name})` }}
                  </div>
                </div>
                <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                  <div class="text-grey-6 ellipsis-2-lines">
                    Description: {{
    value.row[Object.keys(value.row)[0]].description
    || '<no description>' }}
                  </div>
                </div>
                <!-- <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                  <div class="text-grey-8">
                    Commitment: {{
    Object.keys(value.row)[0]
  }}
                  </div>
                </div>
                <div v-if="value.row.capability" class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                  <div class="text-grey-8">
                    Capability: {{
    value.row.capability
  }}
                  </div>
                </div> -->
                <div v-if="Object.keys(value.row[Object.keys(value.row)[0]]).length == 0"
                  class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                  <div class="text-grey-8">
                    {{ `<no metadata>` }}
                  </div>
                </div>
              </div>
            </td>
          </template>

        </q-table>

        <div class="row justify-end q-gutter-x-lg q-mb-lg q-mr-lg ">
          <q-btn @click.stop="onDialogHide()" text-color="negative" size="lg">Close</q-btn>
          <q-btn @click.stop="onDialogOK(nftsTypes)" color="primary" size="lg" type="submit">Publish</q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { NftType } from 'mainnet-js'
import { ipfsToGatewayUrl } from 'src/app/utils'
import { useLocalForage } from 'src/composables/useLocalForage'
import { formatCommitment } from 'src/app/utils'
import { AuthchainIdentity } from 'src/app'
import { PaginatedData } from 'src/app/types'

const $q = useQuasar()
const localForage = useLocalForage()
defineEmits([
  ...useDialogPluginComponent.emits,
])

const props = defineProps<{
  authhead: AuthchainIdentity,
  nftsTypes: { [nftTypeKey: string]: NftType }[], // NftType(s)
  title?: string
}>()

// const nftTypes = ref<PaginatedData>({
//   count: 0,
//   limit: 10,
//   offset: 0,
//   next: null,
//   previous: null,
//   results: [],
// })

const nftTypesPagination = ref<{
  sortBy: string,
  descending: boolean,
  page: number,
  rowsPerPage: number
}>({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10
})

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

onMounted(async () => {
  console.log('Mounted')
})


</script>
