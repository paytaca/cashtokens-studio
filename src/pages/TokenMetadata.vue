<template>
  <q-page :class="$q.screen.gt.xs ? 'q-mx-lg' : ''">
    <div class="row justify-center" :class="$q.screen.gt.xs ? 'q-mx-sm' : ''">
      <div class="col-xs-12 col-md-10">
        <div class="text-right q-gutter-xs items-end">
          <div v-if="$q.screen.xs">
            <q-btn id="authchain-action-buttons" icon="menu" size="md" round flat dense
              @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
              <q-menu>
                <q-list>
                  <q-item clickable v-close-popup @click.stop="openRegistryPublisherDialog">
                    Publish Registry From URL
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainRegistryFromFilePublisherDialog.__name, tokenStore.token as AuthchainIdentity)">
                    Publish Registry From File
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
          <div v-else>
            <q-btn icon="upload_file" flat round size="lg"
              @click.stop="openDialog(AuthchainRegistryFromFilePublisherDialog.__name, tokenStore.token as AuthchainIdentity)">
              <q-tooltip>Publish new metadata registry from file</q-tooltip>
            </q-btn>
            <q-btn icon="cloud_upload" flat round size="lg" @click.stop="openRegistryPublisherDialog">
              <q-tooltip>Publish new metadata registry from URL</q-tooltip>
            </q-btn>
            <q-btn @click.stop="downloadPublishedRegistry" size="lg" icon="cloud_download" flat round>
              <q-tooltip>Download currently published registry</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>
      <div class="col-xs-12 col-md-10 justify-center">
        <div class="row justify-center text-center">
          <q-file ref="newTokenIconFilePicker" v-model="newTokenIconFile" accept=".jpg,.png, image/*"
            @rejected="() => console.log('rejected')" style="visibility: hidden; width:0px">
          </q-file>
          <q-card class="self-center cursor-pointer shadow-2"
            style="height:15em; width: 15em;max-width:fit-content;visibility: visible!important;"
            @click="(evt: any) => newTokenIconFilePicker.pickFiles(evt)" bordered rounded>
            <q-img v-if="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon"
              :src="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon" width="15em" height="15em">
            </q-img>
            <q-icon v-else name="broken_image" color="grey-8" size="4em"></q-icon>
            <q-inner-loading :showing="newTokenIconUploading" style="background-color: transparent;">
              <q-spinner color="primary" size="lg" />
            </q-inner-loading>
          </q-card>
        </div>

        <div>
          <div class="row flex justify-center">
            <!-- <div class="col-xs-12 text-center">
              <TokenSymbol v-if="tokenStore.token?.identitySnapshot?.token?.symbol"
                :symbol="tokenStore.token?.identitySnapshot?.token?.symbol" />
            </div> -->
            <!-- <div v-if="newTokenIconPreview" class="col-12 q-mb-sm text-center">
              <span class="text-grey" style="font-family: monospace;">Preview</span>
            </div> -->
            <!-- <div class="col-xs-12 text-center q-gutter-sm">
              <div class="row justify-center q-px-sm q-py-sm border" style="border-radius: 1em;">

                <div class="col-12 relative-position text-center row justify-center">
                  <q-file v-model="newTokenIconFile" accept=".jpg,.png, image/*" @rejected="() => console.log('rejected')"
                    style="visibility: hidden;max-height:120px" class="relative-position">
                    <q-avatar class="col-12 q-mb-sm" size="5em"
                      style=" max-height:100px; visibility: visible !important; cursor: pointer;" square>
                      <q-img v-if="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon"
                        :src="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon" alt=""
                        style="width:150px" fit="cover" />
                      <q-icon v-else name="broken_image" color="grey-8" size="4em"></q-icon>
                      <q-inner-loading :showing="newTokenIconUploading"
                        style="background-color: transparent;max-height:150px;">
                        <q-spinner-box color="primary" />
                      </q-inner-loading>
                    </q-avatar>
                  </q-file>
                </div>
              </div>
            </div> -->
          </div>
          <q-icon v-if="status === 'burned'" name="local_fire_department" color="negative" size="lg">
            <q-tooltip>This token is burned</q-tooltip>
          </q-icon>
          <AuthchainRegistryPublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
          <AuthchainRegistryFromFilePublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryFromFilePublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
          <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-unguarded="onUnguard" />
          <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-burned="onBurn" />
          <q-expansion-item label="Registry" class="q-px-md q-pt-sm q-my-sm" icon="menu_book">
            <div class="q-mx-md q-gutter-sm q-my-md">
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setSchema(v)"
                :model-value="bcmr?.$schema" label="Schema" filled dense disable></q-input>
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setVersion(v)"
                :model-value="bcmr?.versionString" label="Registry Version" filled dense disable>
              </q-input>
              <q-input v-if="bcmrIsModified" class="registry-field" v-model="bcmrNewVersion" label="New Registry Version"
                filled dense>
                <template v-slot:prepend>
                  <q-icon name="priority_high" flat color="warning" size="xs"></q-icon>
                </template>
              </q-input>
              <q-input class="registry-field" :model-value="bcmr?.latestRevision" label="Latest Revision" filled dense
                disable>
              </q-input>
              <q-input v-if="bcmrIsModified" class="registry-field" v-model="bcmrNewLatestRevision"
                label="New Latest Revision Value" filled dense>
                <template v-slot:prepend>
                  <q-icon name="priority_high" flat color="warning" size="xs"></q-icon>
                </template>
              </q-input>
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setLicense(v)"
                :model-value="bcmr?.license" label="License" placeholder="Example: CC0-1.0"
                aria-placeholder="Example: CC0-1.0" filled dense></q-input>
            </div>
          </q-expansion-item>
          <q-expansion-item v-model="expansionItemTwo" label="IdentitySnapshot" class="q-px-md q-pt-sm q-my-sm"
            icon="event_note">
            <div class="q-mx-md q-gutter-sm q-my-md">
              <q-input class="registry-field" :model-value="authbase" label="Authbase" filled dense disabled
                readonly></q-input>
              <q-input class="registry-field" :model-value="identityHistoryTimestamp" label="Identity History Timestamp"
                filled dense disabled readonly></q-input>
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenIdentityName(v)"
                :model-value="bcmr?.identitySnapshot?.name" label="Name" filled dense></q-input>
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenIdentityDescription(v)"
                :model-value="bcmr?.identitySnapshot?.description" label="Description" filled dense></q-input>
            </div>
          </q-expansion-item>
          <q-expansion-item v-model="expansionItemFive" label="IdentitySnapshot.URIs" class="q-px-md q-pt-sm q-my-sm"
            icon="link">
            <div class="q-mx-md q-gutter-sm q-my-md">
              <q-input
                v-for="[k], i  in  Object.entries(bcmr?.getIdentitySnapshot(authbase as string, identityHistoryTimestamp as string)?.uris || {}) "
                :key="i" input-class="registry-field"
                @update:model-value="(v: any) => bcmr?.setIdentitySnapshotUri(authbase as string, identityHistoryTimestamp as string, { [k]: v })"
                :model-value="bcmr?.getIdentitySnapshot(authbase as string, identityHistoryTimestamp as string)?.uris?.[k]"
                :label="k" filled dense>
                <template v-slot:after>
                  <q-btn text-color="negative" icon="delete"
                    @click="bcmr?.removeIdentitySnapshotUri(authbase as string, identityHistoryTimestamp as string, k)"></q-btn>
                </template>
                <template v-slot:prepend>
                  <q-avatar v-if="k == 'icon'"
                    @click="bcmr?.removeIdentitySnapshotUri(authbase as string, identityHistoryTimestamp as string, k)">
                    <q-img v-if="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon"
                      :src="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon" />
                    <q-icon v-else name="broken_image" color="grey-8" size="4em"></q-icon>
                  </q-avatar>
                </template>
              </q-input>
              <div class="text-right">
                <q-btn @click="openAddUriDialog" icon="add" text-color="primary">
                </q-btn>
              </div>
            </div>
          </q-expansion-item>
          <q-expansion-item v-model="expansionItemThree" label="Token" class="q-px-md q-pt-sm q-my-sm" icon="token">
            <div class="q-mx-md q-gutter-sm q-my-md">
              <q-input class="registry-field" :model-value="bcmr?.identitySnapshot?.token?.category" label="Category"
                filled dense disabled readonly></q-input>
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenIdentityName(v)"
                :model-value="bcmr?.identitySnapshot?.token?.symbol" label="Symbol" filled dense></q-input>
              <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenIdentityName(v)"
                :model-value="bcmr?.identitySnapshot?.token?.decimals" label="Decimals" filled dense></q-input>
            </div>
          </q-expansion-item>
          <q-expansion-item v-model="expansionItemFour" label="Nfts"
            :icon="nftTypesSelectedForPublication.length > 0 ? 'priority_high' : 'collections'"
            class="q-px-md q-pt-sm q-my-sm" :class="nftTypesSelectedForPublication.length > 0 ? 'text-warning' : ''"
            style="overflow-x:scroll">
            <q-tabs v-model="nftTypesShown" active-color="warning">
              <q-tab name="published" label="Published" />
              <q-tab name="unpublished" label="Unpublished" />
              <q-tab name="minted" label="Minted" />
            </q-tabs>
            <q-tab-panels v-model="nftTypesShown" style="background: unset">
              <q-tab-panel name="published" label="Published">
                <div class="text-grey-5 row items-center">
                  <q-icon name="info" class="text-grey-5 q-mr-sm"></q-icon>
                  <span>These contains the list of the NFTs defined on the
                    currently published token metadata.</span>
                </div>
              </q-tab-panel>
              <q-tab-panel name="unpublished" label="Unpublished">
                <div class="text-grey-5 row items-center">
                  <q-icon name="info" class="text-grey-5 q-mr-sm"></q-icon>
                  <span>These contains the list of temporarily saved unpublished NFTs. Select an item and
                    click <span class="text-primary"> 'Add Selected Item' </span> to add
                    the NFT metadata to the registry, the added item will be included when you publish the revision. Click
                    <span class="text-negative">'Delete Selected Item'</span> to remove selected item from the local
                    storage.</span>
                </div>
                <div v-if="nftTypesSelected.length > 0" class="q-gutter-sm row items-center q-mt-sm">
                  <span class="text-grey-4"></span>
                  <q-btn text-color="negative" @click.stop="deleteSelectedUnpublishedNfts" no-caps>Delete Selected Item
                  </q-btn>
                  <q-btn text-color="primary" @click.stop="commitSelectedUnpublishedNfts" no-caps>Add Selected
                    Item</q-btn>
                  <q-btn v-if="nftTypesSelectedForPublication.length > 0" @click.stop="undoCommitOfUnpublishedNfts"
                    text-color="warning">Undo Add</q-btn>
                </div>
              </q-tab-panel>
              <q-tab-panel name="minted" label="Minted">
                <div class="text-grey-5 row items-center">

                  <span><q-icon name="info" class="text-grey-5 q-mr-sm inline"></q-icon>These contains the list of the
                    minted
                    tokens/existing tokens of this token
                    category.</span>
                  <div class="col-12 text-right">
                    <q-checkbox v-if="nftTypesShown == 'minted'" v-model="showMintersInMintedNfts" class="self-right">
                      Show Minters
                    </q-checkbox>
                  </div>
                </div>
              </q-tab-panel>
            </q-tab-panels>
            <div style="overflow-x: scroll">
              <q-table v-model:pagination="nftTypesPagination" @request="onTableRequest" flat :rows="nftTypes.results"
                v-model:selected="nftTypesSelected" :selection="nftTypesShown == 'unpublished' ? 'multiple' : 'none'"
                style="background:unset" :columns="[
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
                ]" :rows-per-page-options="nftTypesRowsPerPage" row-key="id" :visible-columns="['nfttype', 'actions']"
                bordered>
                <template v-slot:body-cell-nfttype="value">
                  <td>
                    <div class="row justify-left items-center flex wrap q-gutter-sm">
                      <div class="col-auto">
                        <q-avatar v-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.icon"
                          rounded>
                          <q-img
                            :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.icon)" />
                        </q-avatar>
                        <q-avatar v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.image"
                          rounded>
                          <q-img
                            :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.image)" />
                        </q-avatar>
                        <q-avatar v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.asset"
                          rounded>
                          <q-img
                            :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.asset)" />
                        </q-avatar>
                        <q-icon v-else name="broken_image" size="xl" color="grey-8" round></q-icon>
                      </div>
                      <div class="col text-wrap text-left" style="font-size: 1.5em; letter-spacing: 2px;">
                        <div style="font-variant-numeric: tabular-nums;" class="text-grey-4 text-bold">
                          {{ !value.row.identitySnapshot?.nfts?.parse?.bytecode &&
                            value.row.identitySnapshot?.nfts?.parse?.bytecode !== '00d26b' ?
                            `#${formatCommitment(value.row._meta?.commitment || value.row.commitment, 'vm-number',
                              'decimal')}` :
                            value.row._meta?.commitment || value.row.commitment }}
                        </div>
                        <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                          {{ `(${value.row[value.row._meta?.commitment || value.row.commitment]?.name})` }}
                        </div>
                      </div>
                      <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                        <div class="text-grey-6">
                          Description: {{
                            value.row[value.row._meta?.commitment || value.row.commitment].description
                            || '<no description>' }}
                        </div>
                      </div>
                      <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                        <div class="text-grey-8">
                          Commitment: {{
                            value.row._meta?.commitment || value.row.commitment
                          }}
                        </div>
                      </div>
                      <div v-if="value.row.capability" class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                        <div class="text-grey-8">
                          Capability: {{
                            value.row.capability
                          }}
                        </div>
                      </div>
                      <div v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment]).length == 0"
                        class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                        <div class="text-grey-8">
                          {{ `<no metadata>` }}
                        </div>
                      </div>
                    </div>
                  </td>
                </template>
                <template v-slot:body-cell-actions="value">
                  <q-td class="text-center">
                    <div v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment]).length == 0">
                      <q-btn label="Add Metadata" text-color="primary"
                        :to="{ name: 'nft-metadata', query: { authhead: tokenStore.token.txid, commitment: value.row._meta?.commitment || value.row.commitment, capability: value.row.capability, amount: value.row.amount } }"
                        disable>
                      </q-btn>
                      <div class="text-grey-8">under development</div>
                    </div>
                  </q-td>
                </template>
              </q-table>
              <q-inner-loading :showing="nftTypesIsLoading">
                <q-spinner-grid size="30px" />
              </q-inner-loading>
            </div>
          </q-expansion-item>
        </div>
      </div>
    </div>
    <q-footer v-if="bcmrIsModified" reveal position="bottom" class="q-gutter-sm text-right q-pb-md q-px-lg"
      style="background-color: rgb(20,20,20, 0.71);">
      <div class="q-gutter-sm row items-center text-right">
        <q-icon name="warning" size="xs" color="warning"></q-icon><span>Metadata modified.</span>
      </div>
      <q-btn @click.stop="reset" size="md" icon="undo" text-color="negative">
        Undo
      </q-btn>
      <q-btn @click.stop="downloadRevisedRegistry" icon="download" size="md" text-color="primary">
        <q-tooltip>Download suggested revision</q-tooltip>
        Download
      </q-btn>
      <q-btn @click.stop="uploadAndPublishChanges" size="md" color="primary">
        <q-tooltip>Publish new revision</q-tooltip>
        Publish Changes
      </q-btn>

    </q-footer>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch, onBeforeMount, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui'
