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
                                                <div class="q-my-xs q-gutter-x-sm">
                                                    <span class="text-h6">NFT Collection Info</span>
                                                </div>
                                                <div class="flex q-gutter-x-sm">

                                                    <q-btn flat no-caps icon="mdi-table-filter" label="Filter"
                                                        v-close-popup dense>
                                                        <q-menu anchor="bottom left" self="top end"
                                                            icon="mdi-table-filter">
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
                                                    <q-btn icon="mdi-table-plus" color="secondary" label="Add"
                                                        @click="onAddNftClick" flat no-caps dense>
                                                    </q-btn>
                                                </div>
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
        <q-page-sticky v-if="modified" position="bottom" class="q-pa-md items-center" expand>
            <div class="row justify-end q-gutter-md items-center bg-dark q-pa-md rounded-borders"
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
import { BaseWallet, delay, NetworkType } from 'mainnet-js-v3'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import NftTable from 'src/components/bcmr/NftTable.vue'
import { publishRegistry } from 'src/core/transaction'
import { UtxoWithAuthKey } from 'src/core/types'
import { UtxoWithPath } from 'src/core/wallet'
import { broadcastTransaction } from 'src/services/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { getNftCollectionType } from 'src/core/bcmr'

const ROWS_PER_PAGE = 2

const { wallet, manager } = inject('wizardConnectWallet') as any
const $q = useQuasar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authguardStore = useAuthguardStore()
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const { activeAuthhead } = storeToRefs(authguardStore)
const registryStore = useRegistryStore()

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
const nftsStatusFilter = ref<RegistryRecordStatus | undefined | ''>()
const nftsPagination = ref({ sortBy: 'type', descending: true, page: 1, rowsPerPage: ROWS_PER_PAGE, rowsNumber: 0 })
/**
 * 
 * The commitment or bottomAltStackHex
 * If collection type is 'sequential' this would be the last sequence when 'types' is sorted as numbers sequentially.
 * If collection type is 'parsable' this would be the last type when when 'types' is sorted using localeCompare.
 */
const nftsLastNftTypeKey = ref<string>('')

const onAddNftClick = async () => {
    console.log('@onAddClick authhead', activeAuthhead.value)
    const lastKnownType = await getRegistryWorker().getNftsLastType({
        contentHash: activeAuthhead.value?.identitySnapshotIdentifier!.contentHash as string,
        authbase: activeAuthhead.value?.identitySnapshotIdentifier!.identity.authbase as string,
        timestamp: activeAuthhead.value?.identitySnapshotIdentifier!.identity.timestamp as string,
        publishedOnly: false
    })

    console.log('@onAddClick', lastKnownType)
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
    const { page, rowsPerPage } = props
    let offset = ((page - 1) * rowsPerPage) - 1
    if (offset < 0) {
        offset = 0
    }
    const limit = offset + rowsPerPage
    await loadNfts(offset, limit)
}

const loadNfts = async (offset: number, limit: number, statusFilter?: RegistryRecordStatus) => {
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
            status: statusFilter || nftsStatusFilter.value
        })
        console.log('RESULT', result)
        if (result) {
            nfts.value = result.items
            nftsTotal.value = result.total
            nftsLastNftTypeKey.value = result.lastNftTypeKey
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

watch(() => identitySnapshotRecord.value as IdentitySnapshotRecord, async (newRecord: IdentitySnapshotRecord) => {
    if (Object.keys(newRecord || {}).length > 0 && !identitySnapshot.value) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord.identitySnapshot))
        const isParsable = !!((identitySnapshot.value?.token?.nfts?.parse?.types?.parse as ParsableNftCollectionI | undefined)?.bytecode)
        collectionType.value = isParsable ? 'parsable' : 'sequential'
        initialSnapshotJson.value = JSON.stringify(identitySnapshot.value)
        loading.value = false
        await loadNfts(0, ROWS_PER_PAGE)
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


const onSaveClick = async () => {
    if (!identitySnapshotRecord.value || !identitySnapshot.value) return
    try {
        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))
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

    const loadingGroup = $q.loading.show({
        group: 'mpop-lg',
        message: t('info.uploadingRegistryToIpfs')
    })

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

        loadingGroup({
            message: t('transaction.waitingForSignature')
        })

        await wallet.value.sync()

        triggerRef(wallet)

        const publishRegistryRequest = publishRegistry({
            authhead: activeAuthhead.value as UtxoWithAuthKey,
            funderUtxos: wallet.value.utxos as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK,
            registryPublicationData: {
                contentHash: bumpArtifact.contentHash,
                uris: bumpArtifact.uris
            }
        })

        loadingGroup({ message: 'Waiting for approval, please check your wallet...' })

        const response = await manager.value!.signTransaction(publishRegistryRequest);

        loadingGroup({ message: 'Broadcasting, please wait...' })

        const [broadcastError, txid] = await broadcastTransaction({
            transactionHex: response.signedTransaction,
            network: import.meta.env.VITE_BCH_NETWORK,
            onProgress: (progress: string) => {
                loadingGroup({ message: progress })
            }
        })

        if (broadcastError) throw broadcastError

        await getRegistryWorker().commitBumpRegistry(contentHash, `${txid}:0`)

        loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
        })

        initialSnapshotJson.value = JSON.stringify(clonedSnapshot)

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet

        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: txid
        })

        loadAuthkeys(wallet.value, true).then(() => {
            triggerRef(wallet)
        })

        await updateActiveAuthhead()

        await db.saveActivity({
            event: `Published NFT metadata of ${activeAuthhead.value?.identitySnapshot?.token?.category || activeAuthhead.value!.token?.category}`,
            txid,
            status: 'success'
        })

        loadingGroup()

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
            })
        })
    } catch (error: any) {
        $q.notify({ type: 'Error', message: error.message })
    } finally {
        loadingGroup()
    }
}

const onResetClick = () => {
    if (!initialSnapshotJson.value) return
    identitySnapshot.value = JSON.parse(initialSnapshotJson.value)
}

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
