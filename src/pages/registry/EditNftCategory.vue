<template>
    <q-page>
        <div class="row justify-center">
            <div v-if="loading" class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
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
            <div v-else-if="identitySnapshot" class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
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
                                            <h6 class="q-my-xs">NFT Collection</h6>
                                            <NftTable :rows="nfts" :loading="nftsLoading" :total="nftsTotal"
                                                @request="onNftsRequest" @row-click="onNftRowClick" :allow-delete="true"
                                                @row-delete="onNftRowDelete" />
                                        </template>
                                    </ParsableNftCollection>
                                </template>
                                <template v-else>
                                    <SequentialNftCollection
                                        v-model:sequential-nft-collection="(nftCategory.parse as SequentialNftCollectionI)">
                                        <template #nftTypes>
                                            <div class="flex justify-between">
                                                <h6 class="q-my-xs">NFT Collection</h6>
                                                <q-btn flat unelevated class="q-px-sm" no-caps
                                                    icon-right="mdi-table-filter" v-close-popup>
                                                    <q-menu anchor="bottom left" self="top end" icon="mdi-table-filter">
                                                        <q-item clickable @click="nftsStatusFilter = ''">
                                                            <q-item-section>All</q-item-section>
                                                        </q-item>
                                                        <q-item clickable @click="nftsStatusFilter = 'published'">
                                                            <q-item-section>Published</q-item-section>
                                                        </q-item>
                                                        <q-item clickable @click="nftsStatusFilter = 'modified'">
                                                            <q-item-section>Modified/Unpublished</q-item-section>
                                                        </q-item>
                                                        <q-item clickable @click="nftsStatusFilter = 'new'">
                                                            <q-item-section>New/Unpublished</q-item-section>
                                                        </q-item>
                                                        <q-item clickable @click="nftsStatusFilter = 'deleted'">
                                                            <q-item-section>To be deleted</q-item-section>
                                                        </q-item>
                                                    </q-menu>
                                                </q-btn>

                                            </div>
                                            <NftTable :rows="nfts" :loading="nftsLoading" :total="nftsTotal"
                                                @request="onNftsRequest" @row-click="onNftRowClick" :allow-delete="true"
                                                @row-delete="onNftRowDelete" />

                                        </template>
                                    </SequentialNftCollection>
                                </template>
                            </FormField>
                        </div>
                    </template>
                </q-card>
            </div>
        </div>
        <q-page-sticky v-if="modified && unpublishedNfts.length > 0" position="bottom" class="q-pa-md items-center"
            expand>
            <div class="row justify-end q-gutter-md items-center bg-dark q-pa-md rounded-borders"
                style="border: 1px solid #555; width: 100%;">
                <q-btn flat color="warning" icon="mdi-undo" label="Reset" @click="onResetClick" />
                <q-btn color="primary" unelevated label="Save" @click="save" />
            </div>
        </q-page-sticky>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { QTableColumn } from 'quasar'
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
import { delay } from 'mainnet-js-v3'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import NftTable from 'src/components/bcmr/NftTable.vue'


const $q = useQuasar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const registryStore = useRegistryStore()