import TokenSymbol from 'src/components/TokenSymbol.vue';
import { AuthchainIdentity, Bcmr, BcmrIndexer, ChainGraph } from 'src/app';
import { useDialogs } from 'src/composables/useDialogs';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import AddUriDialog from 'src/components/dialogs/AddUriDialog.vue'
import { BcmrStorageArtifact, IconStorageArtifact, PaginatedData } from 'src/app/types';
import { useTokenStore } from 'src/stores/token'
import { ipfsToGatewayUrl, shortenTokenId, formatCommitment } from 'src/app/utils'
import { NftType, delay } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useLocalForage } from 'src/composables/useLocalForage';
import RegistryPublishDialog from 'src/components/dialogs/RegistryPublishDialog.vue';
const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const localForage = useLocalForage()
const tokenStore = useTokenStore()
const bcmr = ref<Bcmr>()
const bcmrNewVersion = ref<string>()
const bcmrNewLatestRevision = ref<string>()
const bcmrIndexer = reactive<BcmrIndexer>(new BcmrIndexer())
const bcmrReadOnly = ref<boolean>(true)
const bcmrUseOnlyLatestIdentityHistory = ref<boolean>(true) // Maintain a single IdentitySnapshot
const bcmrIsModified = computed(() => {
  return bcmr?.value?.isModified || nftTypesSelectedForPublication.value.length > 0
})
const { dialog, dialogData, openDialog, onHide } = useDialogs()
const status = ref<'burned' | 'active' | 'unguarded'>('active')
const newTokenIconFilePicker = ref()
const newTokenIconFile = ref()
const newTokenIconPreview = ref()
const newTokenIconUploading = ref<boolean>(false)
const newTokenIconUploadArtifact = ref<IconStorageArtifact>()

