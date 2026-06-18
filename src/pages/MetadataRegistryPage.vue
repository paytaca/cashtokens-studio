<template>
  <q-page class="bg-dark-page text-grey-2">
    <div class="row justify-center q-pa-md">
      <!-- Back button -->
      <div class="col-xs-12 q-mb-md">
        <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="router.back()" />
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="col-xs-12 col-sm-10">
        <q-card flat class="bg-dark q-pa-lg q-mb-md">
          <div class="row items-center q-gutter-x-md">
            <q-skeleton type="QAvatar" size="64px" class="bg-grey-9" />
            <div class="col">
              <q-skeleton type="text" class="text-h6 q-mb-xs" width="60%" />
              <q-skeleton type="text" class="text-caption" width="40%" />
            </div>
          </div>
        </q-card>
        <q-card flat class="bg-dark q-pa-md q-mb-md">
          <q-skeleton type="QSelect" class="full-width q-mb-md" />
          <q-skeleton type="QSelect" class="full-width" />
        </q-card>
        <q-card flat class="bg-dark q-pa-lg">
          <q-skeleton type="text" class="q-mb-md" width="30%" />
          <q-skeleton type="text" class="q-mb-sm" />
          <q-skeleton type="text" class="q-mb-sm" width="80%" />
          <q-skeleton type="text" width="50%" />
        </q-card>
        <div class="flex justify-end q-gutter-md q-mt-lg">
          <q-skeleton type="QBtn" />
          <q-skeleton type="QBtn" />
          <q-skeleton type="QBtn" />
        </div>
      </div>

      <!-- No registry state -->
      <div v-else-if="!registryRecord && !inMemoryRegistry" class="col-xs-12 col-sm-8 q-gutter-y-md">
        <q-card flat class="bg-dark q-pa-lg">
          <div class="flex items-center q-gutter-x-md q-mb-lg">
            <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1">
              <q-icon name="token" color="primary" size="32px" />
            </q-avatar>
            <div>
              <div class="text-h6 text-weight-medium">Unknown Token</div>
              <div class="text-caption text-grey-5">{{ authbase }}</div>
            </div>
          </div>
          <q-banner class="bg-orange-9 text-white q-mb-md">
            <div class="flex items-center q-gutter-x-sm">
              <q-icon name="warning" />
              <span>This token has no Metadata Registry.</span>
            </div>
          </q-banner>
          <div class="flex justify-end">
            <q-btn color="primary" icon="add" label="Create Registry" @click="createRegistry" />
          </div>
        </q-card>
      </div>


      <!-- Main content -->
      <div v-else class="col-xs-12 col-sm-10">

        <div class="avatar-banner-wrapper">
          <div class="row items-center q-gutter-y-md q-mb-lg">
            <div class="col-12">
              <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1">
                <q-img v-if="identitySnapshot?.uris?.icon" :src="ipfsToGatewayUrl(identitySnapshot?.uris?.icon)!"
                  fit="cover" />
                <q-icon v-else name="token" color="primary" size="32px" />
              </q-avatar>
              <div>
                <div class="text-h6 text-weight-medium">
                  {{ identitySnapshot?.name || 'Unnamed Token' }}
                </div>
                <div class="flex items-center q-gutter-x-xs text-caption">
                  <span class="text-grey-5">{{ identitySnapshot?.token?.symbol || '?' }}</span>
                  <span class="text-grey-7">-</span>
                  <span class="text-mono text-grey-5">{{ shortenTokenId(authbase) }}</span>
                  <CopyText :text="authbase" />
                </div>
              </div>
            </div>
            <div class="col-12">
              <q-select v-model="selectedAuthbase" :options="authbaseOptions" label="Authbase" dark filled
                @update:model-value="onAuthbaseChange" />
            </div>
            <div class="col-12">
              <q-select v-model="selectedTimestamp" :options="timestampOptions" label="Timestamp" dark filled
                @update:model-value="onTimestampChange">
                <template v-slot:append>
                  <q-badge v-if="isLatestTimestamp" color="green-9" text-color="green-3">Latest</q-badge>
                  <q-badge v-else color="grey-8" text-color="grey-4">Read-only</q-badge>
                </template>
              </q-select>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="q-mt-md">
          <q-tabs v-model="activeTab" dense no-caps align="left" active-color="white" indicator-color="blue-5"
            class="text-grey-5 text-weight-bold">
            <q-tab name="identity">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="mdi-book-clock-outline" size="sm" />
                <span>Token Identity</span>
              </div>
            </q-tab>
            <q-tab name="nfts">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="token" size="sm" />
                <span>NFTs</span>
              </div>
            </q-tab>
            <q-tab name="registry">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="mdi-file-document-multiple" size="sm" />
                <span>Registry</span>
              </div>
            </q-tab>
          </q-tabs>

          <q-tab-panels v-model="activeTab" animated class="bg-transparent q-mt-md">
            <!-- Tab 1: Token Identity -->
            <q-tab-panel name="identity" class="q-pa-none">
              <q-card flat class="bg-dark q-pa-lg">
                <q-badge v-if="identitySnapshotModified" color="warning" text-color="dark" rounded>[Modified]</q-badge>
                <IdentitySnapshotComponent v-if="identitySnapshot" v-model:identity-snapshot="identitySnapshot"
                  @changed="onIdentitySnapshotChanged" :mode="isLatestTimestamp ? 'write' : 'read'"
                  :authbase="selectedAuthbase" :content-hash="currentContentHash" :timestamp="selectedTimestamp" />
                <div v-else class="text-caption text-grey-5 text-center q-pa-md">
                  No identity snapshot available for this timestamp.
                </div>
              </q-card>
            </q-tab-panel>

            <!-- Tab 2: NFTs -->
            <q-tab-panel name="nfts" class="q-pa-none">
              <q-card flat class="bg-dark q-pa-lg">
                <div v-if="!nftCategory" class="text-caption text-grey-5 text-center q-pa-md">
                  This token does not have NFT metadata.
                </div>
                <template v-else>
                  <div class="flex items-center q-gutter-x-md q-mb-md">
                    <div v-if="collectionType === 'sequential'" class="flex items-center q-gutter-x-md">
                      <q-chip color="grey-8" text-color="grey-3" icon="pin" label="Sequential" dense />
                    </div>
                    <div v-else class="flex items-center q-gutter-x-md">
                      <q-chip color="green-9" text-color="green-3" icon="code" label="Parsable" dense />
                    </div>
                  </div>

                  <!-- Unpublished NFTs -->
                  <q-card flat class="bg-dark q-mt-md">
                    <div class="q-pa-lg">
                      <div class="row items-center justify-between q-mb-xs">
                        <div class="text-h6 text-weight-medium">
                          <q-icon name="fiber_new" size="20px" class="q-mr-xs" />
                          Unpublished NFTs
                        </div>
                        <div class="q-gutter-x-sm">
                          <q-btn color="primary" icon="add" label="Add NFT" unelevated @click="addNft" size="sm" />
                          <q-btn color="primary" icon="mdi-publish" label="Publish" unelevated :loading="publishing"
                            @click="publishNfts" size="sm" :disable="unpublishedNfts.length === 0" />
                        </div>
                      </div>
                      <div class="text-caption text-grey-6 q-mb-md">NFT types not yet published to the registry</div>
                      <q-table :rows="unpublishedNfts" :columns="unpublishedColumns" row-key="id" flat bordered dark
                        :rows-per-page-options="[0]" class="bg-dark border-radius-12">
                        <template v-slot:body-cell-type="props">
                          <q-td :props="props" class="text-mono">{{ props.row.type }}</q-td>
                        </template>
                        <template v-slot:body-cell-name="props">
                          <q-td :props="props">{{ props.row.nft.name }}</q-td>
                        </template>
                        <template v-slot:body-cell-status="props">
                          <q-td :props="props">
                            <q-badge :color="props.row.status === 'new' ? 'info' : 'warning'">
                              {{ props.row.status }}
                            </q-badge>
                          </q-td>
                        </template>
                        <template v-slot:body-cell-actions="props">
                          <q-td :props="props">
                            <q-btn dense flat round icon="more_vert" size="sm">
                              <q-menu auto-close>
                                <q-list style="min-width: 100px">
                                  <q-item clickable @click="editNft(props.row)">
                                    <q-item-section avatar>
                                      <q-icon name="edit" size="xs" />
                                    </q-item-section>
                                    <q-item-section>Edit</q-item-section>
                                  </q-item>
                                  <q-item clickable @click="deleteNft(props.row)">
                                    <q-item-section avatar>
                                      <q-icon name="delete" size="xs" color="negative" />
                                    </q-item-section>
                                    <q-item-section class="text-negative">Delete</q-item-section>
                                  </q-item>
                                </q-list>
                              </q-menu>
                            </q-btn>
                          </q-td>
                        </template>
                        <template v-slot:no-data>
                          <div class="text-grey-5 text-center q-pa-md">No unpublished NFTs</div>
                        </template>
                      </q-table>
                    </div>
                  </q-card>

                  <!-- Published NFTs -->
                  <q-card flat class="bg-dark q-mt-lg">
                    <div class="q-pa-lg">
                      <div class="table-header text-h6 text-weight-medium q-mb-xs">
                        Published NFTs
                        <q-btn flat dense round icon="refresh" size="md" :loading="publishedLoading"
                          @click="loadPublishedNfts(0, 10)" class="q-mr-xs" />
                      </div>
                      <div class="text-caption text-grey-6 q-mb-md">NFT types currently in the registry</div>
                      <q-table :rows="publishedNfts" :columns="publishedColumns" row-key="type" flat bordered dark
                        :loading="publishedLoading" v-model:pagination="publishedPagination"
                        @request="onPublishedRequest" @row-click="onPublishedRowClick" class="bg-dark border-radius-12">
                        <template v-slot:body-cell-type="props">
                          <q-td :props="props" class="text-mono">{{ props.row.type }}</q-td>
                        </template>
                        <template v-slot:body-cell-name="props">
                          <q-td :props="props">{{ props.row.nft.name }}</q-td>
                        </template>
                        <template v-slot:no-data>
                          <div class="text-grey-5 text-center q-pa-md">No published NFTs</div>
                        </template>
                      </q-table>
                    </div>
                  </q-card>
                </template>
              </q-card>
            </q-tab-panel>

            <!-- Tab 3: Registry -->
            <q-tab-panel name="registry" class="q-pa-none">
              <q-card flat class="bg-dark q-pa-lg">
                <q-badge v-if="registryModified" color="warning" text-color="dark" rounded>[Modified]</q-badge>
                <RegistryComponent v-if="registry" v-model:registry="registry" embedded
                  @change:registry="registryModified = true" />
              </q-card>
            </q-tab-panel>
          </q-tab-panels>
        </div>

        <!-- Universal Action Buttons -->
        <div class="flex justify-end q-gutter-md q-mt-lg q-mb-xl">
          <q-btn icon="mdi-undo" color="warning" @click="onReset" :disable="!anyModified && !inMemoryRegistry">
            {{ t('button.reset') }}
          </q-btn>
          <q-btn icon="cloud_upload" color="primary" @click="onSave" :disable="!anyModified && !inMemoryRegistry">
            {{ t('button.save') }}
          </q-btn>
          <q-btn icon="cloud_upload" color="primary" @click="onPublish" :disable="!canPublish">
            {{ t('button.publish') }}
          </q-btn>
        </div>
      </div>
    </div>
    <AddNftDialog v-model="showAddNftDialog" :collection-type="collectionType" @ok="onAddNftOk" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { QTableColumn } from 'quasar'
