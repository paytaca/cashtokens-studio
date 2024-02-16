<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center" :class="$q.screen.gt.xs ? 'q-mx-sm' : ''">
      <div class="col-xs-12 col-md-10">
        <q-banner style="border-radius: .5em;">
          <div class="row q-px-md q-py-md flex justify-center">
            <div class="col-xs-12 col-sm-3 text-center q-gutter-sm">
              <div class="row justify-center q-px-sm q-py-sm border" style="border-radius: 1em;">
                <div v-if="newTokenIconPreview" class="col-12">
                  <span class="text-grey" style="font-family: monospace;">Preview</span>
                </div>
                <div class="col-12 relative-position">
                  <q-file v-model="newTokenIconFile" accept=".jpg,.png, image/*" @rejected="() => console.log('rejected')"
                    style="visibility: hidden;" class="relative-position">
                    <q-avatar class="col-12 q-mb-sm" size="5em" style="visibility: visible !important; cursor: pointer;"
                      square>
                      <q-img v-if="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon"
                        :src="newTokenIconPreview || tokenStore.token?.identitySnapshot?.uris?.icon" alt=""
                        style="width:150px" />
                      <q-icon v-else name="token" color="grey-8"></q-icon>
                    </q-avatar>
                    <q-tooltip>Click to change icon</q-tooltip>
                  </q-file>
                  <q-inner-loading :showing="newTokenIconUploading">
                    <q-spinner-box size="50px" color="primary" />
                    uploading...
                  </q-inner-loading>
                </div>
                <div v-if="newTokenIconPreview && !newTokenIconUploading" class="col-12 q-mb-sm">
                  <q-btn :icon="!newTokenIconUploadArtifact ? 'upload_file' : 'done_all'" flat color="secondary"
                    :label="!newTokenIconUploadArtifact ? 'Store Icon In IPFS' : 'Icon Stored in IPFS'" no-caps
                    @click.stop="saveNewIconInIPFS">
                    <q-tooltip>Click to upload the new icon to IPFS.</q-tooltip>
                  </q-btn>
                </div>
                <TokenSymbol v-if="tokenStore.token?.tokenCategory?.symbol"
                  :symbol="tokenStore.token?.tokenCategory?.symbol" />
              </div>
            </div>
            <div class="col-xs-10 col-sm-9 q-mx-xs row justify-center items-center">
              <q-markup-table dense flat :class="!$q.dark.isActive ? 'bg-grey-4' : ''">
                <tbody>
                  <tr :class="$q.screen.lt.sm ? 'text-center' : 'text-left'">
                    <td colspan="2" class="text-h6 cursor-pointer"
                      @click="copyText(tokenStore.token?.token?.tokenId || '')">
                      <TokenSymbol v-if="tokenStore.token?.identitySnapshot?.token?.symbol"
                        :symbol="tokenStore.token?.identitySnapshot?.token?.symbol" />
                    </td>
                  </tr>
                  <tr>
                    <td class="text-h6 text-bold">Category</td>
                    <td class="text-h6 cursor-pointer" @click="copyText(tokenStore.token?.token?.tokenId || '')">
                      <q-btn size="md" @click="copyText(tokenStore.token?.token?.tokenId || '')" flat dense no-caps>
                        {{ $q.screen.lt.sm ? shortenTokenId(tokenStore.token?.token?.tokenId || '') :
                          tokenStore.token?.token?.tokenId }}
                      </q-btn>
                      <q-tooltip>Click to copy</q-tooltip>
                    </td>
                  </tr>
                  <tr v-if="tokenStore.token?.token?.amount">
                    <td class="text-h6 text-bold">Fungible Amount</td>
                    <td>{{ tokenStore.token?.token?.amount }}</td>
                  </tr>
                  <tr v-if="tokenStore.token?.tokenCategory?.decimals">
                    <td class="text-h6 text-bold">Decimals</td>
                    <td>{{ tokenStore.token?.tokenCategory?.decimals }}</td>
                  </tr>
                  <!-- <tr v-if="tokenStore.token?.token?.capability">
                    <td class="text-h6 text-bold">Capability</td>
                    <td>
                      {{ tokenStore.token?.token?.capability }}
                    </td>
                  </tr> -->
                </tbody>
              </q-markup-table>

            </div>
          </div>
          <div v-if="status === 'active'">
            <q-btn id="authchain-action-buttons" icon="menu" size="md" round flat dense
              @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
              <q-menu>
                <q-list>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainRegistryPublisherDialog.__name, tokenStore.token as AuthchainIdentity)">
                    Publish Registry From URL
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainRegistryFromFilePublisherDialog.__name, tokenStore.token as AuthchainIdentity)">
                    Publish Registry From File
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(UnguardAuthchainDialog.__name, tokenStore.token as AuthchainIdentity)">
                    Unguard Authchain
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainBurnerDialog.__name, tokenStore.token as AuthchainIdentity)">
                    Burn Token
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
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

        </q-banner>
      </div>
      <div class="col-xs-12 col-md-10 q-py-md">
        <div v-if="bcmrIndexer.processing" class="row justify-center">
          <q-spinner-grid size="sm" class="q-my-xl" />
          <span class="col-12 text-center">
            <i>{{ bcmrIndexer.processing }}</i>
          </span>
        </div>
        <div>
          <q-banner rounded>
            <q-expansion-item label="Registry" class="q-px-md q-pt-sm q-my-sm" icon="menu_book">
              <div class="q-mx-md q-gutter-sm q-my-md">
                <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setSchema(v)"
                  :model-value="bcmr?.$schema" label="Schema" filled dense disable></q-input>
                <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setVersion(v)"
                  :model-value="bcmr?.versionString" label="Registry Version" filled dense></q-input>
                <q-input class="registry-field" :model-value="bcmr?.latestRevision" label="Latest Revision" disable filled
                  dense></q-input>
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
            <q-expansion-item v-model="expansionItemFour" label="Nfts" icon="collections" class="q-px-md q-pt-sm q-my-sm">

              <q-tabs v-model="nftTypesShown" class="text-teal">
                <q-tab name="published" icon="published" label="Published" />
                <q-tab name="unpublished" icon="unpublished" label="Unpublished" />
                <q-tab name="minted" icon="minted" label="Minted" />
              </q-tabs>
              <q-table v-model:pagination="nftTypesPagination" @request="onTableRequest" flat bordered
                :rows="nftTypes.results" :columns="[
                  {
                    name: 'icon', label: 'Icon',
                    field: r => '',
                    align: 'center',
                    headerStyle: 'padding: 1.5em',
                  },
                  {
                    name: 'name', label: 'Name',
                    field: r => '',
                    align: 'center',
                    headerStyle: 'padding: 1.5em',
                  },
                  {
                    name: 'commitment', label: 'Commitment',
                    field: r => '',
                    align: 'center',
                    headerStyle: 'padding: 1.5em',
                  },
                  {
                    name: 'capability', label: 'Capability',
                    field: r => '',
                    align: 'center',
                    headerStyle: 'padding: 1.5em',
                  },
                ]" :rows-per-page-options="nftTypesRowsPerPage" row-key="name"
                :visible-columns="nftTypesTableVisibleCols">

                <template v-slot:body-cell-icon="value">
                  <q-td class="text-center">
                    <q-avatar v-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.icon">
                      <q-img
                        :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.icon)" />
                    </q-avatar>
                    <q-avatar v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.image">
                      <q-img
                        :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.image)" />
                    </q-avatar>
                    <q-avatar v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.asset">
                      <q-img
                        :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.asset)" />
                    </q-avatar>
                    <q-icon v-else name="token" size="xl" color="grey-8"></q-icon>
                  </q-td>
                </template>
                <template v-slot:body-cell-name="value">
                  <q-td class="text-center">
                    <span v-if="nftTypesShown == 'published'">{{ value.row[value.row._meta.commitment].name }}</span>
                    <span v-else-if="nftTypesShown == 'unpublished'">{{ value.row[value.row._meta.commitment].name
                    }}</span>
                    <span v-else>
                      <span v-if="value.row[value.row.commitment]?.name">
                        {{ value.row[value.row.commitment].name }}
                      </span>
                      <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
                    </span>

                  </q-td>
                </template>
                <template v-slot:body-cell-commitment="value">
                  <q-td class="text-center">
                    <span>{{ value.row._meta?.commitment || value.row.commitment }}</span>
                  </q-td>
                </template>
                <template v-if="nftTypesShown == 'minted'" v-slot:body-cell-capability="value">
                  <q-td class="text-center">
                    <span>{{ value.row.capability }}</span>
                  </q-td>
                </template>
              </q-table>
              <q-inner-loading :showing="nftTypesIsLoading">
                <q-spinner-grid size="30px" />
              </q-inner-loading>
            </q-expansion-item>
          </q-banner>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui'