const expansionItemOne = ref<boolean>(true)
const expansionItemTwo = ref<boolean>(false)
const expansionItemThree = ref<boolean>(false)
const expansionItemFour = ref<boolean>(false)
const expansionItemFive = ref<boolean>(false)
const authbase = ref<string>()
const identityHistoryTimestamp = ref<string>()
const newIdentityHistoryTimestamp = ref<string>(new Date().toISOString())
const uploadArtifact = ref<BcmrStorageArtifact>({
  uris: {
    https: '',
    ipfs: ''
  },
  contentHash: ''
})
const nftTypes = ref<PaginatedData>({
  count: 0,
  limit: 10,
  offset: 0,
  next: null,
  previous: null,
  results: [],
})
const nftTypesIsLoading = ref<boolean>()
const nftTypesShown = ref<'published' | 'unpublished' | 'minted'>('published')
const nftTypesSelected = ref<any[]>([])
const nftTypesSelectedForPublication = ref<any[]>([])
const nftTypesTableVisibleCols = computed(() => {
  // if ($q.screen.xs) {
  //   return ['icon', 'name']
  // }
  // if (nftTypesShown.value == 'minted' && $q.screen.gt.xs) {
  //   return ['icon', 'name', 'description', 'commitment', 'capability']
  // }
  return ['icon', 'actions']

})
const showMintersInMintedNfts = ref<boolean>(false)

const nftTypesPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})

const nftTypesRowsPerPage = computed(() => {
  return [12, 24, 36]
})

const openRegistryPublisherDialog = () => {
  $q.dialog({
    component: RegistryPublishDialog,
    componentProps: {
      authhead: tokenStore.token
    }
  }).onOk((tx) => {
    console.log(tx)
  })
}


const deleteSelectedUnpublishedNfts = async () => {
  $q.dialog({
    message: 'Are you sure you want to delete the selected unpublished NFT metadata?',
    ok: 'Yes',
    cancel: 'No',
  }).onOk(async () => {
    console.log('ENTRIES', await localForage.nftTypesStore.keys())

    for (const [i, nftType] of nftTypesSelected.value.entries()) {
      await localForage.nftTypesStore.removeItem(nftType.id) // id is storage key
      console.log('REMOVED', nftType.id)
      nftTypesSelected.value.splice(i)
    }
    populateNftsTable()
  })
}

const commitSelectedUnpublishedNfts = () => {
  nftTypesSelectedForPublication.value = nftTypesSelected.value.map((nftType) => {
    nftType.forPublish = true
    return nftType
  })
}

const undoCommitOfUnpublishedNfts = () => {
  nftTypesSelected.value.forEach((i: any) => i.forPublish = false)
  nftTypesSelectedForPublication.value = []
}

