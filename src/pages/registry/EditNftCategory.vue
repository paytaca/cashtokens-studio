<template>
    <q-page :class="{ 'page--with-actions': showActions }">
        <div class="row justify-center">
            <div v-if="loading" class="col-xs-12 col-sm-10 col-md-8 q-my-lg q-pa-md">
                <!-- Back Button Placeholder -->
                <div class="q-mb-md q-px-sm">
                    <q-skeleton type="rect" width="80px" height="36px" class="bg-grey-9" />
                </div>

                <q-card flat class="bg-dark q-pa-lg">
                    <!-- Header/Title Placeholder -->
                    <div class="row items-center justify-between q-mb-lg">
                        <div class="row items-center q-gutter-x-sm">
                            <q-skeleton type="rect" width="24px" height="24px" class="bg-grey-9" />
                            <q-skeleton type="text" width="100px" class="text-h6 bg-grey-9" />
                        </div>
                        <q-skeleton type="rect" width="60px" height="28px" class="bg-grey-9" />
                    </div>

                    <!-- Avatar & Collection Metadata Placeholder -->
                    <div class="row items-center q-gutter-x-md q-mb-lg">
                        <q-skeleton type="circle" size="64px" class="bg-grey-9" />
                        <div class="q-gutter-y-xs" style="width: 150px;">
                            <q-skeleton type="text" class="text-subtitle1 bg-grey-9" />
                            <q-skeleton type="text" class="text-caption bg-grey-9" />
                        </div>
                    </div>

                    <!-- Token ID Field Placeholder -->
                    <div class="row q-mb-md">
                        <div class="col-12 q-gutter-y-xs">
                            <q-skeleton type="text" width="80px" class="text-caption bg-grey-9" />
                            <q-skeleton type="rect" height="40px" class="full-width border-radius-8 bg-grey-9" />
                        </div>
                    </div>

                    <!-- Form Description Placeholder -->
                    <div class="row q-mb-md">
                        <div class="col-12 q-gutter-y-xs">
                            <q-skeleton type="text" width="160px" class="text-caption bg-grey-9" />
                            <q-skeleton type="rect" height="56px" class="full-width border-radius-8 bg-grey-9" />
                        </div>
                    </div>

                    <!-- Collection Type Placeholder -->
                    <div class="row q-mb-xl">
                        <div class="col-12 q-gutter-y-xs">
                            <q-skeleton type="text" width="120px" class="text-caption bg-grey-9" />
                            <q-skeleton type="rect" width="100px" height="36px" class="border-radius-8 bg-grey-9" />
                        </div>
                    </div>

                    <!-- NFT Items Table Placeholder -->
                    <q-separator class="q-my-xl" dark></q-separator>
                    <q-skeleton type="text" width="100px" class="text-h6 q-mb-sm bg-grey-9" />
                    <q-card class="bg-grey-9 q-pa-md border-radius-12" flat>
                        <div class="row q-pb-md border-bottom border-grey-8">
                            <q-skeleton type="text" width="30%" class="bg-grey-8" />
                            <q-space />
                            <q-skeleton type="text" width="20%" class="bg-grey-8" />
                        </div>
                        <div v-for="i in 3" :key="i" class="row items-center q-py-md q-gutter-x-md">
                            <q-skeleton type="circle" size="40px" class="bg-grey-8" />
                            <div class="q-gutter-y-xs" style="width: 120px;">
                                <q-skeleton type="text" class="bg-grey-8" />
                                <q-skeleton type="text" width="60px" class="bg-grey-8" />
                            </div>
                        </div>
                    </q-card>
                </q-card>
            </div>
            <div v-else-if="identitySnapshot" class="col-xs-12 col-sm-10 col-md-8 q-my-lg q-pa-md content-col">
                <q-card flat class="bg-dark q-pa-lg rounded-borders">
                    <template v-if="nftCategory">
                        <div class="bg-dark q-mt-md" flat>
                            <h6 class="q-my-xs">NFT Category Info</h6>
                            <FormField>
                                <label class="q-mb-xs">Description</label>
                                <q-input v-model="nftCategory.description" class="full-width" outlined />
                            </FormField>
                            <FormField>
                                <label class="q-mb-xs flex justify-between no-wrap items-center">
                                    <div>Collection Type <q-btn dense flat round size="xs" icon="help_outline"
                                            color="grey-5" class="q-ml-xs" @click="showCollectionHelp" /></div>

                                    <q-toggle :model-value="collectionType === 'parsable'"
                                        @update:model-value="collectionType = $event ? 'parsable' : 'sequential'"
                                        label="Parseable" color="secondary" checked-icon="mdi-puzzle-edit"
                                        unchecked-icon="mdi-puzzle" />
                                </label>
                                <div v-if="collectionType === 'sequential'" class="flex items-center q-gutter-x-md">
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        Sequential
                                    </div>

                                </div>
                                <div v-else class="flex items-center q-gutter-x-md">
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        Parseable</div>
                                </div>
                            </FormField>
                            <FormField>
                                <template v-if="collectionType === 'parsable'">
                                    <ParsableNftCollection
                                        v-model:parsable-nft-collection="(nftCategory.parse as ParsableNftCollectionI)"
                                        v-model:fields="nftCategory.fields">
                                        <template #nftTypes>
                                            <q-separator class="q-my-xl"></q-separator>
                                            <template v-if="unpublishedNfts.length > 0">
                                                <div class="flex justify-between items-center q-mb-xs">
                                                    <h6 class="q-my-xs">Unpublished NFTs</h6>
                                                    <q-badge color="warning" :label="unpublishedNfts.length" />
                                                </div>
                                                <div class="table-scroll-wrapper">
                                                    <NftTable :rows="unpublishedNfts" :loading="unpublishedLoading"
                                                        :total="unpublishedNfts.length" @row-click="onNftRowClick"
                                                        :allow-delete="true" @row-delete="onNftRowDelete" />
                                                </div>
                                            </template>
                                            <h6 class="q-my-xs">Published NFTs</h6>
                                            <div class="table-scroll-wrapper">
                                                <NftTable :rows="nfts" :loading="nftsLoading" :total="nftsTotal"
                                                    @request="onNftsRequest" @row-click="onNftRowClick"
                                                    :allow-delete="true" @row-delete="onNftRowDelete" />
                                            </div>
                                        </template>
                                    </ParsableNftCollection>
                                </template>
                                <template v-else>
                                    <SequentialNftCollection
                                        v-model:sequential-nft-collection="(nftCategory.parse as SequentialNftCollectionI)">
                                        <template #nftTypes>
                                            <div class="flex justify-between">
                                                <div class="q-my-xs q-gutter-x-sm">
                                                    <span class="text-h6">NFT Collection Info</span>
                                                </div>
                                                <div class="flex q-gutter-x-sm items-center">

                                                    <q-btn flat no-caps icon="mdi-table-filter" label="Filter"
                                                        v-close-popup dense>
                                                        <q-menu anchor="bottom left" self="top end"
                                                            icon="mdi-table-filter">
                                                            <q-item clickable @click="nftsStatusFilter = 'published'">
                                                                <q-item-section avatar><q-icon
                                                                        v-if="nftsStatusFilter === 'published'"
                                                                        name="mdi-check" /></q-item-section>
                                                                <q-item-section>Published</q-item-section>
                                                            </q-item>
                                                            <q-item clickable @click="nftsStatusFilter = 'modified'">
                                                                <q-item-section avatar><q-icon
                                                                        v-if="nftsStatusFilter === 'modified'"
                                                                        name="mdi-check" /></q-item-section>
                                                                <q-item-section>Modified/Unpublished</q-item-section>
                                                            </q-item>
                                                            <q-item clickable @click="nftsStatusFilter = 'new'">
                                                                <q-item-section avatar><q-icon
                                                                        v-if="nftsStatusFilter === 'new'"
                                                                        name="mdi-check" /></q-item-section>
                                                                <q-item-section>New/Unpublished</q-item-section>
                                                            </q-item>
                                                            <q-item clickable @click="nftsStatusFilter = 'deleted'">
                                                                <q-item-section avatar><q-icon
                                                                        v-if="nftsStatusFilter === 'deleted'"
                                                                        name="mdi-check" /></q-item-section>
                                                                <q-item-section>To be deleted</q-item-section>
                                                            </q-item>
                                                        </q-menu>
                                                        <span class="q-ml-sm text-caption text-grey-6">({{
                                                            nftsStatusFilter
                                                            }})</span>
                                                    </q-btn>
                                                    <div>|</div>
                                                    <q-btn icon="mdi-table-plus" color="secondary" label="Add"
                                                        @click="onAddNftClick" flat no-caps dense>
                                                    </q-btn>
                                                </div>
                                            </div>
                                            <template v-if="unpublishedNfts.length > 0">
                                                <div class="flex justify-between items-center q-mt-lg q-mb-xs">
                                                    <h6 class="q-my-xs">Unpublished NFTs</h6>
                                                    <q-badge color="warning" :label="unpublishedNfts.length" />
                                                </div>
                                                <div class="table-scroll-wrapper">
                                                    <NftTable :rows="unpublishedNfts" :loading="unpublishedLoading"
                                                        :total="unpublishedNfts.length" @row-click="onNftRowClick"
                                                        :allow-delete="true" @row-delete="onNftRowDelete" />
                                                </div>
                                            </template>
                                            <h6 class="q-my-xs q-mt-lg">Published NFTs</h6>
                                            <div class="table-scroll-wrapper">
                                                <NftTable :rows="nfts" :loading="nftsLoading" :total="nftsTotal"
                                                    @request="onNftsRequest" @row-click="onNftRowClick"
                                                    :allow-delete="true" @row-delete="onNftRowDelete" />
                                            </div>
                                        </template>
                                    </SequentialNftCollection>
                                </template>
                            </FormField>
                        </div>
                    </template>
                    <template v-else>
                        <div>No NFT metadata</div>
                    </template>
                </q-card>
            </div>
        </div>
        <q-page-sticky v-if="showActions" position="bottom" class="q-pa-md items-center" expand>
            <div class="row justify-end q-gutter-md items-center bg-dark q-pa-md rounded-borders page-actions-bar"
                style="border: 1px solid #555; width: 100%;">
                <q-btn flat color="warning" icon="mdi-undo" label="Reset" @click="onResetClick" />
                <q-btn color="primary" unelevated label="Save" @click="onSaveClick" />
                <q-btn color="primary" unelevated label="Publish" @click="onPublishClick" />
            </div>
        </q-page-sticky>
    </q-page>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, triggerRef, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type {
    IdentitySnapshot,
    NftType,
    ParsableNftCollection as ParsableNftCollectionI,
    SequentialNftCollection as SequentialNftCollectionI
} from 'src/core/bcmr/bcmr-v2.schema'
import { type NftCategory as NftCategoryI } from 'src/core/bcmr/bcmr-v2.schema'
import { db, IdentitySnapshotRecord, NftRecord, RegistryRecordStatus } from 'src/core/client-db'
import { getRegistryWorker } from 'src/workers'
import { getErrorMessage } from 'src/core/utils'
import FormField from 'components/FormField.vue'
import ParsableNftCollection from 'components/bcmr/ParsableNftCollection.vue'
import SequentialNftCollection from 'components/bcmr/SequentialNftCollection.vue'
import HelpDialog from 'components/dialogs/HelpDialog.vue'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import NftTable from 'src/components/bcmr/NftTable.vue'
import { publishRegistry } from 'src/core/transaction'
import { UtxoWithAuthKey } from 'src/core/types'
import { UtxoWithPath } from 'src/core/wallet'
import { broadcastTransaction } from 'src/services/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { getNftCollectionType } from 'src/core/bcmr'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils'

