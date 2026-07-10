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
                            <div class="col-12 flex justify-between items-center q-mt-sm">
                                <h6 class="q-my-xs">
                                    Links<q-icon name="link" class="q-ml-sm">
                                    </q-icon>
                                </h6>
                                <q-btn icon="add" label="Add Link" color="secondary" @click="openAddUriDialog" flat
                                    no-caps dense></q-btn>
                            </div>

                            <div class="col-12">
                                <FormField v-if="Object.keys(identitySnapshot.uris?.['icon'] || {})" key="icon-uri">
                                    <label class="text-capitalize">Icon</label>
                                    <q-input v-model="identitySnapshot.uris!['icon']" outlined>
                                        <template v-slot:prepend>
                                            <q-avatar>
                                                <img v-if="identitySnapshot.uris!['icon']"
                                                    :src="ipfsToGatewayUrl(identitySnapshot.uris!['icon']) as string" />
                                            </q-avatar>
                                        </template>
                                        <template v-slot:append>
                                            <q-spinner-box v-if="iconUploading" color="warning"></q-spinner-box>
                                            <q-btn v-else icon="mdi-cloud-upload" @click="uploadIcon()"
                                                color="secondary" flat>
                                            </q-btn>
                                        </template>
                                    </q-input>
                                </FormField>
                                <FormField
                                    v-for="uriName in Object.keys(identitySnapshot.uris || {}).filter((uriName) => !['icon'].includes(uriName))"
                                    :key="uriName">
                                    <label class="text-capitalize">{{ uriName }}</label>
                                    <q-input v-model="identitySnapshot.uris![uriName]" outlined>

                                    </q-input>
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
                <!-- <q-btn color="primary" unelevated label="Save" @click="onSaveClick" /> -->
                <q-btn color="primary" unelevated label="Publish" @click="onPublishClick" />
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
import { uploadFile } from 'src/core/ipfs'

import { liveQuery } from 'dexie'
import { useObservable } from '@vueuse/rxjs'
import { createIdentitySnapshotTemplate } from 'src/core/bcmr'
import AddUriDialog from 'src/components/dialogs/AddUriDialog.vue'
import RegistryVersionOptionsDialog from 'src/components/bcmr/RegistryVersionOptionsDialog.vue'

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

const identitySnapshot = ref<IdentitySnapshot>(createIdentitySnapshotTemplate((route.query.authbase || '') as string))
const unpublishedNfts = ref<NftRecord[]>([])
const publishedNfts = ref<{ type: string, nft: NftType }[]>([])
const publishedTotal = ref(0)
const publishedLoading = ref(false)
const publishing = ref(false)
const refreshing = ref(false)
const initialSnapshotJson = ref('')
const iconUploading = ref(false)

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
    { initialValue: {} } // Added to prevent runtime template rendering crashes
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

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

const createSquareThumbnail = async (file: File, maxSize: number): Promise<Blob> => {
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)

    const size = Math.min(img.width, img.height)
    const offsetX = (img.width - size) / 2
    const offsetY = (img.height - size) / 2
    const targetSize = Math.min(maxSize, size)

    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize)

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9)
    })
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
        identitySnapshot.value.uris = {
            ...identitySnapshot.value.uris,
            ...uri
        }
    })
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

const onPublishClick = async () => {

    publishing.value = true

    const loadingGroup = $q.loading.show({
        group: 'mpop-lg',
        message: t('info.uploadingRegistryToIpfs')
    })

    try {

        const { contentHash, identity } = activeAuthhead.value!.identitySnapshotIdentifier!

        const clonedSnapshot = JSON.parse(JSON.stringify(identitySnapshot.value))

        await db.registryIdentitySnapshot
            .where('[contentHash+authbase+timestamp]')
            .equals([contentHash, identity.authbase, identity.timestamp] as [string, string, string])
            .modify({ identitySnapshot: clonedSnapshot, status: 'modified' })
        initialSnapshotJson.value = JSON.stringify(clonedSnapshot)

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
            event: `Published NFT metadata of ${activeAuthhead.value?.identitySnapshot?.token?.category || activeAuthhead.value!.token?.category}`,
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

const uploadIcon = () => {
    try {
        iconUploading.value = true
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            try {
                const isImage = file.type.startsWith('image/')
                const isGif = file.type === 'image/gif'

                let icon: File | Blob = file
                if (isImage && !isGif) {
                    icon = await createSquareThumbnail(file, 400)
                }
                const result = await uploadFile(icon, `thumb_${file.name}`)
                const { cid } = result
                if (cid) {
                    identitySnapshot.value.uris!.icon = `ipfs://${cid}`
                }
                $q.notify({ type: 'positive', message: 'Media uploaded successfully' })
            } catch (e: any) {
                $q.notify({ type: 'negative', message: e.message || 'Upload failed' })
            }
        }
        input.click()
    } catch (error) {
        $q.notify({
            type: 'error',
            message: 'Error uploading icon'
        })
    } finally {
        iconUploading.value = false
    }

}

const publishedPagination = ref({ sortBy: 'type', descending: false, page: 1, rowsPerPage: 10, rowsNumber: 0 })

const onPublishedRequest = async (props: any) => {
    const { page, rowsPerPage } = props.pagination
    await loadPublishedNfts((page - 1) * rowsPerPage, rowsPerPage)
}

watch(publishedTotal, (total) => {
    publishedPagination.value.rowsNumber = total
})

watch(() => identitySnapshotRecord.value as IdentitySnapshotRecord, (newRecord: IdentitySnapshotRecord, prevRecord) => {
    console.log('New Record', newRecord, prevRecord)
    if (Object.keys(newRecord || {}).length > 0) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord.identitySnapshot))
        initialSnapshotJson.value = JSON.stringify(newRecord.identitySnapshot)
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
    console.log(identitySnapshotRecord.value)

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
