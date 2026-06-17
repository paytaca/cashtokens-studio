<template>
    <q-page class="bg-black text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 q-my-lg">
                <div class="row items-center justify-between q-mb-md q-px-sm">
                    <div class="text-h5 text-weight-bold text-primary flex items-center gap-sm">
                        <q-icon name="collections_bookmark" />
                        NFT Collections
                    </div>
                    <div class="text-caption text-grey-4 bg-grey-9 q-px-md q-py-xs border-radius-8 shadow-1">
                        Last synced: <span class="text-weight-medium text-white">{{ authkeysLastSync }}</span>
                    </div>
                </div>

                <q-table :rows="authheads" :columns="columns" :row-key="(row) => `${row.txid}:${row.vout}`"
                    :loading="authkeysLoading || authheadsLoading" flat bordered dark :visible-columns="visibleColumns"
                    @row-click="navigateToCollection" class="bg-dark border-radius-12 token-reserves-table">

                    <template v-slot:body-cell-token="props">
                        <q-td :props="props">
                            <!-- Desktop -->
                            <div v-if="$q.screen.gt.sm" class="flex items-center no-wrap q-gutter-x-md">
                                <q-avatar size="42px" class="bg-grey-9 border-radius-8 shadow-1">
                                    <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                                        :src="ipfsToGatewayUrl(props.row.identitySnapshot?.uris?.icon)!"
                                        fit="cover"></q-img>
                                    <q-icon v-else name="token" color="primary" size="24px"></q-icon>
                                </q-avatar>
                                <div>
                                    <div class="text-subtitle2 text-weight-bold text-white line-clamp-1 token-symbol">
                                        {{ props.row.identitySnapshot?.token?.symbol || 'Unknown Token' }}
                                    </div>
                                    <div class="flex items-center q-gutter-x-xs">
                                        <span class="text-caption text-grey-5 text-mono">
                                            ID: {{ shortenTokenId(props.row.token!.category) }}
                                            <CopyText :text="props.row.token!.category" />
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Mobile card -->
                            <div v-else class="row items-center no-wrap q-gutter-x-sm">
                                <q-avatar size="40px" class="bg-grey-9 border-radius-8 shadow-1">
                                    <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                                        :src="ipfsToGatewayUrl(props.row.identitySnapshot?.uris?.icon)!"
                                        fit="cover"></q-img>
                                    <q-icon v-else name="token" color="primary" size="24px"></q-icon>
                                </q-avatar>
                                <div class="col">
                                    <div class="text-subtitle2 text-weight-bold text-white token-symbol line-clamp-1">
                                        <q-skeleton v-if="authheadsLoading"></q-skeleton>
                                        <span v-else>
                                            {{ props.row.identitySnapshot?.token?.symbol || 'Unknwon Token' }}
                                        </span>
                                    </div>
                                    <div class="flex items-center q-gutter-x-xs q-mt-xs">
                                        <span class="text-caption text-grey-5 text-mono">
                                            {{ shortenTokenId(props.row.token!.category) }}
                                            <CopyText :text="props.row.token!.category" />
                                        </span>
                                    </div>
                                    <div class="flex items-center no-wrap q-gutter-x-xs q-mt-xs">
                                        <div class="q-gutter-x-xs">
                                            <q-badge v-if="props.row.token?.nft?.capability === 'minting'"
                                                color="purple-10" text-color="purple-2"
                                                class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                                Minting
                                            </q-badge>
                                            <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'"
                                                color="teal-10" text-color="teal-2"
                                                class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                                Mutable
                                            </q-badge>
                                            <q-badge v-else-if="props.row.token?.nft?.capability === 'none'"
                                                color="grey-9" text-color="grey-4"
                                                class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                                Immutable
                                            </q-badge>
                                        </div>
                                        <div class="q-gutter-x-xs">
                                            <q-skeleton v-if="authheadsLoading" type="QBadge"></q-skeleton>
                                            <template v-else>
                                                <q-badge v-if="props.row.identitySnapshot?.token?.nfts?.parse?.bytecode"
                                                    color="green-10" text-color="green-2"
                                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                                    Parsable
                                                </q-badge>
                                                <q-badge v-else color="yellow-10" text-color="yellow-2"
                                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                                    Sequential
                                                </q-badge>
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </q-td>
                    </template>

                    <template v-slot:body-cell-capability="props">
                        <q-td :props="props" class="text-center">
                            <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="purple-10"
                                text-color="purple-2"
                                class="text-uppercase text-caption q-px-sm q-py-xs border-radius-4 styled-capability-badge">
                                <q-icon name="auto_awesome" size="14px" class="q-mr-xs" />
                                Minting
                                <q-tooltip class="bg-purple-10 text-purple-2 text-weight-medium text-caption"
                                    maxWidth="240px">
                                    <strong>Factory Reserve:</strong> This authority key permits unlimited generation of
                                    child NFTs and supply assets inside this token category.
                                </q-tooltip>
                            </q-badge>

                            <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="teal-10"
                                text-color="teal-2"
                                class="text-uppercase text-caption q-px-sm q-py-xs border-radius-4 styled-capability-badge">
                                <q-icon name="published_with_changes" size="14px" class="q-mr-xs" />
                                Mutable
                                <q-tooltip class="bg-teal-10 text-teal-2 text-weight-medium text-caption"
                                    maxWidth="240px">
                                    <strong>Adaptable Token:</strong> Permits updating the internal state commitment
                                    payload or freezing it completely into an immutable asset.
                                </q-tooltip>
                            </q-badge>

                            <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="grey-9"
                                text-color="grey-4"
                                class="text-uppercase text-caption q-px-sm q-py-xs border-radius-4 styled-capability-badge border-grey-8">
                                <q-icon name="lock_outline" size="14px" class="q-mr-xs" />
                                Immutable
                                <q-tooltip class="bg-grey-9 text-grey-4 text-weight-medium text-caption"
                                    maxWidth="240px">
                                    <strong>Locked Asset:</strong> State properties and configurations are permanently
                                    sealed. No mutation paths remain active.
                                </q-tooltip>
                            </q-badge>
                            <span v-else class="text-grey-7 text-caption text-mono">—</span>
                        </q-td>
                    </template>
                    <template v-slot:body-cell-supply="props">
                        <q-td :props="props" class="text-right">
                            <template v-if="props.row.token?.nft?.capability === 'minting'">
                                <div class="text-subtitle1 text-weight-bold text-mono text-white">
                                    {{ Number(props.value).toLocaleString() }}
                                </div>
                                <div class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                                    <q-icon name="auto_awesome" size="12px" />
                                    <span>Minting supply remaining</span>
                                </div>
                            </template>
                            <template v-else>
                                <div class="text-grey-6 text-caption text-mono">—</div>
                            </template>
                        </q-td>
                    </template>

                    <template v-slot:body-cell-collection-type="props">
                        <q-td :props="props" class="text-right">
                            <q-badge v-if="props.row.identitySnapshot?.token?.nfts?.parse?.bytecode" color="green-10"
                                text-color="green-2"
                                class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                Parsable
                            </q-badge>
                            <q-badge v-else color="yellow-10" text-color="yellow-2"
                                class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                Sequential
                            </q-badge>
                        </q-td>
                    </template>
                    <template v-slot:body-cell-actions="value">
                        <q-td :props="value">
                            <div class="flex justify-end no-wrap q-gutter-x-sm">

                                <q-btn text-color="primary" icon="mdi-send-circle-outline" size="lg"
                                    @click.stop="navigateToMint(value.row)" round>
                                    <q-tooltip class="bg-primary text-weight-medium">Mint Child NFT</q-tooltip>
                                </q-btn>

                                <q-btn text-color="orange" icon="mdi-fire" size="lg"
                                    @click.stop="openMintChildNftDialog(value.row, 'burn')" round>
                                    <q-tooltip class="bg-orange-9 text-weight-medium">Burn</q-tooltip>
                                </q-btn>

                                <q-btn round flat icon="description" color="secondary" class="action-btn-hover"
                                    :disable="!!value.row.processing" :loading="loading"
                                    @click.stop="() => viewRegistry(value.row as UtxoWithAuthKey)" size="lg">
                                    <q-tooltip class="bg-secondary text-weight-medium">View Registry
                                        Metadata</q-tooltip>
                                </q-btn>

                                <!-- <q-btn round flat dense icon="refresh" color="grey-5" class="action-btn-hover"
                                    :disable="!!value.row.processing" :loading="loading"
                                    @click.stop="async () => await loadRegistry(value.row.token!.category as string)">
                                    <q-tooltip class="bg-grey-9 text-weight-medium">Refresh Cache</q-tooltip>
                                </q-btn> -->
                            </div>
                        </q-td>
                    </template>
                </q-table>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { QTableColumn, useQuasar } from 'quasar'