const loading = ref(true)
const identitySnapshot = ref<IdentitySnapshot>()
const identitySnapshotRecord = useObservable(
    liveQuery(async () => {
        return await db.registryIdentitySnapshot.where({
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

const unpublishedNfts = ref<NftRecord[]>([])

const publishedTotal = ref(0)
const publishedLoading = ref(false)

const nfts = ref<NftRecord[]>([])
const nftsTotal = ref(0)
const nftsLoading = ref(false)
const nftsStatusFilter = ref<RegistryRecordStatus | undefined | ''>()

const publishedPagination = ref({ sortBy: 'type', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })
const nftsPagination = ref({ sortBy: 'type', descending: true, page: 1, rowsPerPage: 2, rowsNumber: 0 })


const onNftRowClick = (_evt: Event, row: { type: string, nft: NftType }) => {
    const id = activeAuthhead.value?.identitySnapshotIdentifier
    const bytecode = (activeAuthhead.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode
    registryStore.setActiveNft({
        contentHash: id!.contentHash,
        authbase: id!.identity.authbase,
        timestamp: id!.identity.timestamp,
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
    try {
        await db.setNftRecordStatus({
            contentHash: activeAuthhead.value!.identitySnapshotIdentifier!.contentHash,
            authbase: activeAuthhead.value!.identitySnapshotIdentifier!.identity!.authbase,
            timestamp: activeAuthhead.value!.identitySnapshotIdentifier!.identity!.timestamp,
            status: 'deleted',
            type: row.type
        })
        console.log('row', row)
    } catch (error) {

        console.log(error)
    }
}


const onNftsRequest = async (props: any) => {
    console.log('Loading nfts props', props)
    const { page, rowsPerPage } = props.pagination
    await loadNfts((page - 1) * rowsPerPage, rowsPerPage)
}

const loadNfts = async (offset: number, limit: number) => {
    console.log('Loading nfts', nftsStatusFilter.value)
    if (!activeAuthhead.value?.identitySnapshotIdentifier) return
    nftsLoading.value = true
    try {
        const worker = getRegistryWorker()
        const result = await worker.getNfts({
            contentHash: activeAuthhead.value?.identitySnapshotIdentifier.contentHash,
            authbase: activeAuthhead.value?.identitySnapshotIdentifier.identity.authbase,
            timestamp: activeAuthhead.value?.identitySnapshotIdentifier.identity.timestamp,
            offset,
            limit,
            status: nftsStatusFilter.value
        })
        console.log('RESULT', result)
        if (result) {
            nfts.value = result.items
            nftsTotal.value = result.total
        }
    }
    catch (error) {
        console.log('ERROR', error)
        $q.notify({
            type: 'warning',
            message: t('warning.errorLoadingPublishedNfts')
        })
    } finally {
        nftsLoading.value = false
    }
}

watch(publishedTotal, (total) => {
    publishedPagination.value.rowsNumber = total
})

watch(nftsTotal, (total) => {
    nftsPagination.value.rowsNumber = total
})

watch(() => nftsStatusFilter.value, async (v) => {
    console.log('nftsStatusFilter changed', v)
    await loadNfts(0, nftsPagination.value.rowsPerPage)
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

const typesRef = ref<Record<string, NftType>>({})
// const nftTypesLoading = ref(false)
// const nftTypesPagination = ref({ sortBy: 'hexKey', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })
// const nftTypesTotal = ref(0)

// const nftTypeColumns: QTableColumn[] = [
//     { name: 'key', align: 'left', label: 'Sequence Number', field: 'hexKey', sortable: true },
//     { name: 'name', align: 'left', label: 'Name', field: 'name', sortable: true },
// ]

// const nftTypeRows = computed(() => {
//     return Object.entries(typesRef.value).map(([key, value]) => ({
//         originalKey: key,
//         hexKey: key,
//         ...value
//     }))
// })

// watch(collectionType, (type) => {
//     const keyCol = nftTypeColumns[0]
//     if (keyCol) keyCol.label = type === 'parsable' ? 'Bottom Alt Stack Hex' : 'Sequence Number'
//     if (!nftCategory.value) return
//     const currentParse = nftCategory.value.parse as any
//     const currentTypes = currentParse.types || {}
//     if (type === 'parsable') {
//         nftCategory.value = {
//             ...nftCategory.value,
//             parse: { bytecode: currentParse.bytecode ?? '', types: currentTypes }
//         }
//     } else {
//         const { bytecode: _, ...rest } = currentParse
//         nftCategory.value = {
//             ...nftCategory.value,
//             parse: rest
//         }
//     }
//     initialSnapshotJson.value = JSON.stringify(identitySnapshot.value)
// })

// watch(nftTypesTotal, (total) => {
//     nftTypesPagination.value.rowsNumber = total
// })

watch(() => nftCategory.value?.parse?.types, (types) => {
    if (types) {
        typesRef.value = types
    }
}, { deep: true, immediate: true })

watch(() => identitySnapshotRecord.value as IdentitySnapshotRecord, async (newRecord: IdentitySnapshotRecord) => {
    if (newRecord && Object.keys(newRecord || {}).length > 0 && !identitySnapshot.value) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord.identitySnapshot))
        const isParsable = !!((identitySnapshot.value?.token?.nfts?.parse?.types?.parse as ParsableNftCollectionI | undefined)?.bytecode)
        collectionType.value = isParsable ? 'parsable' : 'sequential'
        initialSnapshotJson.value = JSON.stringify(identitySnapshot.value)
        await loadNfts(0, 2)
    }
}, { immediate: true })

// const loadNftTypes = async (offset: number, limit: number) => {
//     if (!identitySnapshot.value?.token?.nfts?.parse) return
//     nftTypesLoading.value = true
//     try {
//         const result = await getRegistryWorker().getNfts({
//             contentHash: route.query.contentHash as string,
//             authbase: route.query.authbase as string,
//             timestamp: route.query.timestamp as string,
//             offset,
//             limit
//         })
//         if (result) {
//             nftTypesTotal.value = result.total
//             const dict: Record<string, NftType> = {}
//             for (const item of result.items) {
//                 dict[item.type] = item.nft
//             }
//             typesRef.value = dict
//             if (nftCategory.value) {
//                 ; (nftCategory.value.parse as any).types = dict
//             }
//         }
//     } catch (error) {
//         $q.notify({ type: 'error', message: getErrorMessage(error) })
//     } finally {
//         nftTypesLoading.value = false
//     }
// }

// const onNftTypesRequest = async (props: any) => {
//     const { page, rowsPerPage } = props.pagination
//     // await loadNftTypes((page - 1) * rowsPerPage, rowsPerPage)
// }

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

// watch(
//     () => identitySnapshot.value,
//     (snapshot) => {
//         if (!snapshot || !initialSnapshotJson.value) return
//         modified.value = JSON.stringify(snapshot) !== initialSnapshotJson.value
//     },
//     { deep: true }
// )

const save = async () => {
    if (!identitySnapshotRecord.value || !identitySnapshot.value) return
    try {
        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))
        await db.registryIdentitySnapshot
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

const onResetClick = () => {
    if (!initialSnapshotJson.value) return
    identitySnapshot.value = JSON.parse(initialSnapshotJson.value)
}

onMounted(async () => {
    console.log('Active Authhead', activeAuthhead)
    try {
        loading.value = true
        const authbase = route.query.authbase as string
        if (!authbase) {
            router.push({ path: '/dashboard' })
            return
        }

        if (activeAuthhead.value?.identitySnapshot) {
            publishedLoading.value = true
            await loadNfts(0, 2)
        }

    } catch (error) {
        $q.notify({ type: 'error', message: t('error.loadingRegistry') })
    } finally {
        loading.value = false
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
</style>