import type {
  IdentitySnapshot,
  NftCategory,
  NftType,
  ParsableNftCollection as ParsableNftCollectionI,
  SequentialNftCollection as SequentialNftCollectionI,
  Registry
} from 'src/core/bcmr/bcmr-v2.schema'
import { db, IdentitySnapshotRecord, ParsedRegistryRecord, setRecordStatus, type CompactRegistry } from 'src/core/client-db'
import { createTokenRegistry } from 'src/core/bcmr'
import { getRegistryWorker } from 'src/workers'
import { getErrorMessage, shortenTokenId } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { broadcast, publishRegistry } from 'src/core/transaction'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { importMetadataRegistry } from 'bitauth-libauth-v3'
import type { UtxoWithPath, UtxoWithAuthKey } from 'src/core/types'
import type { PublicationStrategy } from 'src/components/bcmr/types'
import CopyText from 'components/CopyText.vue'
import IdentitySnapshotComponent from 'components/bcmr/IdentitySnapshot.vue'
import RegistryComponent from 'components/bcmr/Registry.vue'
import SaveSuccessDialog from 'components/dialogs/SaveSuccessDialog.vue'
import TransactionStatusDialog from 'components/dialogs/TransactionStatusDialog.vue'
import RegistryVersionOptionsDialog from 'components/bcmr/RegistryVersionOptionsDialog.vue'
import { NftRecord } from 'src/core/client-db'
import AddNftDialog from 'components/dialogs/AddNftDialog.vue'
import formatCommitment from 'src/apps/utils/formatCommitment'