const ROWS_PER_PAGE = 10

const DEFAULT_NFT_CATEGORY: NftCategoryI = {
    parse: { types: {} } as SequentialNftCollectionI,
}

const TASK_UPLOAD_REGISTRY = 'upload-registry'

const publishTaskList = [
    { id: TASK_UPLOAD_REGISTRY, label: 'Uploading registry to IPFS' },
    ...txTaskList,
]

const { wallet, manager } = inject('wizardConnectWallet') as any
const $q = useQuasar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authguardStore = useAuthguardStore()
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const { activeAuthhead } = storeToRefs(authguardStore)
const registryStore = useRegistryStore()
const { startLoader, updateStep, stopLoader } = useCancelableLoadingDialog()

const identitySnapshot = ref<IdentitySnapshot>()
const identitySnapshotRecord = useObservable(
    liveQuery(async () => {
        return await db.identitySnapshot.where({
            category: route.query.authbase
        }).first()
    }) as any,
    { initialValue: {} }
)

const initialSnapshotJson = ref('')

const modified = computed(() => {
    if (!initialSnapshotJson.value || !identitySnapshot.value) return false
    return JSON.stringify(identitySnapshot.value) !== initialSnapshotJson.value
})
const loading = ref(true)
const nfts = ref<NftRecord[]>([])
const nftsTotal = ref(0)
const nftsLoading = ref(false)
const nftsStatusFilter = ref<RegistryRecordStatus | undefined | ''>('published')
const nftsPagination = ref({ sortBy: 'type', descending: true, page: 1, rowsPerPage: ROWS_PER_PAGE, rowsNumber: 0 })
const unpublishedNfts = ref<NftRecord[]>([])
const unpublishedLoading = ref(false)
/**
 * 
 * The commitment or bottomAltStackHex
 * If collection type is 'sequential' this would be the last sequence when 'types' is sorted as numbers sequentially.
 * If collection type is 'parsable' this would be the last type when when 'types' is sorted using localeCompare.
 */