const saveNewIconInIPFS = async () => {
  if (newTokenIconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', newTokenIconFile.value);
      console.log(newTokenIconFile.value)
      newTokenIconUploading.value = true
      const resp = await fetch(`api/tokens/icon/upload?tokenId=${tokenStore.token?.token?.tokenId}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      if (respJson.iconUris?.https) {
        // bcmr.value?.addIconUri(respJson.iconUris?.https)
        bcmr.value?.addIdentitySnapshotUri(authbase.value as string, identityHistoryTimestamp.value as string, { icon: respJson.iconUris?.https })
      }
      newTokenIconUploadArtifact.value = respJson

    } catch (error) {
      console.log(error)
    } finally {
      newTokenIconUploading.value = false
    }
  }
}

const fetchRegistryContentsFromUrl = async (urls: string[]) => {
  let url
  let registry
  for (let uri of urls) {
    try {
      url = new URL(uri)
    } catch (error) {
      try {
        if (uri && uri.includes('.')) {
          uri = uri.startsWith('https://') ? uri : `https://${uri}`
          url = new URL(uri)
        } else {
          uri = uri.startsWith('ipfs://') ? uri : `ipfs://${uri}`
          url = ipfsToGatewayUrl('ipfs://' + uri)
        }
      } catch (error) {
        console.log(error)
        continue
      }
    }
    if (!url) continue
    try {
      const resp = await fetch(url)
      if (resp.status === 200) {
        registry = await resp.json()
        if (registry) break
      } else {
        continue
      }
      break
    } catch (error) {
      throw error
    }
  }
  return registry
}

