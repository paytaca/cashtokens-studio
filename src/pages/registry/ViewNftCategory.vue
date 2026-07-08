<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div v-if="loading" class="col-xs-12 col-sm-8 col-md-6 flex justify-left q-gutter-y-md">
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
            </div>
            <div v-else-if="identitySnapshot" class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="router.back()" />
                </div>
                <q-card flat class="bg-dark q-pa-lg">
                    <q-card-title class="flex items-center q-gutter-x-sm q-mb-lg justify-between text-grey-6">
                        <div class="q-gutter-x-sm flex items-center"><q-icon name="mdi-information-variant-box"
                                size="sm" /><span class="text-h6 text-weight-bold ">NFT Info</span></div>
                        <q-btn icon="mdi-text-box-edit" :label="$q.screen.gt.xs ? 'Edit' : ''" dense flat
                            color="secondary" @click="onEditNftCategoryClick">
                        </q-btn>
                    </q-card-title>
                    <div class="row items-center q-gutter-x-md q-mb-lg">
                        <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="identitySnapshot.uris?.icon"
                                :src="ipfsToGatewayUrl(identitySnapshot.uris?.icon)!" fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs token-symbol">
                                {{ identitySnapshot.token?.symbol || "Unknown" }}
                            </div>
                            <div class="text-caption">
                                {{ identitySnapshot.name || 'Unnamed Collection' }}
                            </div>
                        </div>
                        <q-space />
                        <label v-if="modified" class="text-caption text-warning">[Modified]</label>
                    </div>
                    <div class="row">
                        <div class="col-12">
                            <div class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Token ID
                            </div>
                            <div
                                class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                {{ identitySnapshot.token!.category }}
                                <CopyText :text="identitySnapshot.token!.category" />
                            </div>
                        </div>
                    </div>
                    <template v-if="nftCategory">
                        <q-card class="bg-dark q-mt-md" flat>
                            <FormField v-if="nftCategory.description">
                                <label class="q-mb-xs">NFT Category Description</label>
                                <q-input v-model="nftCategory.description" class="full-width" outlined />
                            </FormField>
                            <FormField>
                                <label class="q-mb-xs flex justify-between no-wrap items-center">
                                    <div>Collection Type <q-btn dense flat round size="xs" icon="help_outline"
                                            color="grey-5" class="q-ml-xs" @click="showCollectionHelp" /></div>
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
                                            <h6 class="q-my-xs">NFT Items</h6>
                                            <q-table :rows="publishedNfts" :columns="publishedColumns" row-key="type"
                                                flat dark :loading="publishedLoading"
                                                v-model:pagination="publishedPagination" @request="onPublishedRequest"
                                                @row-click="onNftRowClick" class="bg-dark border-radius-12">
                                                <template v-slot:body-cell-type="props">
                                                    <q-td :props="props" class="text-mono">
                                                        <div class="flex items-center no-wrap q-gutter-x-md">
                                                            <div class="flex column items-center">
                                                                <q-avatar size="md">
                                                                    <q-img v-if="props.row.nft?.uris?.icon"
                                                                        :src="ipfsToGatewayUrl(props.row.nft?.uris?.icon)!"
                                                                        fit="cover">
                                                                    </q-img>
                                                                    <q-img v-else
                                                                        :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.type}`"
                                                                        fit="cover">
                                                                        <q-tooltip
                                                                            class="bg-grey-9 text-caption text-grey-4">No
                                                                            Icon —
                                                                            generated
                                                                            placeholder</q-tooltip>
                                                                    </q-img>
                                                                </q-avatar>
                                                                <span v-if="!props.row.nft?.uris?.icon"
                                                                    class="text-grey-6 font-8 q-mt-xs"
                                                                    style="line-height: 1;">No Icon</span>
                                                                <span v-else class="text-grey-6 font-8 q-mt-xs"
                                                                    style="line-height: 1;"></span>

                                                            </div>
                                                            <div>
                                                                <div class="text-bold">{{ props.row.nft.name }}</div>
                                                                <div class="icon-badge-hex text-grey-8">
                                                                    &lt;{{ props.row.type }}&gt;
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </q-td>
                                                </template>
                                                <template v-slot:body-cell-name="props">
                                                    <q-td :props="props">{{ props.row.nft.name }} </q-td>

                                                </template>
                                                <template v-slot:no-data>
                                                    <div class="text-grey-5 text-center q-pa-md">No published NFTs</div>
                                                </template>
                                            </q-table>
                                        </template>
                                    </ParsableNftCollection>
                                </template>
                                <template v-else>
                                    <SequentialNftCollection
                                        v-model:sequential-nft-collection="(nftCategory.parse as SequentialNftCollectionI)">
                                        <template #nftTypes>
                                            <q-separator class="q-my-xl"></q-separator>
                                            <h6 class="q-my-xs">NFT Items</h6>

                                            <q-table :rows="publishedNfts" :columns="publishedColumns" row-key="type"
                                                flat dark :loading="publishedLoading"
                                                v-model:pagination="publishedPagination" @request="onPublishedRequest"
                                                @row-click="onNftRowClick" class="bg-dark border-radius-12">
                                                <template v-slot:body-cell-type="props">
                                                    <q-td :props="props" class="text-mono">
                                                        <div class="flex items-center no-wrap q-gutter-x-md">
                                                            <div class="flex column items-center">
                                                                <q-avatar size="md">
                                                                    <q-img v-if="props.row.nft?.uris?.icon"
                                                                        :src="ipfsToGatewayUrl(props.row.nft?.uris?.icon)!"
                                                                        fit="cover">
                                                                    </q-img>
                                                                    <q-img v-else
                                                                        :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.type}`"
                                                                        fit="cover">
                                                                        <q-tooltip
                                                                            class="bg-grey-9 text-caption text-grey-4">No
                                                                            Icon —
                                                                            generated
                                                                            placeholder</q-tooltip>
                                                                    </q-img>
                                                                </q-avatar>
                                                                <span v-if="!props.row.nft?.uris?.icon"
                                                                    class="text-grey-6 font-8 q-mt-xs"
                                                                    style="line-height: 1;">No Icon</span>
                                                                <span v-else class="text-grey-6 font-8 q-mt-xs"
                                                                    style="line-height: 1;"></span>

                                                            </div>
                                                            <div>
                                                                <div class="text-bold">{{ props.row.nft.name }}</div>
                                                                <div class="icon-badge-hex text-grey-8">
                                                                    &lt;{{ props.row.type }}&gt;
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </q-td>
                                                </template>
                                                <template v-slot:body-cell-name="props">
                                                    <q-td :props="props">{{ props.row.nft.name }} </q-td>

                                                </template>
                                                <template v-slot:no-data>
                                                    <div class="text-grey-5 text-center q-pa-md">No published NFTs</div>
                                                </template>
                                            </q-table>
                                        </template>
                                    </SequentialNftCollection>
                                </template>
                            </FormField>

                        </q-card>
                    </template>
                </q-card>
            </div>
        </div>
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
import { db, IdentitySnapshotRecord, NftRecord, setRecordStatus } from 'src/core/client-db'
import { getRegistryWorker } from 'src/workers'
import { getErrorMessage } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import FormField from 'components/FormField.vue'
import ParsableNftCollection from 'components/bcmr/ParsableNftCollection.vue'
import SequentialNftCollection from 'components/bcmr/SequentialNftCollection.vue'
import HelpDialog from 'components/dialogs/HelpDialog.vue'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { delay } from 'mainnet-js-v3'