import TokenCategory from 'src/components/TokenCategory.vue';
import TokenSymbol from 'src/components/TokenSymbol.vue';
import { AuthchainIdentity, Bcmr, BcmrIndexer, FetchUtxoQueryParams } from 'src/app';
import { Registry } from 'src/app/bcmr/bcmr-v2.schema';
import BcmrForm from 'src/components/forms/BcmrForm.vue'
import { useDialogs } from 'src/composables/useDialogs';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import { shortenTokenId, copyText } from 'src/app/utils';
import { BcmrStorageArtifact, IconStorageArtifact, PaginatedData } from 'src/app/types';
import { route } from 'quasar/wrappers';
import { useTokenStore } from 'src/stores/token'
import { formatCommitment, ipfsToGatewayUrl } from 'src/app/utils'
import { NftType } from 'mainnet-js';
import { Console } from 'console';
import { useQuasar } from 'quasar';
import { useLocalForage } from 'src/composables/useLocalForage';
import { nextTick } from 'process';

const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const localForage = useLocalForage()
const tokenStore = useTokenStore()
const bcmr = ref<Bcmr>()
const bcmrIndexer = reactive<BcmrIndexer>(new BcmrIndexer())
const bcmrReadOnly = ref<boolean>(true)
const { dialog, dialogData, openDialog, onHide } = useDialogs()
const status = ref<'burned' | 'active' | 'unguarded'>('active')
const newTokenIconFile = ref()
const newTokenIconPreview = ref()
const newTokenIconUploading = ref<boolean>(false)
const newTokenIconUploadArtifact = ref<IconStorageArtifact>()
const expansionItemOne = ref<boolean>(true)
const expansionItemTwo = ref<boolean>(false)
const expansionItemThree = ref<boolean>(false)
const expansionItemFour = ref<boolean>(false)
const authbase = ref<string>()
const identityHistoryTimestamp = ref<string>()

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
// local cache, used when nftTypesShown changes
const nftTypesCache = ref<PaginatedData>()
const unpublishedNftTypesCache = ref<PaginatedData>()
const nftTypesTableVisibleCols = computed(() => {
  if (nftTypesShown.value == 'minted') {
    return ['icon', 'name', 'commitment', 'capability']
  }
  return ['icon', 'name']
})
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