const DEFAULT_NFT_CATEGORY: NftCategory = {
  parse: { types: {} } as SequentialNftCollectionI,
}

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const { wallet, manager } = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)

const { getRegistryByAuthbase } = useRegistryStore()

const loading = ref(true)
const activeTab = ref<'identity' | 'nfts' | 'registry'>('identity')

const authbase = ref(route.query.authbase as string)
const contentHashParam = ref(route.query.contentHash as string | undefined)

const registryRecord = ref<ParsedRegistryRecord | undefined>()
const inMemoryRegistry = ref<{ registry: Registry, contentHash: string } | undefined>()

const identitySnapshotRecord = ref<IdentitySnapshotRecord | undefined>()
const identitySnapshot = ref<IdentitySnapshot | undefined>()
const identitySnapshotModified = ref(false)

const registryModified = ref(false)

// NFT types
const nftTypesLoading = ref(false)
const nftTypesPagination = ref({ sortBy: 'hexKey', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })
const nftTypesTotal = ref(0)
const typesRef = ref<Record<string, NftType>>({})

// NFT CRUD (unpublished + published)
const unpublishedNfts = ref<NftRecord[]>([])
const publishedNfts = ref<{ type: string, nft: NftType }[]>([])
const publishedTotal = ref(0)
const publishedLoading = ref(false)
const publishing = ref(false)
const showAddNftDialog = ref(false)

const nftTypeColumns: QTableColumn[] = [
  { name: 'key', align: 'left', label: 'Sequence Number', field: 'hexKey', sortable: true },
  { name: 'name', align: 'left', label: 'Name', field: 'name', sortable: true },
]