const nftsLastNftTypeKey = ref<string>('')

const unpublishedCount = computed(() => unpublishedNfts.value.length)

const showActions = computed(() => modified.value || unpublishedCount.value > 0)

/**
 * The contentHash/authbase/timestamp that identify this collection's identity snapshot.
 * Prefer the route query (the page is navigated to with these keys), falling back to the
 * active authhead. Using the query keeps this page consistent with onSaveClick and with the
 * keys the minted NftRecords were stored under.
 */
const nftKeys = computed<{ contentHash: string, authbase: string, timestamp: string } | undefined>(() => {
    const contentHash = route.query.contentHash as string | undefined
    const authbase = route.query.authbase as string | undefined
    const timestamp = route.query.timestamp as string | undefined
    if (contentHash && authbase && timestamp) {
        return { contentHash, authbase, timestamp }
    }
    const id = activeAuthhead.value?.identitySnapshotIdentifier
    if (!id) return undefined
    return {
        contentHash: id.contentHash,
        authbase: id.identity.authbase,
        timestamp: id.identity.timestamp
    }
})

const onAddNftClick = async () => {
    const keys = nftKeys.value
    if (!keys) return
    const lastKnownType = await getRegistryWorker().getNftsLastType({
        contentHash: keys.contentHash,
        authbase: keys.authbase,
        timestamp: keys.timestamp,
        publishedOnly: false
    })

    router.push({
        name: 'add-nft',
        query: {
            ...route.query,
            collectionType: getNftCollectionType(identitySnapshot.value as IdentitySnapshot),
            tokenSymbol: identitySnapshot.value?.token?.symbol,
            lastKnownType: lastKnownType?.type
        }
    })
}

