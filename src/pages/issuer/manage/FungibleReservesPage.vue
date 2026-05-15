<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 q-my-lg">
                <q-table title="Fungible Token Reserves" :rows="authheads" :columns="columns"
                    :row-key="(row) => `${row.txid}:${row.vout}`" :loading="loading" flat bordered>
                    <template v-slot:body-cell-icon="props">
                        <q-td :props="props">
                            <q-avatar>
                                <q-img v-if="props.value" :src="ipfsToGatewayUrl(props.value)!"></q-img>
                                <q-icon v-else name="token"></q-icon>
                            </q-avatar>
                        </q-td>
                    </template>
                    <template v-slot:body-cell-category="props">
                        <q-td :props="props">
                            {{ shortenTokenId(props.value) }}
                        </q-td>
                    </template>
                    <template v-slot:body-cell-actions="value">
                        <q-td class="text-center">
                            <div class="flex justify-center no-wrap q-gutter-x-sm">
                                <q-btn icon="send" size="md" :label="$q.screen.xs ? '' : 'Issue Tokens'"
                                    text-color="primary" no-caps
                                    @click.stop="openFungibleReservesReleaseDialog(value.row, 'issuance', metadataStore.identitySnapshot?.[value.row.token!.category as string])"
                                    :disable="!!value.row.processing" :loading="loading">
                                </q-btn>
                                <q-btn icon="local_fire_department" size="md" :label="$q.screen.xs ? '' : 'Burn'"
                                    @click.stop="openFungibleReservesReleaseDialog(value.row, 'burn', metadataStore.identitySnapshot?.[value.row.token!.category as string])"
                                    text-color="orange" no-caps :disable="!!value.row.processing" :loading="loading">
                                </q-btn>
                            </div>
                        </q-td>
                    </template>
                </q-table>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { QTableColumn, useQuasar } from 'quasar'
import { useWizardConnect } from 'src/composables/useWizardConnect'
import { UtxoFormSafe, UtxoWithPath } from 'src/core/types'
import { filterAuthKeys, getLockedAuthheadUtxos, type UtxoWithAuthKey } from 'src/core/authguard'
import { useMetadataStore } from 'src/stores/metadata'
import { shortenTokenId } from 'src/core/utils'
import { transferFungibleReserves, jsonFormSafeUtxoReviver, jsonReplacer } from 'src/core/transaction'
import { Network } from 'cashscript'
import FungibleReservesTransferDialog from 'src/components/dialogs/FungibleReservesTransferDialog.vue'
import { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { broadcast } from 'src/core/transaction/broadcast'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { decodeCashAddress } from '@bitauth/libauth'
import { delay } from 'mainnet-js-v3'

const $q = useQuasar()
const {
    wzDappMgr,
    externalWallet
} = useWizardConnect()

const authheads = ref<UtxoWithAuthKey[]>([])
const authkeys = ref<UtxoWithPath[]>([])
const loading = ref<boolean>()
const metadataStore = useMetadataStore()

const authkeysLastSync = ref<number>()

const columns: QTableColumn[] = [
    {
        name: 'icon',
        label: 'Icon',
        align: 'left',
        field: (r) => {
            return metadataStore.identitySnapshot?.[r.token?.category || r.txid]?.uris?.icon
        },
    },
    {
        name: 'symbol',
        label: 'Symbol',
        align: 'left',
        field: (r) => {
            return metadataStore.identitySnapshot?.[r.token?.category || r.txid]?.token?.symbol
        },
        sortable: true
    },
    {
        name: 'decimals',
        label: 'Decimals',
        align: 'left',
        field: (r) => {
            return metadataStore.identitySnapshot?.[r.token?.category || r.txid]?.token?.decimals ?? 'Unknown'
        },
        sortable: true
    },
    {
        name: 'reserved-supply',
        label: 'Reserved Supply',
        align: 'left',
        field: r => r.token.amount,
        sortable: true
    },
    { name: 'actions', label: 'Actions', align: 'center', field: 'actions' }
]

const loadAuthkeys = async (sync?: boolean) => {
    try {
        loading.value = true
        authkeys.value = filterAuthKeys(await externalWallet.value.getUtxos({ sync })) as UtxoWithPath[]
        authkeysLastSync.value = Date.now()
    } catch (error) {
        $q.notify({
            type: 'Warning',
            message: 'Error encountered while fetching fungible reserves. Please try refreshing the page. If problem persists please contact admin.'
        })
    } finally {
        loading.value = false
    }
}

const openFungibleReservesReleaseDialog = (v: UtxoFormSafe, action: 'issuance' | 'burn', identitySnapshot?: IdentitySnapshot) => {

    if (!externalWallet.value?.utxos || externalWallet.value.utxos.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient BCH balance'
        })
    }

    const componentProps = {
        transferType: action,
        issuerUtxo: v,
        identitySnapshot,
    } as any

    if (action === 'issuance') {
        componentProps.selfAddress = externalWallet.value.getTokenDepositAddress(0)
    } else if (action === 'burn') {
        const sampleAddress = externalWallet.value.getTokenDepositAddress(0)
        const sampleDecodedAddress = decodeCashAddress(sampleAddress)
        if (typeof (sampleDecodedAddress) === 'string') {
            throw new Error(sampleDecodedAddress)
        }
        componentProps.burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`
    }

    $q.dialog({
        component: FungibleReservesTransferDialog,
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
                funderUtxos: (externalWallet.value.utxos || []) as UtxoWithPath[],
                transferType: action
            })

            loadingGroup({
                message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
            })
            const response = await wzDappMgr.value.signTransaction(signRequest);

            loadingGroup({
                message: 'Broadcasting transaction, please wait...'
            })

            const broadcastResponse = await broadcast(response.signedTransaction)

            if (broadcastResponse.ok) {
                const broadcastResult = await broadcastResponse.json()
                if (broadcastResult.success) {
                    await delay(2000)
                    loadingGroup()
                    loadAuthkeys(true)
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


watch(() => authkeysLastSync.value, async (authkeysLastSync, authkeysPrevSync) => {
    if (authkeysLastSync !== authkeysPrevSync) {
        try {
            loading.value = true
            authheads.value = await getLockedAuthheadUtxos(authkeys.value)

            for (const authhead of authheads.value) {
                if (!authhead.token) {
                    continue
                }
                await metadataStore.loadIdentitySnapshot(authhead.token.category)
            }

        } catch (error) {
            console.log(error)
            $q.notify({
                type: 'Warning',
                message: 'Error encountered while fetching fungible reserves. Please try refreshing the page. If problem persists please contact admin.'
            })
        } finally {
            loading.value = false
        }
    }
})


watch(() => externalWallet.value?.ready, async (walletReady) => {
    if (walletReady && !authkeysLastSync.value) {
        await loadAuthkeys()
    }
})


onMounted(async () => {
    if (externalWallet.value.ready) {
        await loadAuthkeys()
    }
})
</script>