const nftTypeRows = computed(() => {
  return Object.entries(typesRef.value).map(([key, value]) => ({
    originalKey: key,
    hexKey: key,
    ...value
  }))
})

const unpublishedColumns: QTableColumn[] = [
  { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
  { name: 'name', label: 'Name', field: (row) => row.nft.name, align: 'left', sortable: false },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: '', field: 'actions', align: 'center' },
]

const publishedColumns: QTableColumn[] = [
  { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
  { name: 'name', label: 'Name', field: (row) => row.nft.name, align: 'left', sortable: false },
]

const publishedPagination = ref({ sortBy: 'type', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })

// Authbase / Timestamp selectors
const selectedAuthbase = ref(authbase.value)
const selectedTimestamp = ref<string>()

const currentRegistry = computed(() => registryRecord.value?.registry || inMemoryRegistry.value?.registry)
const currentContentHash = computed(() => registryRecord.value?.contentHash || inMemoryRegistry.value?.contentHash)

const authbaseOptions = computed(() => {
  const reg = currentRegistry.value
  if (!reg?.identities) return []
  return Object.keys(reg.identities)
})

const timestampOptions = computed(() => {
  const reg = currentRegistry.value
  if (!reg?.identities || !selectedAuthbase.value) return []
  const timestamps = reg.identities[selectedAuthbase.value]
  if (Array.isArray(timestamps)) {
    return (timestamps as string[]).sort((a, b) => b.localeCompare(a))
  }
  return Object.keys(timestamps || {}).sort((a, b) => b.localeCompare(a))
})

const isLatestTimestamp = computed(() => {
  if (!selectedTimestamp.value || !timestampOptions.value.length) return false
  return selectedTimestamp.value === timestampOptions.value[0]
})

const nftCategory = computed<NftCategory | null>(() => {
  return identitySnapshot.value?.token?.nfts ?? null
})

const collectionType = computed(() => {
  const nfts = nftCategory.value
  if (!nfts?.parse) return 'sequential'
  const isParsable = !!((nfts.parse as any)?.bytecode)
  return isParsable ? 'parsable' : 'sequential'
})

const anyModified = computed(() => {
  return registryModified.value || identitySnapshotModified.value || !!inMemoryRegistry.value || unpublishedNfts.value.length > 0
})

const canPublish = computed(() => {
  return anyModified.value || registryRecord.value?.status === 'modified' || registryRecord.value?.status === 'new' || unpublishedNfts.value.length > 0
})

const registry = ref<CompactRegistry | undefined>()
watch(currentRegistry, (reg) => {
  registry.value = reg ? toCompactRegistry(reg) : undefined
}, { immediate: true })

const toCompactRegistry = (registry: Registry | CompactRegistry): CompactRegistry => {
  if (!registry.identities) return registry as unknown as CompactRegistry
  const identities = Object.keys(registry.identities)
  const identitiesMap = identities.reduce((acc: { [authbase: string]: string[] }, authbase: string) => {
    acc[authbase] = Object.keys(registry.identities![authbase] || {}).sort((a, b) => b.localeCompare(a))
    return acc
  }, {} as { [authbase: string]: string[] })
  return { ...registry, identities: identitiesMap }
}

const loadIdentitySnapshot = async () => {
  if (!selectedAuthbase.value || !selectedTimestamp.value) return
  const ch = currentContentHash.value
  if (!ch) {
    // In-memory registry: identity snapshot is directly in the registry
    const reg = inMemoryRegistry.value?.registry
    const ts = selectedTimestamp.value
    const snapshot = ts ? reg?.identities?.[selectedAuthbase.value]?.[ts] : undefined
    if (snapshot) {
      identitySnapshot.value = snapshot
      identitySnapshotModified.value = false
    }
    return
  }
  try {
    identitySnapshotRecord.value = await getRegistryWorker().getIdentitySnapshot({
      contentHash: ch,
      identity: {
        authbase: selectedAuthbase.value,
        timestamp: selectedTimestamp.value
      }
    })
    if (identitySnapshotRecord.value) {
      identitySnapshot.value = identitySnapshotRecord.value.identitySnapshot
      identitySnapshotModified.value = false
    }
  } catch (error) {
    $q.notify({ type: 'error', message: getErrorMessage(error) })
  }
}

const loadNftTypes = async (offset: number, limit: number) => {
  const record = identitySnapshotRecord.value
  const ch = currentContentHash.value
  if (!ch || !selectedAuthbase.value || !selectedTimestamp.value) {
    // In-memory: load directly from registry
    const reg = inMemoryRegistry.value?.registry
    const ts = selectedTimestamp.value
    const snapshot = ts ? reg?.identities?.[selectedAuthbase.value]?.[ts] : undefined
    if (snapshot?.token?.nfts?.parse?.types) {
      const types = snapshot.token.nfts.parse.types as Record<string, NftType>
      const isSequential = !(snapshot.token.nfts.parse as any).bytecode
      const entries = Object.entries(types)
      entries.sort(([a], [b]) => {
        if (isSequential) {
          const aBytes = a.match(/.{1,2}/g) || []
          const bBytes = b.match(/.{1,2}/g) || []
          const aRev = aBytes.reverse().join('')
          const bRev = bBytes.reverse().join('')
          const aInt = BigInt('0x' + aRev)
          const bInt = BigInt('0x' + bRev)
          if (aInt < bInt) return -1
          if (aInt > bInt) return 1
          return 0
        }
        return a.localeCompare(b)
      })
      nftTypesTotal.value = entries.length
      const page = entries.slice(offset, offset + limit)
      const dict: Record<string, NftType> = {}
      for (const item of page) {
        dict[item[0]] = item[1] as NftType
      }
      typesRef.value = dict
      if (nftCategory.value) {
        (nftCategory.value.parse as any).types = dict
      }
    }
    return
  }
  nftTypesLoading.value = true
  try {
    const result = await getRegistryWorker().getNftTypes({
      contentHash: ch,
      authbase: selectedAuthbase.value,
      timestamp: selectedTimestamp.value,
      offset,
      limit
    })
    if (result) {
      nftTypesTotal.value = result.total
      const dict: Record<string, NftType> = {}
      for (const item of result.items) {
        dict[item.type] = item.nft
      }
      typesRef.value = dict
      if (nftCategory.value) {
        (nftCategory.value.parse as any).types = dict
      }
    }
  } catch (error) {
    $q.notify({ type: 'error', message: getErrorMessage(error) })
  } finally {
    nftTypesLoading.value = false
  }
}

const onNftTypesRequest = async (props: any) => {
  const { page, rowsPerPage } = props.pagination
  await loadNftTypes((page - 1) * rowsPerPage, rowsPerPage)
}

// --- NFT CRUD methods ---

const loadUnpublishedNfts = async () => {
  try {
    const ch = currentContentHash.value
    if (!ch || !selectedAuthbase.value || !selectedTimestamp.value) {
      unpublishedNfts.value = []
      return
    }
    unpublishedNfts.value = await db.nfts
      .where('[contentHash+authbase+timestamp]')
      .equals([ch, selectedAuthbase.value, selectedTimestamp.value] as [string, string, string])
      .filter(n => n.status === 'new' || n.status === 'modified')
      .toArray()
  } catch (error) {
    $q.notify({ type: 'warning', message: 'Failed to load unpublished NFTs' })
  }
}

const loadPublishedNfts = async (offset: number, limit: number) => {
  const ch = currentContentHash.value
  if (!ch || !selectedAuthbase.value || !selectedTimestamp.value) {
    publishedNfts.value = []
    publishedTotal.value = 0
    return
  }
  publishedLoading.value = true
  try {
    const result = await getRegistryWorker().getNftTypes({
      contentHash: ch,
      authbase: selectedAuthbase.value,
      timestamp: selectedTimestamp.value,
      offset,
      limit
    })
    if (result) {
      publishedNfts.value = result.items
      publishedTotal.value = result.total
    }
  } catch (error) {
    $q.notify({ type: 'warning', message: 'Failed to load published NFTs' })
  } finally {
    publishedLoading.value = false
  }
}

const addNft = () => {
  const ch = currentContentHash.value
  const ab = selectedAuthbase.value
  const ts = selectedTimestamp.value
  if (!ch || !ab || !ts) return
  showAddNftDialog.value = true
}

const onAddNftOk = async (typeKey: string) => {
  const ch = currentContentHash.value
  const ab = selectedAuthbase.value
  const ts = selectedTimestamp.value
  if (!ch || !ab || !ts) return
  const isParsable = collectionType.value === 'parsable'
  const resolvedKey = isParsable ? typeKey : formatCommitment(typeKey, 'decimal', 'vm-number')
  const regStore = useRegistryStore()
  const bytecode = (identitySnapshot.value?.token?.nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode
  regStore.setActiveNft({
    contentHash: ch,
    authbase: ab,
    timestamp: ts,
    category: ab,
    bytecode,
    commitmentOrBottomAltStack: resolvedKey,
    nftType: undefined,
    allowEdit: true,
    isNew: true
  })
  const returnTo = encodeURIComponent(router.currentRoute.value.fullPath)
  router.push(`/issuer/nft-collections/${ab}/nft?returnTo=${returnTo}`)
}

const editNft = (record: NftRecord) => {
  const regStore = useRegistryStore()
  const bytecode = (identitySnapshot.value?.token?.nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode
  regStore.setActiveNft({
    contentHash: record.contentHash,
    authbase: record.authbase,
    timestamp: record.timestamp,
    category: record.category,
    bytecode,
    commitmentOrBottomAltStack: record.type,
    nftType: record.nft,
    allowEdit: true
  })
  const returnTo = encodeURIComponent(router.currentRoute.value.fullPath)
  router.push(`/issuer/nft-collections/${record.category}/nft?returnTo=${returnTo}`)
}

const deleteNft = (record: NftRecord) => {
  $q.dialog({
    title: 'Delete NFT',
    message: `Are you sure you want to delete "${record.nft.name || record.type}"?`,
    cancel: { label: 'Cancel', flat: true, color: 'grey-6' },
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true }
  }).onOk(async () => {
    await db.nfts.where('[contentHash+authbase+timestamp+type]')
      .equals([record.contentHash, record.authbase, record.timestamp, record.type] as [string, string, string, string])
      .delete()
    await loadUnpublishedNfts()
  })
}

const publishNfts = async () => {
  const ch = currentContentHash.value
  if (!ch || !selectedAuthbase.value || !selectedTimestamp.value || unpublishedNfts.value.length === 0) return

  publishing.value = true
  const loadingGroup = $q.loading.show({
    group: 'mpop-lg',
    message: 'Uploading registry to IPFS...'
  })

  try {
    const bumpArtifact = await getRegistryWorker().bumpRegistry({
      originalContentHash: ch,
      bumpType: 'patch',
      targetIdentity: {
        authbase: selectedAuthbase.value,
        timestamp: selectedTimestamp.value
      }
    })

    if (!bumpArtifact) {
      throw new Error('Error uploading registry')
    }

    loadingGroup({ message: 'Waiting for signature...' })

    const publishRegistryRequest = publishRegistry({
      authhead: activeAuthhead.value as UtxoWithAuthKey,
      funderUtxos: wallet.value.utxos as UtxoWithPath[],
      network: import.meta.env.VITE_BCH_NETWORK,
      registryPublicationData: {
        contentHash: bumpArtifact.contentHash,
        uris: bumpArtifact.uris
      }
    })

    const response = await manager.value!.signTransaction(publishRegistryRequest)

    loadingGroup({ message: 'Broadcasting...' })

    const broadcastResponse = await broadcast(response.signedTransaction)

    if (broadcastResponse.ok) {
      const broadcastResult = await broadcastResponse.json()
      if (broadcastResult.success) {
        await getRegistryWorker().commitBumpRegistry(ch, `${broadcastResult.txid}:0`)
        loadingGroup()
        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: 'NFTs published successfully',
            txid: broadcastResult.txid
          }
        })
        await loadUnpublishedNfts()
        await loadPublishedNfts(0, 10)
      } else {
        throw new Error(broadcastResult.error)
      }
    }
  } catch (error: any) {
    $q.notify({ type: 'error', message: error.message })
  } finally {
    publishing.value = false
    loadingGroup()
  }
}