const saveNewIconInIPFS = async () => {
  if (newTokenIconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', newTokenIconFile.value);
      newTokenIconUploading.value = true
      const resp = await fetch(`api/tokens/icon/upload?tokenId=${tokenStore.token?.token?.tokenId}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      if (respJson.iconUris?.https) {
        bcmr.value?.addIconUri(respJson.iconUris?.https)
      }
      newTokenIconUploadArtifact.value = respJson
    } catch (error) {
      console.log(error)
    } finally {
      newTokenIconUploading.value = false
    }
  }
}

const createNewRegistry = () => {
  bcmrReadOnly.value = false
  bcmr.value = new Bcmr({
    version: { major: 1, minor: 0, patch: 0 },
    registryIdentity: tokenStore.token!.token!.tokenId,
    latestRevision: new Date().toISOString()
  })
  bcmr.value.authchainIdentity = tokenStore.token as AuthchainIdentity

}

const onUnguard = () => {
  status.value = 'unguarded'
}

const onBurn = () => {
  status.value = 'burned'
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
  // $q.loading.show()
  const fntResp = await (new BcmrIndexer()).fetchNftTypes(tokenStore.token.identitySnapshot.token.category, query)
  // $q.loading.hide()
  if (fntResp) {
    nftTypes.value = fntResp
  }
}

const loadUnpublishedNftTypes = async () => {
  const results: any = []
  // $q.loading.show()
  for (const k of (await localForage.nftTypesStore.keys())) {
    if (k.startsWith(tokenStore?.token?.token?.tokenId)) {

      let item: {
        [key: string]: NftType,

      } & { _meta: { commitment: string } } | null

        = await localForage.nftTypesStore.getItem(k)
      if (item && typeof (item) == 'string') {
        item = JSON.parse(item)
      }
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

  // $q.loading.hide()

  // await localForage.nftTypesStore.getItem(`${tokenStore.token.tokenId}-${rawNftCommitment.value}`)
  // await localForage.nftTypesStore.getItem(`${state.value.token.tokenId}-${rawNftCommitment.value}`)
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
    include_metadata: true
  }
  // $q.loading.show()
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
    // $q.loading.hide()
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

watch(() => newTokenIconFile.value, (b) => {
  if (b) {
    newTokenIconPreview.value = URL.createObjectURL(b)
    newTokenIconUploadArtifact.value = undefined
  }
})

watch(() => expansionItemTwo.value, async (v) => {
  if (v) {
    const fisResp = await (new BcmrIndexer()).fetchIdentitySnapshot(tokenStore.token.identitySnapshot.token.category)
    if (fisResp && bcmr.value?.version) {
      const { _meta, ...identitySnapshot } = fisResp
      bcmr.value.identities = bcmr.value.identities || {}
      bcmr.value.identities[_meta.authbase][_meta.identity_history] = identitySnapshot
      authbase.value = _meta.authbase
      identityHistoryTimestamp.value = _meta.identity_history
    }
  }
})

watch(() => expansionItemTwo.value, async (v) => {
  if (v && !tokenStore.token.identitySnapshot.token.category) {
    const fisResp = await (new BcmrIndexer()).fetchIdentitySnapshot(tokenStore.token.identitySnapshot.token.category)
    if (fisResp && bcmr.value?.version) {
      const { _meta, ...identitySnapshot } = fisResp
      bcmr.value.identities = bcmr.value.identities || {}
      bcmr.value.identities[_meta.authbase][_meta.identity_history] = identitySnapshot
      authbase.value = _meta.authbase
      identityHistoryTimestamp.value = _meta.identity_history
    }
  }
})

watch(() => expansionItemFour.value, async (v) => {
  if (v) {
    await populateNftsTable()
  }
})

watch(() => nftTypesShown.value, async () => {
  await populateNftsTable()
})

onBeforeMount(async () => {
  if (tokenStore?.token?.identitySnapshot?.token?.category) {
    const frResp = await (new BcmrIndexer()).fetchRegistry(tokenStore?.token?.identitySnapshot?.token?.category)
    if (frResp) {
      const { _meta, ...registry } = frResp
      bcmr.value = new Bcmr({ ...registry })
    }
  }
})

onMounted(async () => {
  ui.routeBack = `registries`
})


</script>