const DEFAULT_NFT_CATEGORY: NftCategoryI = {
    parse: { types: {} } as SequentialNftCollectionI,
};

const $q = useQuasar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const registryStore = useRegistryStore()

const loading = ref(true)
const modified = ref(false)
const identitySnapshotRecord = ref<IdentitySnapshotRecord>()
const initialSnapshotJson = ref('')

const unpublishedNfts = ref<NftRecord[]>([])
const publishedNfts = ref<{ type: string, nft: NftType }[]>([])
const publishedTotal = ref(0)
const publishedLoading = ref(false)
const publishing = ref(false)
const refreshing = ref(false)

const publishedColumns: QTableColumn[] = [
    { name: 'type', label: 'Items', field: 'type', align: 'left', sortable: true },
]

const publishedPagination = ref({ sortBy: 'type', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })

const loadUnpublishedNfts = async () => {
    try {
        if (!activeAuthhead.value?.identitySnapshotIdentifier) return
        unpublishedNfts.value = await db.nfts
            .where('[contentHash+authbase+timestamp]')
            .equals([
                activeAuthhead.value.identitySnapshotIdentifier.contentHash,
                activeAuthhead.value.identitySnapshotIdentifier.identity.authbase,
                activeAuthhead.value.identitySnapshotIdentifier.identity.timestamp,
            ] as [string, string, string])
            .filter(n => n.status === 'new' || n.status === 'modified')
            .toArray()
    } catch (error) {
        $q.notify({
            type: 'warning',
            message: t('warning.errorLoadingUnpublishedNfts')
        })
    }
}

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

    router.push({
        name: 'view-nft',
        query: { ...route.query, returnTo: route.path },
        params: { type: row.type, }
    })
}