const onPublishedRowClick = (_evt: Event, row: { type: string, nft: NftType }) => {
  const regStore = useRegistryStore()
  const bytecode = (identitySnapshot.value?.token?.nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode
  const ch = currentContentHash.value
  const ab = selectedAuthbase.value
  const ts = selectedTimestamp.value
  if (!ch || !ab || !ts) return
  regStore.setActiveNft({
    contentHash: ch,
    authbase: ab,
    timestamp: ts,
    category: ab,
    bytecode,
    commitmentOrBottomAltStack: row.type,
    nftType: row.nft,
    allowEdit: true
  })
  router.push(`/issuer/nft-collections/${ab}/nft`)
}

const onPublishedRequest = async (props: any) => {
  const { page, rowsPerPage } = props.pagination
  await loadPublishedNfts((page - 1) * rowsPerPage, rowsPerPage)
}

const onAuthbaseChange = async () => {
  const opts = timestampOptions.value
  if (opts.length > 0) {
    selectedTimestamp.value = opts[0]
  } else {
    selectedTimestamp.value = undefined
  }
  await loadIdentitySnapshot()
  await loadNftTypes(0, nftTypesPagination.value.rowsPerPage)
  await loadUnpublishedNfts()
  await loadPublishedNfts(0, 10)
}

const onTimestampChange = async () => {
  await loadIdentitySnapshot()
  await loadNftTypes(0, nftTypesPagination.value.rowsPerPage)
  await loadUnpublishedNfts()
  await loadPublishedNfts(0, 10)
}

const onIdentitySnapshotChanged = (isModified: boolean) => {
  identitySnapshotModified.value = isModified
}

const createRegistry = async () => {
  const authhead = activeAuthhead.value
  if (!authhead) {
    return $q.notify({ type: 'error', message: 'No active authhead found. Please navigate from the Dashboard.' })
  }

  const authbaseVal = authbase.value
  const authKeyNftCategory = authhead.authkey?.token?.category || authhead.authkey?.txid || ''

  // Use existing identity snapshot if available, otherwise create minimal one
  const existingSnapshot = authhead.identitySnapshot
  const minimalSnapshot: IdentitySnapshot = {
    name: existingSnapshot?.name || 'Unnamed Token',
    description: existingSnapshot?.description || '',
    token: {
      category: authbaseVal,
      symbol: existingSnapshot?.token?.symbol || 'UNKNOWN',
      ...(existingSnapshot?.token?.decimals !== undefined ? { decimals: existingSnapshot.token.decimals } : {}),
      ...(existingSnapshot?.token?.nfts ? { nfts: existingSnapshot.token.nfts } : {})
    },
    uris: {
      icon: existingSnapshot?.uris?.icon || ''
    }
  }

  const { contentHash: ch, registry } = createTokenRegistry({
    authbase: authbaseVal,
    identitySnapshot: JSON.parse(JSON.stringify(minimalSnapshot)),
    authKeyNftCategory
  })

  inMemoryRegistry.value = { registry, contentHash: ch }
  selectedAuthbase.value = authbaseVal
  selectedTimestamp.value = Object.keys(registry.identities?.[authbaseVal] || {}).sort((a, b) => b.localeCompare(a))[0]

  await loadIdentitySnapshot()
  await loadNftTypes(0, 10)

  $q.notify({ type: 'positive', message: 'Registry created in memory. Click Save to persist.' })
}

const validateRegistry = (json: any): boolean => {
  const result = importMetadataRegistry(json)
  if (typeof result === 'string') {
    $q.notify({ type: 'error', message: `Registry validation failed: ${result}` })
    return false
  }
  return true
}

const onSave = async () => {
  if (inMemoryRegistry.value) {
    // Validate before saving
    if (!validateRegistry(inMemoryRegistry.value.registry)) return

    try {
      const blob = new Blob([JSON.stringify(inMemoryRegistry.value.registry)], { type: 'application/json' })
      const record = await db.createNewRegistry({
        authbase: authbase.value,
        contentHash: inMemoryRegistry.value.contentHash,
        publicationUris: [],
        rawRegistry: blob
      })
      registryRecord.value = record
      inMemoryRegistry.value = undefined
      registryModified.value = false
      identitySnapshotModified.value = false
      $q.notify({ type: 'positive', message: 'Registry saved successfully.' })
    } catch (error) {
      $q.notify({ type: 'error', message: `Error saving registry: ${getErrorMessage(error)}` })
    }
    return
  }

  if (!registryRecord.value) return

  // Validate existing registry before saving
  const reg = currentRegistry.value
  if (reg && !validateRegistry(reg)) return

  try {
    if (registryModified.value) {
      registryRecord.value.registry = registry.value as CompactRegistry
      setRecordStatus(registryRecord.value, 'modified')
      await db.registry.update(registryRecord.value.id, {
        registry: structuredClone(registry.value as CompactRegistry),
        status: 'modified'
      })
    }
    if (identitySnapshotModified.value && identitySnapshotRecord.value) {
      const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))
      setRecordStatus(identitySnapshotRecord.value, 'modified')
      await db.registryIdentitySnapshot
        .where('[contentHash+authbase+timestamp]')
        .equals([
          identitySnapshotRecord.value.contentHash,
          identitySnapshotRecord.value.authbase,
          identitySnapshotRecord.value.timestamp
        ] as [string, string, string])
        .modify({ identitySnapshot: clonedSnapshot, status: identitySnapshotRecord.value.status })
    }
    registryModified.value = false
    identitySnapshotModified.value = false
    $q.dialog({
      component: SaveSuccessDialog,
      componentProps: {
        message: t('success.savedDescription'),
        okLabel: t('button.save')
      }
    })
  } catch (error) {
    $q.notify({ type: 'error', message: `Error saving: ${getErrorMessage(error)}` })
  }
}