const onNftRowClick = (_evt: Event, row: { type: string, nft: NftType }) => {
    const keys = nftKeys.value
    if (!keys) return
    const bytecode = (activeAuthhead.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode
    registryStore.setActiveNft({
        contentHash: keys.contentHash,
        authbase: keys.authbase,
        timestamp: keys.timestamp,
        category: activeAuthhead.value!.token!.category,
        bytecode,
        commitmentOrBottomAltStack: row.type,
        nftType: row.nft,
        allowEdit: true
    })
    router.push('/issuer/nft-collections/' + activeAuthhead.value!.token?.category + '/nft')
    router.push({
        name: 'edit-nft',
        query: { ...route.query, returnTo: route.path }
    })
}

const onNftRowDelete = async (_evt: Event, row: { type: string, nft: NftType }) => {
    const keys = nftKeys.value
    if (!keys) return
    await db.setNftRecordStatus({
        contentHash: keys.contentHash,
        authbase: keys.authbase,
        timestamp: keys.timestamp,
        status: 'deleted',
        type: row.type
    })
    await loadUnpublishedNfts()
}


const onNftsRequest = async (props: any) => {
    const { page, rowsPerPage } = props
    let offset = ((page - 1) * rowsPerPage) - 1
    if (offset < 0) {
        offset = 0
    }
    const limit = offset + rowsPerPage
    await loadNfts(offset, limit)
}

const loadNfts = async (offset: number, limit: number, statusFilter?: RegistryRecordStatus) => {
    const keys = nftKeys.value
    if (!keys) return
    nftsLoading.value = true
    try {
        const worker = getRegistryWorker()
        const result = await worker.getNfts({
            contentHash: keys.contentHash,
            authbase: keys.authbase,
            timestamp: keys.timestamp,
            offset,
            limit,
            status: statusFilter || nftsStatusFilter.value
        })
        console.log('@result, result', result)
        if (result) {
            nfts.value = result.items
            nftsTotal.value = result.total
            nftsLastNftTypeKey.value = result.lastNftTypeKey
        }
    }
    catch (error) {
        $q.notify({
            type: 'warning',
            message: t('warning.errorLoadingPublishedNfts')
        })
    } finally {
        nftsLoading.value = false
    }
}

const loadUnpublishedNfts = async () => {
    const keys = nftKeys.value
    if (!keys) return
    unpublishedLoading.value = true
    try {
        unpublishedNfts.value = await db.nfts
            .where('[contentHash+authbase+timestamp]')
            .equals([keys.contentHash, keys.authbase, keys.timestamp] as [string, string, string])
            .filter(n => n.status === 'new' || n.status === 'modified' || n.status === 'deleted')
            .toArray()
    } catch (error) {
        $q.notify({
            type: 'warning',
            message: t('warning.errorLoadingUnpublishedNfts')
        })
    } finally {
        unpublishedLoading.value = false
    }
}

const deleteUnpublishedNfts = async () => {
    const keys = nftKeys.value
    if (!keys) return
    await db.transaction('rw', db.nfts, async () => {
        for (const status of ['new', 'modified', 'deleted'] as RegistryRecordStatus[]) {
            await db.nfts
                .where('[contentHash+authbase+timestamp+status]')
                .equals([keys.contentHash, keys.authbase, keys.timestamp, status])
                .delete()
        }
    })
    unpublishedNfts.value = []
}

watch(nftsTotal, (total) => {
    nftsPagination.value.rowsNumber = total
})

watch(() => nftsStatusFilter.value, async () => {
    await onNftsRequest(nftsPagination.value)
})

const nftCategory = computed<NftCategoryI | null>({
    get() {
        return identitySnapshot.value?.token?.nfts ?? null
    },
    set(val) {
        if (identitySnapshot.value?.token && val) {
            identitySnapshot.value.token.nfts = val
        }
    }
})

const collectionType = ref<'sequential' | 'parsable'>('sequential')

watch([() => identitySnapshotRecord.value as IdentitySnapshotRecord, () => activeAuthhead.value as UtxoWithAuthKey], async ([newRecord, newActiveAuthhead]) => {
    if (Object.keys(newRecord || {}).length > 0 && !identitySnapshot.value && newActiveAuthhead) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord.identitySnapshot))

        // If the authhead is an NFT (any capability) but the registry has no
        // `token.nfts` yet, inject a default so the collection UI (and any
        // unpublished minted NFTs) is available.
        if (
            activeAuthhead.value?.token?.nft &&
            identitySnapshot.value?.token &&
            !identitySnapshot.value.token.nfts
        ) {
            identitySnapshot.value.token.nfts = { ...DEFAULT_NFT_CATEGORY }
        }

        const isParsable = !!((identitySnapshot.value?.token?.nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode)
        collectionType.value = isParsable ? 'parsable' : 'sequential'
        initialSnapshotJson.value = JSON.stringify(identitySnapshot.value)
        loading.value = false
        await loadNfts(0, ROWS_PER_PAGE)
        await loadUnpublishedNfts()
    }
}, { immediate: true })