const loadPublishedNfts = async (offset: number, limit: number) => {
    if (!activeAuthhead.value?.identitySnapshotIdentifier) return
    publishedLoading.value = true
    try {
        const worker = getRegistryWorker()
        const result = await worker.getNftTypes({
            contentHash: activeAuthhead.value?.identitySnapshotIdentifier.contentHash,
            authbase: activeAuthhead.value?.identitySnapshotIdentifier.identity.authbase,
            timestamp: activeAuthhead.value?.identitySnapshotIdentifier.identity.timestamp,
            offset,
            limit
        })
        console.log('RESULT', result)
        if (result) {
            publishedNfts.value = result.items
            publishedTotal.value = result.total
        }
    }
    catch (error) {
        console.log('ERROR', error)
        $q.notify({
            type: 'warning',
            message: t('warning.errorLoadingPublishedNfts')
        })
    } finally {
        publishedLoading.value = false
    }
}

const onPublishedRequest = async (props: any) => {
    const { page, rowsPerPage } = props.pagination
    await loadPublishedNfts((page - 1) * rowsPerPage, rowsPerPage)
}

watch(publishedTotal, (total) => {
    publishedPagination.value.rowsNumber = total
})


const authbase = computed(() => route.query.authbase as string)

const identitySnapshot = computed<IdentitySnapshot | null>({
    get() {
        return identitySnapshotRecord.value?.identitySnapshot ?? null
    },
    set(val) {
        if (identitySnapshotRecord.value && val) {
            identitySnapshotRecord.value.identitySnapshot = val
        }
    }
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
const nftTypesLoading = ref(false)
const nftTypesPagination = ref({ sortBy: 'hexKey', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })
const nftTypesTotal = ref(0)

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

watch(collectionType, (type) => {
    const keyCol = nftTypeColumns[0]
    if (keyCol) keyCol.label = type === 'parsable' ? 'Bottom Alt Stack Hex' : 'Sequence Number'
    if (!nftCategory.value) return
    const currentParse = nftCategory.value.parse as any
    const currentTypes = currentParse.types || {}
    if (type === 'parsable') {
        nftCategory.value = {
            ...nftCategory.value,
            parse: { bytecode: currentParse.bytecode ?? '', types: currentTypes }
        }
    } else {
        const { bytecode: _, ...rest } = currentParse
        nftCategory.value = {
            ...nftCategory.value,
            parse: rest
        }
    }
    initialSnapshotJson.value = JSON.stringify(identitySnapshot.value)
})

watch(nftTypesTotal, (total) => {
    nftTypesPagination.value.rowsNumber = total
})

watch(() => nftCategory.value?.parse?.types, (types) => {
    if (types) {
        typesRef.value = types
    }
}, { deep: true, immediate: true })

const loadNftTypes = async (offset: number, limit: number) => {
    const record = identitySnapshotRecord.value
    if (!record?.identitySnapshot?.token?.nfts?.parse) return
    nftTypesLoading.value = true
    try {
        const result = await getRegistryWorker().getNftTypes({
            contentHash: record.contentHash,
            authbase: authbase.value,
            timestamp: record.timestamp,
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
                ; (nftCategory.value.parse as any).types = dict
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
    () => identitySnapshotRecord.value,
    (record) => {
        if (record?.identitySnapshot) {
            initialSnapshotJson.value = JSON.stringify(record.identitySnapshot)
        }
    },
    { immediate: true }
)

watch(
    () => identitySnapshot.value,
    (snapshot) => {
        if (!snapshot || !initialSnapshotJson.value) return
        modified.value = JSON.stringify(snapshot) !== initialSnapshotJson.value
    },
    { deep: true }
)

const save = async () => {
    if (!identitySnapshotRecord.value || !identitySnapshot.value) return
    try {
        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))
        identitySnapshotRecord.value.identitySnapshot = clonedSnapshot
        setRecordStatus(identitySnapshotRecord.value, 'modified')
        await db.registryIdentitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([
                identitySnapshotRecord.value.contentHash,
                identitySnapshotRecord.value.authbase,
                identitySnapshotRecord.value.timestamp
            ] as [string, string, string])
            .modify({ identitySnapshot: clonedSnapshot, status: identitySnapshotRecord.value.status })
        initialSnapshotJson.value = JSON.stringify(clonedSnapshot)
        modified.value = false
        $q.notify({ type: 'positive', message: t('success.savedDescription') })
    } catch (error) {
        $q.notify({ type: 'error', message: getErrorMessage(error) })
    }
}

const reset = async () => {
    if (!identitySnapshotRecord.value) return
    try {
        const contentHash = identitySnapshotRecord.value.contentHash
        const record = await getRegistryWorker().getIdentitySnapshot({
            contentHash,
            identity: {
                authbase: identitySnapshotRecord.value.authbase,
                timestamp: identitySnapshotRecord.value.timestamp
            }
        })
        if (record) {
            if (record.identitySnapshot.token && !record.identitySnapshot.token.nfts) {
                identitySnapshotRecord.value = {
                    ...record,
                    identitySnapshot: {
                        ...record.identitySnapshot,
                        token: { ...record.identitySnapshot.token, nfts: { ...DEFAULT_NFT_CATEGORY } }
                    }
                }
            } else {
                identitySnapshotRecord.value = record
            }
            const nfts = identitySnapshotRecord.value.identitySnapshot.token?.nfts
            const isParsable = !!((nfts?.parse as any)?.bytecode)
            collectionType.value = isParsable ? 'parsable' : 'sequential'
            const keyCol = nftTypeColumns[0]
            if (keyCol) keyCol.label = isParsable ? 'Bottom Alt Stack Hex' : 'Sequence Number'
            await loadNftTypes(0, 10)
            modified.value = false
            $q.notify({ type: 'info', message: t('info.clearingChanges') })
        }
    } catch (error) {
        $q.notify({ type: 'error', message: getErrorMessage(error) })
    }
}

const onEditNftCategoryClick = () => {
    router.push({ name: 'edit-identity-snapshot-nfts', query: route.query })
}

onMounted(async () => {
    console.log('Active Authhead', activeAuthhead)
    try {
        loading.value = true
        const authbaseVal = authbase.value
        if (!authbaseVal) {
            router.push({ path: '/dashboard' })
            return
        }

        const contentHash = route.query.contentHash as string | undefined
        const timestamp = route.query.timestamp as string | undefined

        if (contentHash && timestamp) {
            identitySnapshotRecord.value = await getRegistryWorker().getIdentitySnapshot({
                contentHash,
                identity: { authbase: authbaseVal, timestamp }
            })
        } else {
            const registryRecord = await getRegistryWorker().loadRegistry({ authbase: authbaseVal })
            if (registryRecord?.registry?.identities?.[authbaseVal]) {
                const timestamps = registryRecord.registry.identities[authbaseVal]
                const latestTimestamp = timestamps.sort((a, b) => b.localeCompare(a))[0]
                if (latestTimestamp) {
                    identitySnapshotRecord.value = await getRegistryWorker().getIdentitySnapshot({
                        contentHash: registryRecord.contentHash,
                        identity: { authbase: authbaseVal, timestamp: latestTimestamp }
                    })
                }
            }
        }

        const rec = identitySnapshotRecord.value
        if (rec && rec.identitySnapshot.token && !rec.identitySnapshot.token.nfts) {
            identitySnapshotRecord.value = {
                ...rec,
                identitySnapshot: {
                    ...rec.identitySnapshot,
                    token: { ...rec.identitySnapshot.token, nfts: { ...DEFAULT_NFT_CATEGORY } }
                }
            }
        }

        const snapshot = identitySnapshotRecord.value?.identitySnapshot
        const nfts = snapshot?.token?.nfts
        const isParsable = !!((nfts?.parse as ParsableNftCollectionI | undefined)?.bytecode)
        collectionType.value = isParsable ? 'parsable' : 'sequential'

        const keyCol = nftTypeColumns[0]
        if (keyCol) keyCol.label = isParsable ? 'Bottom Alt Stack Hex' : 'Sequence Number'

        if (identitySnapshotRecord.value?.contentHash) {
            await loadNftTypes(0, 10)
        }

        if (activeAuthhead.value?.identitySnapshot) {
            publishedLoading.value = true
            await loadUnpublishedNfts()
            await delay(500)
            await loadPublishedNfts(0, 10)
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