const onPublish = async () => {
  if (inMemoryRegistry.value) {
    return $q.notify({ type: 'warning', message: 'Please save the registry before publishing.' })
  }

  if (!registryRecord.value || !activeAuthhead.value) {
    return $q.notify({ type: 'error', message: 'No registry or active authhead available.' })
  }

  // Validate before publishing
  const reg = currentRegistry.value
  if (reg && !validateRegistry(reg)) return

  // Save first if modified
  if (anyModified.value) {
    await onSave()
  }

  // Show version dialog
  $q.dialog({
    component: RegistryVersionOptionsDialog,
    componentProps: {
      currentRegistryVersion: registryRecord.value.registry?.version
    }
  }).onOk(async (version: any) => {
    const loadingGroup = $q.loading.show({
      group: 'mpop-lg',
      message: t('info.uploadingRegistryToIpfs')
    })

    try {
      const originalContentHash = registryRecord.value!.contentHash
      const bumpArtifact = await getRegistryWorker()?.bumpRegistry({
        bumpType: version.bumpType,
        newVersion: version.version,
        originalContentHash
      })

      if (!bumpArtifact) {
        throw new Error('Error uploading registry')
      }

      loadingGroup({ message: t('transaction.waitingForSignature') })

      const publishRegistryRequest = publishRegistry({
        authhead: activeAuthhead.value as UtxoWithAuthKey,
        funderUtxos: wallet.value.utxos as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK,
        registryPublicationData: {
          contentHash: bumpArtifact.contentHash,
          uris: bumpArtifact.uris
        }
      })

      const response = await manager.value!.signTransaction(publishRegistryRequest)

      loadingGroup({ message: t('transaction.broadcasting') })

      const broadcastResponse = await broadcast(response.signedTransaction)

      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          await getRegistryWorker().commitBumpRegistry(originalContentHash, `${broadcastResult.txid}:0`)
          loadingGroup()
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: t('success.registryPublication'),
              txid: broadcastResult.txid
            }
          }).onOk(() => {
            router.back()
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error) {
      $q.notify({ type: 'error', message: t('error.registryPublication') })
    } finally {
      loadingGroup()
    }
  })
}

