<!--
  @deprecated This page is being phased out in favor of MetadataRegistryPage.vue.
  The NFT category management is now unified under the MetadataRegistryPage tabs.
  This file is kept for component reuse and backward compatibility.
-->
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
                    <q-btn flat dense icon="arrow_back" label="Back to Registry" color="grey-4"
                        @click="router.push({ path: '/token/metadata-registry', query: { authbase } })" />
                </div>
                <q-card flat class="bg-dark q-pa-lg">
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

                        <div v-if="identitySnapshot.description" class="col-12 q-mt-sm">
                            <label class="q-mb-xs">Description</label>
                            <div class="text-body2 text-grey-3">
                                {{ identitySnapshot.description }}
                            </div>
                        </div>
                        <div v-if="identitySnapshot.uris?.web" class="col-12 q-mt-sm">
                            <label class="q-mb-xs">Website</label>

                            <div class="flex items-center q-gutter-x-sm q-mt-xs">
                                <q-btn flat dense icon="language" color="primary" label="Website"
                                    :href="identitySnapshot.uris.web" target="_blank" />
                            </div>
                        </div>
                    </div>
                </q-card>
                <template v-if="nftCategory">
                    <q-card class="bg-dark q-pa-lg q-mt-md" flat>
                        <div class="flex items-center q-gutter-x-sm q-mb-md">
                            <q-icon name="token" size="24px" color="primary" />
                            <span class="text-h6 text-weight-medium">NFTs</span>
                        </div>

                        <FormField>
                            <label class="q-mb-xs">Description</label>
                            <q-input v-model="nftCategory.description" class="full-width" outlined />
                        </FormField>
                        <FormField>
                            <label class="q-mb-xs">Collection Type
                                <q-btn dense flat round size="xs" icon="help_outline" color="grey-5" class="q-ml-xs"
                                    @click="showCollectionHelp" />
                            </label>
                            <div v-if="collectionType === 'sequential'" class="flex items-center q-gutter-x-md">
                                <q-chip color="grey-8" text-color="grey-3" icon="pin" label="Sequential" dense />
                                <q-btn flat dense color="primary" icon="auto_awesome" label="Make NFT Parsable"
                                    @click="collectionType = 'parsable'" size="sm" />
                            </div>
                            <div v-else class="flex items-center q-gutter-x-md">
                                <q-chip color="green-9" text-color="green-3" icon="code" label="Parsable" dense />
                                <q-btn flat dense color="warning" icon="undo" label="Revert to Sequential" size="sm"
                                    @click="collectionType = 'sequential'" />
                            </div>
                        </FormField>
                        <FormField>
                            <template v-if="collectionType === 'parsable'">
                                <ParsableNftCollection
                                    v-model:parsable-nft-collection="(nftCategory.parse as ParsableNftCollectionI)"
                                    v-model:fields="nftCategory.fields">
                                    <template #nftTypes>
                                        <label class="form-label">Items</label>
                                        <q-table :rows="nftTypeRows" :columns="nftTypeColumns" row-key="hexKey" flat
                                            :loading="nftTypesLoading" v-model:pagination="nftTypesPagination"
                                            @request="onNftTypesRequest" class="q-mt-md">
                                            <template v-slot:body-cell-key="props">
                                                <q-td :props="props" class="text-mono">{{ props.row.hexKey }}</q-td>
                                            </template>
                                            <template v-slot:body-cell-name="props">
                                                <q-td :props="props">{{ props.row.name }}</q-td>
                                            </template>
                                            <template v-slot:no-data>
                                                <div class="text-grey-5 text-center q-pa-md">No NFT Types</div>
                                            </template>
                                        </q-table>
                                    </template>
                                </ParsableNftCollection>
                            </template>
                            <template v-else>
                                <SequentialNftCollection
                                    v-model:sequential-nft-collection="(nftCategory.parse as SequentialNftCollectionI)">
                                    <template #nftTypes>
                                        <label class="q-mb-lg">Items</label>
                                        <q-table :rows="nftTypeRows" :columns="nftTypeColumns" row-key="hexKey" flat
                                            :loading="nftTypesLoading" v-model:pagination="nftTypesPagination"
                                            @request="onNftTypesRequest">
                                            <template v-slot:body-cell-key="props">
                                                <q-td :props="props" class="text-mono">{{ props.row.hexKey }}</q-td>
                                            </template>
                                            <template v-slot:body-cell-name="props">
                                                <q-td :props="props">{{ props.row.name }}</q-td>
                                            </template>
                                            <template v-slot:no-data>
                                                <div class="text-grey-5 text-center q-pa-md">No NFT Types</div>
                                            </template>
                                        </q-table>
                                    </template>
                                </SequentialNftCollection>
                            </template>
                        </FormField>
                        <div class="flex justify-end q-gutter-md q-mt-lg">
                            <q-btn icon="mdi-undo" color="warning" :disable="!modified" @click="reset">
                                {{ t('button.reset') }}
                            </q-btn>
                            <q-btn icon="cloud_upload" color="primary" :disable="!modified" @click="save">
                                {{ t('button.save') }}
                            </q-btn>
                        </div>
                    </q-card>

                </template>
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
import { db, IdentitySnapshotRecord, setRecordStatus } from 'src/core/client-db'
import { getRegistryWorker } from 'src/workers'
import { getErrorMessage } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import FormField from 'components/FormField.vue'
import ParsableNftCollection from 'components/bcmr/ParsableNftCollection.vue'
import SequentialNftCollection from 'components/bcmr/SequentialNftCollection.vue'
import HelpDialog from 'components/dialogs/HelpDialog.vue'

const DEFAULT_NFT_CATEGORY: NftCategoryI = {
    parse: { types: {} } as SequentialNftCollectionI,
};

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const loading = ref(true)
const modified = ref(false)
const identitySnapshotRecord = ref<IdentitySnapshotRecord>()
const initialSnapshotJson = ref('')

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
        const result = await getRegistryWorker().getNfts({
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
        await db.identitySnapshot
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

onMounted(async () => {
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