import type { UtxoFormSafe, UtxoWithPath, UtxoWithAuthKey } from 'src/core/types'
import { shortenTokenId } from 'src/core/utils'
import { transferFungibleReserves, jsonFormSafeUtxoReviver, jsonReplacer } from 'src/core/transaction'
import { Network } from 'cashscript'
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue'
import { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { broadcast } from 'src/core/transaction/broadcast'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { decodeCashAddress, stringify } from '@bitauth/libauth'
import { delay } from 'mainnet-js-v3'
import { useAuthguardStore } from 'src/stores/authguard'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { useRegistryStore } from 'src/stores/registry'
import CopyText from 'components/CopyText.vue'

const $q = useQuasar()
const router = useRouter()

const {
    manager,
    wallet,
    walletLasySync
} = useWizardConnectWallet()

const {
    loadRegistry
} = useRegistryStore()

const authguardStore = useAuthguardStore()
const {
    loadAuthkeys,
} = authguardStore

const {
    authheads,
    authkeysLastSync,
    authkeysLoading,
    authheadsLoading,
} = storeToRefs(authguardStore)


const loading = ref<boolean>()

// const columns: QTableColumn[] = [
//     {
//         name: 'icon',
//         label: 'Icon',
//         align: 'left',
//         field: (r) => {
//             return r.identitySnapshot?.uris?.icon
//         },
//     },
//     {
//         name: 'symbol',
//         label: 'Symbol',
//         align: 'left',
//         field: (r) => {
//             return r.identitySnapshot?.token?.symbol
//         },
//         sortable: true
//     },
//     {
//         name: 'decimals',
//         label: 'Decimals',
//         align: 'left',
//         field: (r) => {
//             return r.identitySnapshot?.token?.decimals ?? 0
//         },
//         sortable: true
//     },
//     {
//         name: 'reserved-supply',
//         label: 'Reserved Supply',
//         align: 'left',
//         field: r => r.token.amount,
//         sortable: true
//     },
//     { name: 'actions', label: 'Actions', align: 'center', field: 'actions' }
// ]
const columns: QTableColumn[] = [
    {
        name: 'token',
        label: 'Collection',
        field: (row) => row.identitySnapshot?.name || row.identitySnapshot?.token?.symbol,
        align: 'left',
        sortable: true
    },
    {
        name: 'capability',
        label: 'Capability',
        field: (row) => row.token?.nft?.capability,
        align: 'center',
        sortable: true,
    },
    // {
    //     name: 'supply',
    //     label: 'Supply',
    //     field: (row) => row.token?.amount,
    //     align: 'right',
    //     sortable: true,
    // },
    {
        name: 'collection-type',
        label: 'Collection Type',
        field: (row) => row.identitySnapshot?.token?.nfts?.parse?.bytecode ? 'Parsable' : 'Sequential',
        align: 'right',
        sortable: true,
    },
    {
        name: 'actions',
        label: 'Actions',
        field: 'actions',
        align: 'right'
    }
]

const visibleColumns = computed(() => {
    if ($q.screen.gt.sm) {
        return columns.map(c => c.name)
    }
    return ['token', 'actions']
})

const openMintChildNftDialog = (v: UtxoFormSafe, action: 'issuance' | 'burn', identitySnapshot?: IdentitySnapshot) => {

    if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient BCH balance'
        })
    }

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
                    loadAuthkeys(wallet.value, true)
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
            console.log('error', error)
            $q.notify({
                type: 'Error',
                message: error.message
            })
        } finally {
            loadingGroup()
        }
    })
}