const onReset = async () => {
  if (inMemoryRegistry.value) {
    inMemoryRegistry.value = undefined
    registryModified.value = false
    identitySnapshotModified.value = false
    $q.notify({ type: 'info', message: 'In-memory registry discarded.' })
    return
  }

  if (!registryRecord.value) return

  const loadingGroup = $q.loading.show({
    group: 'mpor-lg',
    message: t('info.clearingChanges')
  })
  try {
    const contentHash = registryRecord.value.contentHash
    registryRecord.value = undefined
    const resetRecord = await getRegistryWorker().resetRegistry({ contentHash })
    if (resetRecord) {
      registryRecord.value = resetRecord
      identitySnapshotRecord.value = undefined
      identitySnapshotModified.value = false
      registryModified.value = false
      await loadIdentitySnapshot()
      await loadNftTypes(0, 10)
      await loadUnpublishedNfts()
      await loadPublishedNfts(0, 10)
    }
  } catch (error) {
    $q.notify({ type: 'error', message: getErrorMessage(error) })
  } finally {
    loadingGroup()
  }
}

const openNftManager = () => {
  router.push(`/issuer/nft-collections/${authbase.value}/nft`)
}

watch(() => nftTypesTotal.value, (total) => {
  nftTypesPagination.value.rowsNumber = total
})