const showCollectionHelp = () => {
    const isParsable = collectionType.value === 'parsable'
    $q.dialog({
        component: HelpDialog,
        componentProps: {
            message: isParsable ? t('info.parsableCollectionHelp') : t('info.sequentialCollectionHelp')
        }
    })
}

watch(
    () => identitySnapshot.value,
    (identitySnapshot) => {
        if (identitySnapshot) {
            initialSnapshotJson.value = JSON.stringify(identitySnapshot)
        }
    },
    { immediate: true }
)


watch(() => nftsStatusFilter.value, async (newNftsStatusFilter) => {
    if (newNftsStatusFilter) {
        await loadNfts(0, ROWS_PER_PAGE)
    }
})


const onSaveClick = async () => {
    if (!identitySnapshotRecord.value || !identitySnapshot.value) return
    try {
        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))
        console.log('@clonedSnapshot, clonedSnapshot', clonedSnapshot)
        console.log('@@', route.query.contentHash,
            route.query.authbase,
            route.query.timestamp)
        const x = await db.identitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([
                route.query.contentHash,
                route.query.authbase,
                route.query.timestamp
            ] as [string, string, string])

        console.log('@x, x', x.first())
        await db.identitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([
                route.query.contentHash,
                route.query.authbase,
                route.query.timestamp
            ] as [string, string, string])
            .modify({ identitySnapshot: clonedSnapshot, status: 'modified' })
        initialSnapshotJson.value = JSON.stringify(clonedSnapshot)
        // modified.value = false
        $q.notify({ type: 'positive', message: t('success.savedDescription') })
    } catch (error) {
        $q.notify({ type: 'error', message: getErrorMessage(error) })
    }
}