const fetchPublishedRegistry = async () => {
  const d = $q.dialog({
    class: 'col-auto',
    message: 'Checking last published registry',
    progress: true,
    ok: false
  })

  const pubInfo = await (new ChainGraph()).retrieveLastRegistryPublication(tokenStore.token?.identitySnapshot?.token?.category)
  console.log('PUBINFO', pubInfo)
  d.update({
    message: 'Fetching registry from published URL, please wait...',
  })

  const r = fetchRegistryContentsFromUrl([pubInfo[0].httpsUrl, ...pubInfo[0].uris])
  d.hide()
  return r
}

const openAddUriDialog = (uri: any) => {
  $q.dialog({
    component: AddUriDialog,
    componentProps: {
      name: uri.name,
      value: uri.value
    },
    ok: { label: 'Add' },
    cancel: { label: 'Cancel' }
  }).onOk((uri) => {
    console.log('URI', uri)
    bcmr.value?.addUri(uri)
  })
}

// TODO: Do this in the server 
const createRegistryRevision = async () => {
  const registry = await fetchPublishedRegistry()
  const { identities, ...r } = bcmr.value!
  const newBcmr = new Bcmr({ ...registry, ...r, latestRevision: bcmrNewLatestRevision.value, versionString: bcmrNewVersion.value }) // Full content + changes
  //copy last revision and with a new one and add the nfts
  let identityHistoryTimestamp: any
  if (newBcmr.identities) {
    identityHistoryTimestamp = Object.keys(newBcmr.identities[authbase.value as string] || {})
    identityHistoryTimestamp = identityHistoryTimestamp.sort((date1: string, date2: string) => {
      if (date1 > date2) return -1;
      if (date1 < date2) return 1;
      return 0;
    })[0]

    const oldIdentitySnapshot = newBcmr.identities[authbase.value as string][identityHistoryTimestamp]
    const { token, ...oldIdentitySnapshotFields } = oldIdentitySnapshot
    const { token: _, ...otherIdentitySnapshotMods } = identities![authbase.value as string][identityHistoryTimestamp!]
    newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!] = {
      ...oldIdentitySnapshotFields,
      ...otherIdentitySnapshotMods
    }

    if (token) {
      newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!].token = {
        category: token!.category,
        symbol: token!.symbol,
        decimals: token?.decimals
      }
    }

    if (oldIdentitySnapshot?.token?.nfts?.parse?.types) {
      newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!].token!.nfts = Object.assign({},
        {
          parse: {
            types: {}
          }
        }
      )
      for (const commitment of Object.keys(oldIdentitySnapshot.token.nfts.parse.types)) {
        newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!].token!.nfts!.parse.types[commitment]
          = oldIdentitySnapshot.token.nfts.parse.types[commitment]
      }
    }

    if (nftTypesSelectedForPublication.value.length > 0) {
      if (!newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!].token!.nfts) {
        newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!].token!.nfts = {
          parse: {
            types: {}
          }
        }
      }

      for (const t of nftTypesSelectedForPublication.value) {
        newBcmr.identities[authbase.value as string][newIdentityHistoryTimestamp.value!].token!.nfts!.parse!.types[Object.keys(t)[0]]
          = t[Object.keys(t)[0]]
      }
    }
  }

  if (bcmrUseOnlyLatestIdentityHistory.value) {
    newBcmr.identities![authbase.value as string] = {
      [newIdentityHistoryTimestamp.value]: newBcmr.identities![authbase.value as string][newIdentityHistoryTimestamp.value]
    }
  }

  return newBcmr
}