watch(() => publishedTotal.value, (total) => {
  publishedPagination.value.rowsNumber = total
})

watch(() => identitySnapshot.value?.token?.nfts, (nfts) => {
  if (nfts) {
    const isParsable = !!((nfts.parse as any)?.bytecode)
    const keyCol = nftTypeColumns[0]
    if (keyCol) keyCol.label = isParsable ? 'Bottom Alt Stack Hex' : 'Sequence Number'
  }
}, { deep: true, immediate: true })

onMounted(async () => {
  const authbaseVal = authbase.value
  if (!authbaseVal) {
    router.push('/dashboard')
    return
  }

  try {
    loading.value = true

    if (contentHashParam.value) {
      // Load specific registry version
      const worker = getRegistryWorker()
      const record = await worker.loadRegistry({ authbase: authbaseVal, sync: true })
      if (record && record.contentHash === contentHashParam.value) {
        registryRecord.value = record
      } else {
        const fromDb = await db.registry.where('contentHash').equals(contentHashParam.value).first()
        if (fromDb) {
          const { rawRegistry, ...rest } = fromDb
          const parsedRegistry = await worker.parseRegistry(rawRegistry, true)
          registryRecord.value = { ...rest, registry: parsedRegistry as CompactRegistry }
        }
      }
    } else {
      registryRecord.value = await getRegistryByAuthbase(authbaseVal)
    }

    if (registryRecord.value?.registry?.identities) {
      const timestamps = registryRecord.value.registry.identities[authbaseVal]
      if (timestamps && timestamps.length > 0) {
        selectedTimestamp.value = timestamps[0]
      }
    }
  } catch (error) {
    $q.notify({ type: 'error', message: t('error.loadingRegistry') })
  } finally {
    loading.value = false
  }

  // Load identity snapshot and NFTs in background
  loadIdentitySnapshot().catch((err) => {
    $q.notify({ type: 'error', message: getErrorMessage(err) })
  })

  if (registryRecord.value) {
    Promise.all([
      loadNftTypes(0, 10).catch(() => {
        $q.notify({ type: 'warning', message: 'Failed to load NFT types' })
      }),
      loadUnpublishedNfts().catch(() => {
        $q.notify({ type: 'warning', message: 'Failed to load unpublished NFTs' })
      }),
      loadPublishedNfts(0, 10).catch(() => {
        $q.notify({ type: 'warning', message: 'Failed to load published NFTs' })
      }),
    ])
  }
})
</script>

<style scoped lang="scss">
.border-radius-8 {
  border-radius: 8px;
}

.word-break-all {
  word-break: break-all;
}

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}

/* Dashboard header: translucent gradient from blue-10, fading to dark */
.avatar-banner-wrapper {
  background: linear-gradient(180deg,
      rgba(21, 101, 192, 0.04) 0%,
      /* blue-10 at 4% — subtle top glow */
      rgba(21, 101, 192, 0.015) 50%,
      /* nearly gone by midpoint */
      transparent 75%
      /* fully dark page bg */
    );
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 1.5rem;
  margin-bottom: 0.5rem;
}
</style>