const viewRegistry = (authhead: UtxoWithAuthKey) => {
    authguardStore.setActiveAuthhead(authhead)
    router.push('/token/registry?authbase=' + authhead.token?.category)
}

const navigateToCollection = (_evt: Event, row: UtxoWithAuthKey) => {
    console.log('ROW', row)
    authguardStore.setActiveAuthhead(row)
    router.push('/issuer/nft-collections/' + row.token?.category)
}

const navigateToMint = (row: UtxoWithAuthKey) => {
    authguardStore.setActiveAuthhead(row)
    router.push('/issuer/nft-collections/' + row.token?.category + '/mint')
}

const AUTO_SYNC_INTERVAL = 30 * 60 * 1000

const shouldForceSync = () => {
    const lastSync = authkeysLastSync.value
    return !lastSync || (Date.now() - lastSync > AUTO_SYNC_INTERVAL)
}

watch(() => authkeysLastSync, async () => {
    if (shouldForceSync()) {
        await loadAuthkeys(wallet.value, true)
    }
})

watch(walletLasySync, async (recentSync, lastSync) => {
    await loadAuthkeys(wallet.value, true)
    // if (recentSync && recentSync !== lastSync) {
    //     await loadAuthkeys(wallet.value, true)
    // }
})

onMounted(async () => {
    await loadAuthkeys(wallet.value, shouldForceSync())
    console.log('AUTHHEADS', typeof (authheads.value[0]))
})

</script>

<style scoped lang="scss">
.border-radius-8 {
    border-radius: 8px;
}

.border-radius-12 {
    border-radius: 12px;
}

.token-reserves-table {
    border-color: #2c2c2c !important;
    /* Subtle dark border line */

    :deep(.q-table__card) {
        box-shadow: none;
    }

    :deep(thead tr th) {
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 11px;
        color: #aaaaaa;
        /* Light text for column headers */
        background-color: #1e1e1e;
        /* Darker background layer specifically for the header */
        border-bottom: 1px solid #2c2c2c;
    }

    /* Fixed your row hover style so it highlights dark grey instead of flashing light white */
    :deep(tbody tr:hover) {
        background-color: #1e1e1e !important;
    }
}

.action-btn-hover {
    transition: transform 0.15s ease, background-color 0.15s ease;

    &:hover {
        transform: translateY(-1px);
        background-color: rgba(255, 255, 255, 0.08);
        /* White transparency effect for dark mode actions */
    }
}

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}

.font-10 {
    font-size: 10px;
}

.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>