<template>
    <q-page class="bg-dark-page q-pb-xl">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back" color="grey-4"
                        @click="router.push({ path: '/dashboard/#/created' })" />
                </div>
                <q-card v-if="identitySnapshot" flat class="bg-dark q-pa-lg rounded-borders">
                    <q-card-title class="flex items-center q-gutter-x-sm q-mb-lg justify-between text-grey-6">
                        <div class="q-gutter-x-sm flex items-center"><q-icon name="mdi-information-variant-box"
                                size="sm" /><span class="text-h6 text-weight-bold ">Token Identity
                                Info</span></div>
                        <q-btn icon="mdi-close" :label="$q.screen.gt.xs ? 'Close' : ''" dense flat>
                        </q-btn>
                    </q-card-title>
                    <div>
                        <div class="row items-center q-gutter-x-md q-mb-lg">
                            <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1">
                                <q-img v-if="identitySnapshot.uris?.icon"
                                    :src="ipfsToGatewayUrl(identitySnapshot.uris.icon)!" fit="cover" />
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
                            <q-btn flat dense round icon="refresh" size="lg" :loading="refreshing" @click="refresh" />
                        </div>
                        <div class="row">
                            <h6 class="q-my-xs">Identity</h6>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Name</label>
                                    <q-input v-model="identitySnapshot.name" outlined></q-input>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Description</label>
                                    <q-input v-model="identitySnapshot.description" outlined></q-input>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Links <q-icon name="link"></q-icon></label>
                                    <!-- <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.uris }}
                                    </div> -->
                                    <div class="flex q-gutter-x-sm">
                                        <q-btn v-for="key, i in Object.keys(identitySnapshot.uris || {})" :key="i"
                                            color="secondary" no-caps dense flat
                                            :href="ipfsToGatewayUrl(activeAuthhead!.identitySnapshot!.uris![key]!)!"
                                            target="__blank">
                                            <span class="text-capitalize">{{ key }}</span>
                                        </q-btn>
                                    </div>

                                </FormField>
                            </div>
                            <h6 class="q-my-xs">Token</h6>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Category</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.token!.category }}
                                        <CopyText :text="identitySnapshot.token!.category" />
                                    </div>
                                </FormField>
                            </div>
                            <template v-if="identitySnapshot.token">
                                <div class="col-12">
                                    <FormField>
                                        <label for="">Symbol</label>
                                        <q-input v-model="identitySnapshot.token.symbol" outlined></q-input>
                                    </FormField>
                                </div>
                                <div class="col-12">
                                    <FormField>
                                        <label for="">Decimals</label>

                                        <q-input v-model="identitySnapshot.token.decimals" outlined></q-input>
                                    </FormField>
                                </div>
                                <h6 class="q-my-xs">NFTs</h6>
                                <div class="col-12">
                                    <FormField>
                                        <label class="flex justify-between items-center">
                                            <span>NFT Items</span>
                                            <q-btn text-color="secondary" icon="preview"
                                                @click="router.push({ name: 'view-identity-snapshot-nfts', query: { contentHash: activeAuthhead?.identitySnapshotIdentifier?.contentHash, timestamp: activeAuthhead?.identitySnapshotIdentifier?.identity?.timestamp, authbase: activeAuthhead?.identitySnapshotIdentifier?.identity.authbase, registryIdentity: activeAuthhead?.identitySnapshotIdentifier?.registryIdentity } })"
                                                no-caps>
                                                View All Items
                                            </q-btn>
                                        </label>
                                        <q-scroll-area style="width: 100%; height: 8rem;" :visible="false">
                                            <div class="flex q-gutter-sm no-wrap q-pt-md">
                                                <q-card v-for="nft, i in publishedNfts" :key="`nft-${i}`" flat bordered
                                                    style="max-width: 8rem; width:6em; max-height: 5rem;">
                                                    <q-card-section class="row justify-center q-gutter-y-sm">
                                                        <div class="col-12 text-center">
                                                            <q-avatar size="md">
                                                                <q-img v-if="nft.nft.uris?.icon"
                                                                    :src="ipfsToGatewayUrl(nft.nft.uris.icon)!"
                                                                    fit="cover">
                                                                </q-img>
                                                                <q-img v-else
                                                                    :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${nft.type}`"
                                                                    fit="cover">
                                                                    <q-tooltip
                                                                        class="bg-grey-9 text-caption text-grey-4">No
                                                                        Icon —
                                                                        generated
                                                                        placeholder</q-tooltip>
                                                                </q-img>
                                                            </q-avatar>
                                                            <q-badge floating color="">{{ nft.type }}</q-badge>
                                                        </div>
                                                        <div
                                                            class="col-12 text-caption text-grey-4 text-center ellipsis">
                                                            {{ nft.nft.name }}
                                                        </div>
                                                    </q-card-section>
                                                </q-card>
                                            </div>
                                        </q-scroll-area>
                                    </FormField>
                                </div>
                            </template>
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
        <q-page-sticky v-if="modified" position="bottom" class="q-pa-md items-center" expand>
            <div class="row justify-end items-center bg-dark q-pa-md rounded-borders items-center"
                style="border: 1px solid #555; width: 100%;">
                <q-btn flat color="warning" icon="mdi-undo" label="Reset" @click="onResetClick" />
                <q-btn color="primary" unelevated label="Save" @click="onSaveClick" />
            </div>
        </q-page-sticky>
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
import { decodeCashAddress, stringify } from '@bitauth/libauth'
import { broadcast } from 'src/core/transaction/broadcast'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue'
import { BaseWallet, delay, NetworkType } from 'mainnet-js-v3'
import { useAppStore } from 'src/stores/app'
import FormField from 'src/components/FormField.vue'
import { ParsableNftCollection, NftType, IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { db, IdentitySnapshotRecord, NftRecord } from 'src/core/client-db'
import { getErrorMessage } from 'src/core/utils'
import { getRegistryWorker } from 'src/workers'

import { liveQuery } from 'dexie'
import { useObservable } from '@vueuse/rxjs'

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

const identitySnapshot = ref<IdentitySnapshot>()
const unpublishedNfts = ref<NftRecord[]>([])
const publishedNfts = ref<{ type: string, nft: NftType }[]>([])
const publishedTotal = ref(0)
const publishedLoading = ref(false)
const publishing = ref(false)
const refreshing = ref(false)

const initialSnapshotJson = ref('')

const modified = computed(() => {
    if (!initialSnapshotJson.value || !identitySnapshot.value) return false
    return JSON.stringify(identitySnapshot.value) !== initialSnapshotJson.value
})

const identitySnapshotRecord = useObservable(
    liveQuery(async () => {
        return await db.registryIdentitySnapshot.where({
            category: route.query.authbase
        }).first()
    }) as any,
    { initialValue: activeAuthhead.value?.identitySnapshot } // Added to prevent runtime template rendering crashes
)

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

const loadPublishedNfts = async (offset: number, limit: number) => {
    if (!activeAuthhead.value?.identitySnapshotIdentifier) return
    publishedLoading.value = true
    try {
        const worker = getRegistryWorker()
        const result = await worker.getNftTypes({
            contentHash: activeAuthhead.value.identitySnapshotIdentifier.contentHash,
            authbase: activeAuthhead.value.identitySnapshotIdentifier.identity.authbase,
            timestamp: activeAuthhead.value.identitySnapshotIdentifier.identity.timestamp,
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
        refreshing.value = true
        await registryStore.loadRegistry(route.query.authbase as string, true)
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

    if (!activeAuthhead.value?.identitySnapshotIdentifier || unpublishedNfts.value.length === 0) return

    publishing.value = true

    const loadingGroup = $q.loading.show({
        group: 'mpop-lg',
        message: t('info.uploadingRegistryToIpfs')
    })

    try {

        const { contentHash, identity } = activeAuthhead.value.identitySnapshotIdentifier

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
            event: `Published NFT metadata of ${activeAuthhead.value?.identitySnapshot?.token?.category || activeAuthhead.value.token?.category}`,
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
    { name: 'type', label: 'Items', field: 'type', align: 'left', sortable: true },
]

const publishedPagination = ref({ sortBy: 'type', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })

const onPublishedRequest = async (props: any) => {
    const { page, rowsPerPage } = props.pagination
    await loadPublishedNfts((page - 1) * rowsPerPage, rowsPerPage)
}

watch(publishedTotal, (total) => {
    publishedPagination.value.rowsNumber = total
})

watch(() => identitySnapshotRecord.value, (newRecord) => {
    if (newRecord && !identitySnapshot.value) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord))
        initialSnapshotJson.value = JSON.stringify(newRecord)
    }
}, { immediate: true })

const onSaveClick = async () => {
    if (!identitySnapshotRecord.value || !identitySnapshot.value) return
    try {
        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))
        const id = activeAuthhead.value?.identitySnapshotIdentifier
        if (!id) return
        await db.registryIdentitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([id.contentHash, id.identity.authbase, id.identity.timestamp] as [string, string, string])
            .modify({ identitySnapshot: clonedSnapshot, status: 'modified' })
        initialSnapshotJson.value = JSON.stringify(clonedSnapshot)
        $q.notify({ type: 'positive', message: t('success.savedDescription') })
    } catch (error) {
        $q.notify({ type: 'error', message: getErrorMessage(error) })
    }
}

const onResetClick = () => {
    if (!initialSnapshotJson.value) return
    identitySnapshot.value = JSON.parse(initialSnapshotJson.value)
}

const viewRegistry = () => {
    router.push({ path: '/token/metadata-registry', query: { authbase: activeAuthhead.value?.token?.category } })
}

const openMintPage = () => {
    appStore.setActiveMinter(activeAuthhead.value)
    router.push('/issuer/nft-collections/' + activeAuthhead.value!.token?.category + '/mint')
}

const onNftRowClick = (_evt: Event, row: { type: string, nft: NftType }) => {
    const id = activeAuthhead.value?.identitySnapshotIdentifier
    const bytecode = (activeAuthhead.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection | undefined)?.bytecode
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
}

const openMintChildNftDialog = (action: 'issuance' | 'burn') => {
    const v = activeAuthhead.value
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


const onEditIdentitySnapshotClick = () => {
    router.push({
        name: 'edit-identity-snapshot', query: route.query
    })
}

onMounted(async () => {

    if (!activeAuthhead.value) {
        router.back()
        return
    }

    if (activeAuthhead.value?.identitySnapshot) {
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