const onPublishClick = async () => {

    startLoader(publishTaskList, () => {
        $q.notify({ type: 'warning', message: 'Cancelled by user' })
    })

    updateStep(TASK_UPLOAD_REGISTRY, 'running')

    try {

        const { contentHash, identity } = activeAuthhead.value!.identitySnapshotIdentifier!

        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))

        const id = (identitySnapshotRecord.value as IdentitySnapshotRecord).id

        await db.identitySnapshot
            .where('id')
            .equals(id)
            .modify({ identitySnapshot: clonedSnapshot, status: 'modified' })

        // initialSnapshotJson.value = JSON.stringify(clonedSnapshot)

        const bumpArtifact = await getRegistryWorker().bumpRegistry({
            originalContentHash: contentHash,
            bumpType: 'patch',
            targetIdentity: {
                authbase: identity.authbase,
                timestamp: identity.timestamp
            }
        })

        if (!bumpArtifact) {
            throw new Error('Error uploading registry')
        }

        updateStep(TASK_UPLOAD_REGISTRY, 'done')
        updateStep(TASK_INPUTS_CHECK, 'running')

        await wallet.value.sync()

        triggerRef(wallet)

        updateStep(TASK_INPUTS_CHECK, 'done')
        updateStep(TASK_PREPARE_TX, 'running')

        const publishRegistryRequest = publishRegistry({
            authhead: activeAuthhead.value as UtxoWithAuthKey,
            funderUtxos: wallet.value.utxos as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK,
            registryPublicationData: {
                contentHash: bumpArtifact.contentHash,
                uris: bumpArtifact.uris
            }
        })

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        const response = await manager.value!.signTransaction(publishRegistryRequest);

        updateStep(TASK_WAIT_FOR_SIG, 'done')
        updateStep(TASK_BROADCASTING, 'running')

        const [broadcastError, txid] = await broadcastTransaction({
            transactionHex: response.signedTransaction,
            network: import.meta.env.VITE_BCH_NETWORK,
            onProgress: (progress: string) => {
                const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
                updateStep(TASK_BROADCASTING, 'running', newLabel)
            }
        })

        if (broadcastError) {
            updateStep(TASK_BROADCASTING, 'failed')
            throw broadcastError
        }

        await getRegistryWorker().commitBumpRegistry(contentHash, `${txid}:0`)

        updateStep(TASK_BROADCASTING, 'done')
        updateStep(TASK_WAITING_PROPAGATION, 'running')

        initialSnapshotJson.value = JSON.stringify(clonedSnapshot)

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet

        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: txid
        })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'running')

        loadAuthkeys(wallet.value, true).then(() => {
            triggerRef(wallet)
        })

        await updateActiveAuthhead()

        // The registry now lives at a new contentHash — keep the route query
        // (which drives nftKeys) pointed at it so this page reads the new rows.
        if (bumpArtifact.contentHash !== route.query.contentHash) {
            router.replace({ query: { ...route.query, contentHash: bumpArtifact.contentHash } })
        }

        updateStep(TASK_REFRESH_UTXOS, 'done')

        await db.saveActivity({
            event: `Published NFT metadata of ${activeAuthhead.value?.identitySnapshot?.token?.category || activeAuthhead.value!.token?.category}`,
            txid,
            status: 'success'
        })

        stopLoader(1000)

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('success.registryPublication'),
                txid
            }
        }).onOk(async () => {
            registryStore.loadRegistry(identity.authbase, true).then(async () => {
                loadNfts(0, ROWS_PER_PAGE)
                loadUnpublishedNfts()
            })
        })
    } catch (error: any) {
        $q.notify({ type: 'Error', message: error.message })
        stopLoader(3000)
    }
}