const downloadRegistryFile = (registry: any) => {
  const blob = new Blob([registry], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bitcoin-cash-metadata-registry.json'; // Specify the desired file name with the appropriate extension
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

const downloadPublishedRegistry = async () => {
  const registry = await fetchPublishedRegistry()
  if (registry) {
    downloadRegistryFile(JSON.stringify(registry))
  } else {
    $q.dialog({
      message: 'No registry found!'
    })
  }
}

const downloadRevisedRegistry = async () => {
  let d = $q.dialog({
    message: 'Drafting new registry revision',
    progress: true,
    ok: false
  })
  await delay(1500)
  d.hide()
  const bcmr = await createRegistryRevision()
  d = $q.dialog({
    message: 'downloading',
    progress: true,
    ok: false
  })
  await delay(1500)
  downloadRegistryFile(bcmr!.getContent())
  d.hide()
}

const onUnguard = () => {
  status.value = 'unguarded'
}

const onBurn = () => {
  status.value = 'burned'
}

const reset = async () => {
  nftTypesSelectedForPublication.value = []
  await initBcmr()
}

const loadNftTypes = async () => {
  nftTypes.value = {
    count: 0,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results: []
  }
  const query = {
    paginated: true,
    limit: nftTypesPagination.value.rowsPerPage,
    offset: (nftTypesPagination.value.page - 1) * nftTypesPagination.value.rowsPerPage
  }
  const fntResp = await (new BcmrIndexer()).fetchNftTypes(tokenStore.token.identitySnapshot.token.category, query)
  if (fntResp) {
    fntResp.results.forEach((item: any, i: number) => {
      item.id = i
    })
    nftTypes.value = fntResp
  }
}

const loadUnpublishedNftTypes = async () => {
  const results: any = []
  for (const [index, key] of (await localForage.nftTypesStore.keys()).entries()) {
    if (key.startsWith(tokenStore?.token?.token?.tokenId)) {

      let item: {
        [key: string]: NftType,
      } & { _meta: { commitment: string }, id: number | string } | null

        = await localForage.nftTypesStore.getItem(key)
      if (item && typeof (item) == 'string') {
        item = JSON.parse(item)
      }
      item!.id = key // Just so we have a row-key in q-table
      item!._meta = { commitment: Object.keys(item!)[0] }

      results.push(item)
    }
  }
  nftTypes.value = {
    count: results.length,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results
  }
}

const loadMintedNftTypes = async () => {
  nftTypes.value = {
    count: 0,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results: []
  }
  const query = {
    paginated: true,
    limit: nftTypesPagination.value.rowsPerPage,
    offset: (nftTypesPagination.value.page - 1) * nftTypesPagination.value.rowsPerPage,
    include_metadata: true,
    capability: ['none', 'mutable']
  }
  if (showMintersInMintedNfts.value) {
    query.capability.push('minting')
  }
  const fntResp = await (new BcmrIndexer()).fetchMintedNftTypes(tokenStore.token.identitySnapshot.token.category, query)
  if (fntResp && fntResp.results) {

    type ItemType = {
      capability?: string,
      commitment?: string,
      amount?: number,
      metadata: { nft?: { [key: string]: NftType } }
    }

    fntResp.results = fntResp.results.map((item: ItemType) => {
      // Transform
      const { metadata, ...rest } = item
      if (item.metadata?.nft) {
        return { ...rest, ...item.metadata.nft }
      }
      return { ...rest, ...{ [item.commitment as string]: {} } }
    })
    nftTypes.value = fntResp
  }
}

const populateNftsTable = async () => {

  nftTypes.value.results = []
  if (nftTypesShown.value == 'unpublished') {
    return await loadUnpublishedNftTypes()
  }
  nftTypesIsLoading.value = true
  if (nftTypesShown.value == 'published') {
    await loadNftTypes()
  }
  else if (nftTypesShown.value == 'minted') {
    await loadMintedNftTypes()
  }
  nftTypesIsLoading.value = false
}


const onTableRequest = async (props: any) => {
  nftTypesPagination.value = props.pagination
  await populateNftsTable()

}

const uploadAndPublishChanges = async () => {
  let d = $q.dialog({
    message: `Drafting revision`,
    progress: true,
    ok: false
  })
  await delay(1200)
  d.hide()
  const registry = await createRegistryRevision()

  d = $q.dialog({
    message: `Storing registry in IPFS. Please wait this may take a while...`,
    progress: true,
    ok: false
  })
  uploadArtifact.value = await registry.storeRegistry() as BcmrStorageArtifact
  d.hide()
  d = $q.dialog({
    component: RegistryPublishDialog,
    componentProps: {
      authhead: tokenStore.token,
      httpsUri: uploadArtifact.value.uris?.https,
      ipfsUri: uploadArtifact.value.uris?.ipfs,
      contentHash: uploadArtifact.value.contentHash,
      unattended: true
    }
  }).onOk((publicationTx) => {
    onPublicationOk(publicationTx)
    // if (publicationTx) {
    //   d = $q.dialog({
    //     message: 'Updating, please wait...',
    //     progress: true,
    //     ok: false
    //   })
    //   await delay(2000)
    //   d.update({
    //     message: 'Updating utxo, please wait...'
    //   })
    //   await tokenStore.token.updateUtxo()
    //   d.update({
    //     message: 'Updating authkey, please wait...'
    //   })
    //   await tokenStore.token.updateAuthKeyUtxo()
    //   d.update({
    //     message: 'Loading updated registry, please wait...'
    //   })
    //   await delay(1000)
    //   await initBcmr()
    //   if (nftTypesSelectedForPublication.value.length > 0) {
    //     for (const [i, nftType] of nftTypesSelectedForPublication.value.entries()) {
    //       await localForage.nftTypesStore.removeItem(nftType.id) // id is storage key
    //       nftTypesSelectedForPublication.value.splice(i)
    //     }
    //   }
    //   d.hide()
    // }
  }).onDismiss(() => {
    d?.hide()
  })
}


const onPublicationOk = async (publicationTx: string) => {
  if (publicationTx) {
    const d = $q.dialog({
      message: 'Updating, please wait...',
      progress: true,
      ok: false
    })
    await delay(2000)
    d.update({
      message: 'Updating utxo, please wait...'
    })
    await tokenStore.token.updateUtxo()
    d.update({
      message: 'Updating authkey, please wait...'
    })
    await tokenStore.token.updateAuthKeyUtxo()
    d.update({
      message: 'Loading updated registry, please wait...'
    })
    await delay(1000)
    await initBcmr()
    if (nftTypesSelectedForPublication.value.length > 0) {
      for (const [i, nftType] of nftTypesSelectedForPublication.value.entries()) {
        await localForage.nftTypesStore.removeItem(nftType.id) // id is storage key
        nftTypesSelectedForPublication.value.splice(i)
      }
    }
    d.hide()
  }
}

watch(() => bcmr.value?.isModified, (modified) => {
  if (modified) {
    const { major, patch } = bcmr.value!.version
    bcmrNewVersion.value = [major, (bcmr.value?.version.minor || 0) + 1, patch].join('.')
    bcmrNewLatestRevision.value = new Date().toISOString()
    newIdentityHistoryTimestamp.value = new Date().toISOString()
  } else {
    bcmrNewVersion.value = bcmr.value?.versionString
    bcmrNewLatestRevision.value = bcmr.value?.latestRevision
  }
})


watch(() => newTokenIconFile.value, async (b) => {
  if (b) {
    newTokenIconPreview.value = URL.createObjectURL(b)
    newTokenIconUploadArtifact.value = undefined
    await saveNewIconInIPFS()
  }
})

watch(() => nftTypesShown.value, async () => {
  await populateNftsTable()
})

watch(() => showMintersInMintedNfts.value, async () => {
  await populateNftsTable()
})

const initBcmr = async () => {
  if (tokenStore?.token?.identitySnapshot?.token?.category) {
    const frResp = await (new BcmrIndexer()).fetchRegistry(tokenStore?.token?.identitySnapshot?.token?.category)
    const fisResp = await (new BcmrIndexer()).fetchIdentitySnapshot(tokenStore.token.identitySnapshot.token.category)
    const { ...registry } = frResp
    const { _meta, ...identitySnapshot } = fisResp
    let identities: any
    if (identitySnapshot) {
      authbase.value = _meta.authbase
      identityHistoryTimestamp.value = _meta.identity_history
      identities = {
        [_meta.authbase]: {
          [_meta.identity_history]: identitySnapshot
        }
      }
    }
    bcmr.value = new Bcmr({ ...registry, identities })

    await populateNftsTable()

  }
}

onBeforeMount(async () => {
  initBcmr()
})

onBeforeUnmount(async () => {
  try {
    await localForage.registryTempStore.removeItem(`registry-for-${tokenStore.token.txid}`)
  } catch (error) {
    console.log('Error removing registry cash from localstorage')
  }

})

onMounted(async () => {
  ui.routeBack = `registries`
})


</script>