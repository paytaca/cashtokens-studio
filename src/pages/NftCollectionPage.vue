<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="router.back()" />
                </div>
                <q-card v-if="authhead" flat class="bg-dark q-pa-lg rounded-borders">
                    <q-card-title class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm q-mb-lg">
                        <span>NFT Collection</span>
                        <q-icon name="mdi-image-multiple" size="lg" />
                    </q-card-title>
                    <div>
                        <div class="row items-center q-gutter-x-md q-mb-lg">
                            <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1">
                                <q-img v-if="authhead.identitySnapshot?.uris?.icon"
                                    :src="ipfsToGatewayUrl(authhead.identitySnapshot?.uris.icon)!" fit="cover" />
                                <q-icon v-else name="token" color="primary" size="32px" />
                            </q-avatar>
                            <div>
                                <div class="flex items-center q-gutter-x-xs q-mt-xs token-symbol">
                                    {{ authhead.identitySnapshot?.token?.symbol || "Unknown" }}
                                </div>
                                <div class="text-caption">
                                    {{ authhead.identitySnapshot?.name || 'Unnamed Collection' }}
                                </div>

                            </div>
                            <q-space />
                            <q-btn flat dense round icon="refresh" size="lg" :loading="refreshing" @click="refresh" />
                        </div>
                        <div class="row"><q-btn class="text-caption link-style" text-color="secondary"
                                icon="description" @click="viewRegistry" no-caps dense>
                                View Metadata Registry
                            </q-btn></div>
                        <div class="row">
                            <div class="col-12">
                                <FormField>
                                    <label for="">Category</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ authhead.token!.category }}
                                        <CopyText :text="authhead.token!.category" />
                                    </div>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label>NFT Collection Type</label>
                                    <div class="q-field__inner bg-dark rounded-borders flex justify-between"
                                        style="min-height: 3em; display: flex; align-items: center;">
                                        <q-chip
                                            v-if="!(authhead.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection)?.bytecode"
                                            dark outline icon="mdi-counter" label="Sequential NFT Collection" />
                                        <q-chip v-else dark outline icon="mdi-hexadecimal"
                                            label="Parsable NFT Collection" />
                                        <q-space />
                                        <q-btn v-if="authhead.token?.nft?.capability === 'minting'" dense no-wrap
                                            icon="mdi-pickaxe" text-color="primary" size="md" @click="openMintPage">
                                            <span class="gt-xs q-ml-xs">Mint</span>
                                        </q-btn>
                                    </div>
                                </FormField>
                            </div>


                            <div v-if="authhead.identitySnapshot?.description" class="col-12">
                                <div class="text-caption text-grey-5 text-uppercase q-mb-xs"
                                    style="letter-spacing: 1px;">
                                    Description
                                </div>
                                <div class="text-body2 text-grey-3">
                                    {{ authhead.identitySnapshot.description }}
                                </div>
                            </div>

                            <div v-if="authhead.identitySnapshot?.uris?.web" class="col-12">
                                <div class="text-caption text-grey-5 text-uppercase q-mb-xs"
                                    style="letter-spacing: 1px;">
                                    Website:
                                </div>
                                <div class="flex items-center q-gutter-x-sm q-mt-xs">
                                    <q-btn v-if="authhead.identitySnapshot.uris.web" flat dense icon="language"
                                        color="primary" label="Website" :href="authhead.identitySnapshot.uris.web"
                                        target="_blank" />
                                </div>
                            </div>
                        </div>

                    </div>
                </q-card>

                <q-card v-if="authhead && unpublishedNfts.length > 0" flat class="bg-dark q-mt-lg">
                    <div class="q-pa-lg">
                        <div class="row items-center justify-between q-mb-xs">
                            <div class="table-header text-h6 text-weight-medium flex items-center">
                                <q-icon name="priority_hight" color="warning" />
                                <span>{{ t('label.registry.unpublishedNfts') }}</span>
                            </div>
                            <q-btn text-color="primary" icon="mdi-publish" :label="t('button.publish')" unelevated
                                :loading="publishing" @click="publishNfts" />
                        </div>
                        <div class="text-caption text-grey-6 q-mb-md">{{ t('label.registry.unpublishedCaption') }}</div>
                        <q-table :rows="unpublishedNfts" :columns="unpublishedColumns" row-key="type" flat bordered dark
                            :rows-per-page-options="[0]" class="bg-dark border-radius-12" @row-click="onNftRowClick">
                            <template v-slot:body-cell-type="props">
                                <q-td :props="props" class="text-mono">
                                    <div class="flex items-center no-wrap q-gutter-x-md">
                                        <div class="flex column items-center">
                                            <q-avatar size="md">
                                                <q-img v-if="props.row.nft?.uris?.icon"
                                                    :src="ipfsToGatewayUrl(props.row.nft?.uris?.icon)!" fit="cover">
                                                </q-img>
                                                <q-img v-else
                                                    :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.type}`"
                                                    fit="cover">
                                                    <q-tooltip class="bg-grey-9 text-caption text-grey-4">No Icon —
                                                        generated
                                                        placeholder</q-tooltip>
                                                </q-img>
                                            </q-avatar>
                                            <span v-if="!props.row.nft?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
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
                                                    <q-item-section>{{ t('button.edit') }}</q-item-section>
                                                </q-item>
                                                <q-item clickable @click="deleteNft(props.row)">
                                                    <q-item-section avatar>
                                                        <q-icon name="delete" size="xs" color="negative" />
                                                    </q-item-section>
                                                    <q-item-section class="text-negative">{{
                                                        t('button.delete') }}</q-item-section>
                                                </q-item>
                                            </q-list>
                                        </q-menu>
                                    </q-btn>
                                </q-td>
                            </template>
                            <template v-slot:no-data>
                                <div class="text-grey-5 text-center q-pa-md">No NFTs</div>
                            </template>
                        </q-table>
                    </div>
                </q-card>

                <q-card v-if="authhead" flat class="bg-dark q-mt-lg">
                    <div class="q-pa-lg">
                        <div class="table-header text-h6 text-weight-medium q-mb-xs">{{
                            t('label.registry.published') }}
                            <q-btn flat dense round icon="refresh" size="md" :loading="publishedLoading"
                                @click="refresh" class="q-mr-xs" />
                        </div>
                        <div class="text-caption text-grey-6 q-mb-md">{{ t('label.registry.publishedCaption') }}</div>
                        <q-table :rows="publishedNfts" :columns="publishedColumns" row-key="type" flat dark
                            :loading="publishedLoading" v-model:pagination="publishedPagination"
                            @request="onPublishedRequest" @row-click="onNftRowClick" class="bg-dark border-radius-12">
                            <template v-slot:body-cell-type="props">
                                <q-td :props="props" class="text-mono">
                                    <div class="flex items-center no-wrap q-gutter-x-md">
                                        <div class="flex column items-center">
                                            <q-avatar size="md">
                                                <q-img v-if="props.row.nft?.uris?.icon"
                                                    :src="ipfsToGatewayUrl(props.row.nft?.uris?.icon)!" fit="cover">
                                                </q-img>
                                                <q-img v-else
                                                    :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.type}`"
                                                    fit="cover">
                                                    <q-tooltip class="bg-grey-9 text-caption text-grey-4">No Icon —
                                                        generated
                                                        placeholder</q-tooltip>
                                                </q-img>
                                            </q-avatar>
                                            <span v-if="!props.row.nft?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
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
                    </div>
                </q-card>
                <div v-else class="flex flex-center q-py-xl">
                    <q-spinner color="primary" size="48px" />
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, triggerRef, watch } from 'vue'
import { QTableColumn, useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import { UtxoWithAuthKey, UtxoWithPath } from 'src/core/types'
import { transferFungibleReserves, jsonFormSafeUtxoReviver, jsonReplacer, publishRegistry, isBroadcastSuccess } from 'src/core/transaction'
import { Network } from 'cashscript'
import { decodeCashAddress } from '@bitauth/libauth'
import { broadcast } from 'src/core/transaction/broadcast'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue'
import { BaseWallet, delay, NetworkType } from 'mainnet-js-v3'
import { useAppStore } from 'src/stores/app'
import FormField from 'src/components/FormField.vue'
import { ParsableNftCollection, NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { db, NftRecord } from 'src/core/client-db'
import { getRegistryWorker } from 'src/workers'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const appStore = useAppStore()
const authguardStore = useAuthguardStore()
const registryStore = useRegistryStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const {
    manager,
    wallet,
} = useWizardConnectWallet()

const authhead = computed(() => activeAuthhead.value)

const unpublishedNfts = ref<NftRecord[]>([])
const publishedNfts = ref<{ type: string, nft: NftType }[]>([])
const publishedTotal = ref(0)
const publishedLoading = ref(false)
const publishing = ref(false)
const refreshing = ref(false)

const loadUnpublishedNfts = async () => {
    try {
        if (!authhead.value?.identitySnapshotIdentifier) return
        unpublishedNfts.value = await db.nfts
            .where('[contentHash+authbase+timestamp]')
            .equals([
                authhead.value.identitySnapshotIdentifier.contentHash,
                authhead.value.identitySnapshotIdentifier.identity.authbase,
                authhead.value.identitySnapshotIdentifier.identity.timestamp,
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

const loadPublishedNfts = async (offset: number, limit: number) => {
    if (!authhead.value?.identitySnapshotIdentifier) return
    publishedLoading.value = true
    try {
        const worker = getRegistryWorker()
        const result = await worker.getNftTypes({
            contentHash: authhead.value.identitySnapshotIdentifier.contentHash,
            authbase: authhead.value.identitySnapshotIdentifier.identity.authbase,
            timestamp: authhead.value.identitySnapshotIdentifier.identity.timestamp,
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

const refresh = async () => {
    try {
        console.log('authhead', authhead.value)
        if (!authhead.value?.identitySnapshotIdentifier) return
        refreshing.value = true
        const { identity } = authhead.value.identitySnapshotIdentifier
        console.log('identity', identity)
        await registryStore.loadRegistry(identity.authbase, true)
        await Promise.allSettled([
            loadUnpublishedNfts(),
            loadPublishedNfts(0, 10)
        ])
    } catch (error) {
        console.log(error)
        $q.notify({
            type: 'warning',
            message: 'Failed to refresh collection data. Please check your connection or try again later.',
            color: 'warning'
        })
    } finally {
        refreshing.value = false
    }

}

const unpublishedColumns: QTableColumn[] = [
    { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
    { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: false },
    { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
    { name: 'actions', label: '', field: 'actions', align: 'center' },
]

const editNft = (nft: NftRecord) => {
    console.log('edit', nft)
}

const deleteNft = (nft: NftRecord) => {
    $q.dialog({
        title: 'Delete NFT',
        message: `Are you sure you want to delete "${nft.nft.name || nft.type}"?`,
        cancel: { label: 'Cancel', flat: true, color: 'grey-6' },
        persistent: true,
        ok: { label: 'Delete', color: 'negative', unelevated: true }
    }).onOk(async () => {
        await db.nfts.where('[contentHash+authbase+timestamp+type]')
            .equals([nft.contentHash, nft.authbase, nft.timestamp, nft.type] as [string, string, string, string])
            .delete()
        await loadUnpublishedNfts()
    })
}

const publishNfts = async () => {

    if (!authhead.value?.identitySnapshotIdentifier || unpublishedNfts.value.length === 0) return

    publishing.value = true

    const loadingGroup = $q.loading.show({
        group: 'mpop-lg',
        message: t('info.uploadingRegistryToIpfs')
    })

    try {

        const { contentHash, identity } = authhead.value.identitySnapshotIdentifier

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

        const broadcastResponse = await broadcast(response.signedTransaction)

        if (!broadcastResponse.ok) throw new Error('Error broadcasting transaction')

        const broadcastResult = await broadcastResponse.json()

        if (!isBroadcastSuccess(broadcastResult)) throw new Error(broadcastResult.error)

        await getRegistryWorker().commitBumpRegistry(contentHash, `${broadcastResult.txid}:0`)

        loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
        })

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
        })

        loadAuthkeys(wallet.value, true).then(() => {
            triggerRef(wallet)
        })

        await updateActiveAuthhead()

        await db.saveActivity({
            event: `Published NFT metadata of ${authhead.value?.identitySnapshot?.token?.category || authhead.value.token?.category}`,
            txid: broadcastResult.txid,
            status: 'success'
        })

        loadingGroup()

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('success.registryPublication'),
                txid: broadcastResult.txid
            }
        }).onOk(async () => {
            registryStore.loadRegistry(identity.authbase, true).then(async () => {
                await onPublishedRequest({ pagination: { page: 1, rowsPerPage: 5 } })
            })
        })
    } catch (error: any) {
        $q.notify({ type: 'Error', message: error.message })
    } finally {
        publishing.value = false
        loadingGroup()
    }
}

const publishedColumns: QTableColumn[] = [
    { name: 'type', label: 'NFT', field: 'type', align: 'left', sortable: true },
]

const publishedPagination = ref({ sortBy: 'type', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })

const onPublishedRequest = async (props: any) => {
    const { page, rowsPerPage } = props.pagination
    await loadPublishedNfts((page - 1) * rowsPerPage, rowsPerPage)
}

watch(publishedTotal, (total) => {
    publishedPagination.value.rowsNumber = total
})

const viewRegistry = () => {
    router.push({ path: '/token/metadata-registry', query: { authbase: authhead.value?.token?.category } })
}

const openMintPage = () => {
    appStore.setActiveMinter(authhead.value)
    router.push('/issuer/nft-collections/' + authhead.value!.token?.category + '/mint')
}

const onNftRowClick = (_evt: Event, row: { type: string, nft: NftType }) => {
    const id = authhead.value?.identitySnapshotIdentifier
    const bytecode = (authhead.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection | undefined)?.bytecode
    registryStore.setActiveNft({
        contentHash: id!.contentHash,
        authbase: id!.identity.authbase,
        timestamp: id!.identity.timestamp,
        category: authhead.value!.token!.category,
        bytecode,
        commitmentOrBottomAltStack: row.type,
        nftType: row.nft,
        allowEdit: true
    })
    router.push('/issuer/nft-collections/' + authhead.value!.token?.category + '/nft')
}

const openMintChildNftDialog = (action: 'issuance' | 'burn') => {
    const v = authhead.value
    if (!v) return

    if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient BCH balance'
        })
    }

    const identitySnapshot = v.identitySnapshot
    const componentProps: Record<string, any> = {
        transferType: action,
        tokenCategory: v.token!.category,
        balance: BigInt(v.token!.amount),
        decimals: identitySnapshot?.token?.decimals ?? 0,
        identitySnapshot,
    }

    if (action === 'issuance') {
        componentProps.selfAddress = wallet.value.getTokenDepositAddress(0)
    } else if (action === 'burn') {
        const sampleAddress = wallet.value.getTokenDepositAddress(0)
        const sampleDecodedAddress = decodeCashAddress(sampleAddress)
        if (typeof (sampleDecodedAddress) === 'string') {
            throw new Error(sampleDecodedAddress)
        }
        componentProps.burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`
    }

    $q.dialog({
        component: FungibleTransferDialog,
        componentProps,
        focus: 'none'
    }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {

        const loadingGroup = $q.loading.show({
            group: 'issue-fungible-reserves-loading-group',
            message: 'Preparing. Checking wallet for inputs...'
        })

        const issuerTokenUtxo = JSON.parse(
            JSON.stringify(v, jsonReplacer),
            jsonFormSafeUtxoReviver,
        )

        try {
            let recipientAddress = userInputs.recipient
            if (action === 'burn') {
                recipientAddress = componentProps.burnAddress
            }
            const signRequest = transferFungibleReserves({
                issuerTokenUtxo,
                authkeyUtxo: issuerTokenUtxo.authkey,
                recipientAddress: recipientAddress,
                transferTokenAmount: userInputs.tokenAmount,
                network: import.meta.env.VITE_BCH_NETWORK as Network,
                funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
                transferType: action
            })

            loadingGroup({
                message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
            })
            const response = await manager.value!.signTransaction(signRequest);

            loadingGroup({
                message: 'Broadcasting transaction, please wait...'
            })

            const broadcastResponse = await broadcast(response.signedTransaction)

            if (broadcastResponse.ok) {
                const broadcastResult = await broadcastResponse.json()
                if (broadcastResult.success) {
                    await delay(2000)
                    loadingGroup()
                    $q.dialog({
                        component: TransactionStatusDialog,
                        componentProps: {
                            statusType: 'success',
                            statusText: `Fungible token successfully ${action === 'issuance' ? 'issued' : 'burned'} from FT reserves`,
                            txid: broadcastResult.txid
                        }
                    })
                } else {
                    throw new Error(broadcastResult.error)
                }
            }
        } catch (error: any) {
            $q.notify({
                type: 'Error',
                message: error.message
            })
        } finally {
            loadingGroup()
        }
    })
}

onMounted(async () => {
    if (!authhead.value) {
        router.push('/issuer/nft-collections')
        return
    }

    if (authhead.value?.identitySnapshot) {
        publishedLoading.value = true
        await loadUnpublishedNfts()
        await delay(500)
        await loadPublishedNfts(0, 10)
    }
})

</script>

<style scoped lang="scss">
.border-radius-8 {
    border-radius: 8px;
}

.border-radius-12 {
    border-radius: 12px;
}

.word-break-all {
    word-break: break-all;
}

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}

.link-style {
    color: #7c4dff;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
        color: #9c7cff;
    }
}
</style>