const onResetClick = () => {
    if (!initialSnapshotJson.value) return

    const resetSnapshot = () => {
        identitySnapshot.value = JSON.parse(initialSnapshotJson.value)
    }

    if (unpublishedNfts.value.length === 0) {
        resetSnapshot()
        return
    }

    $q.dialog({
        title: t('warning.resetNftCategoryTitle'),
        message: t('warning.resetNftCategoryMessage', { count: unpublishedNfts.value.length }),
        cancel: { label: t('button.cancel'), flat: true, color: 'grey-6' },
        ok: { label: t('button.reset'), color: 'warning', unelevated: true },
        persistent: true
    }).onOk(async () => {
        await deleteUnpublishedNfts()
        resetSnapshot()
    })
}


onMounted(async () => {
    await loadUnpublishedNfts()
})

</script>

<style scoped lang="scss">
// Total height reserved for the bottom action bar (sticky padding + bar).
$page-actions-height: 6.5rem;

.page--with-actions {
    --page-actions-height: #{$page-actions-height};
    padding-bottom: var(--page-actions-height);
}

.page-actions-bar {
    // The sticky applies 1rem of padding top/bottom (q-pa-md), so the bar itself
    // must fill the rest of the reserved height to keep the two in lock-step.
    min-height: calc(var(--page-actions-height, #{$page-actions-height}) - 2rem);
}

.border-radius-8 {
    border-radius: 8px;
}

.word-break-all {
    word-break: break-all;
}

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}

/* Let the flex column shrink below its content width so a wide table can't
   widen (and overflow) the page. */
.content-col {
    min-width: 0;
}

/* Horizontal scroll container for the NFT tables. */
.table-scroll-wrapper {
    display: block;
    width: 100%;
    max-width: 350px;
    min-width: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.table-scroll-wrapper::-webkit-scrollbar {
    height: 4px;
}

.table-scroll-wrapper::-webkit-scrollbar-track {
    background: transparent;
}

.table-scroll-wrapper::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
}
</style>
