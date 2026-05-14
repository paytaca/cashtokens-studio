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
                                    @click.stop="() => openFtIssuerDialog(value.row, metadataStore.identitySnapshot?.[value.row.token!.category as string])"
                                    :disable="!!value.row.processing" :loading="loading">
                                </q-btn>
                                <q-btn icon="local_fire_department" size="md" :label="$q.screen.xs ? '' : 'Burn'"
                                    text-color="orange" no-caps @click.stop="() => console.log('burn')"
                                    :disable="!!value.row.processing" :loading="loading">
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
import { getLockedAuthheadUtxos, type UtxoWithAuthKey } from 'src/core/authguard'
import { useMetadataStore } from 'src/stores/metadata'
import { shortenTokenId } from 'src/core/utils'
import { issueFungibleReserves, jsonFormSafeUtxoReviver, jsonReplacer } from 'src/core/transaction'
import { Network } from 'cashscript'
import FTIssuerDialog from 'src/components/dialogs/FTIssuerDialog.vue'
import { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { broadcast } from 'src/core/transaction/broadcast'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'

const $q = useQuasar()
const {
    wzWallet,
    wzDappMgr,
    wzWalletGetUtxos,
} = useWizardConnect()

const authheads = ref<UtxoWithAuthKey[]>([])
const authkeys = ref<UtxoWithPath[]>([])
const loading = ref<boolean>()
const fetchUtxos = ref<boolean>(true)
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
            console.log('ROW VALUE', r, metadataStore.identitySnapshot)
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

const loadAuthkeys = async () => {
    try {
        loading.value = true
        authkeys.value = await wzWalletGetUtxos(
            wzWallet.value as any, { resolveAddressIndex: true, authKeysOnly: true }
        ) as UtxoWithPath[]
        console.log('authkeys', authkeys)
        fetchUtxos.value = false
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

const openFtIssuerDialog = (v: UtxoFormSafe, identitySnapshot?: IdentitySnapshot) => {

    if (!wzWallet.value?.utxos || wzWallet.value?.utxos.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient BCH balance'
        })
    }

    $q.dialog({
        component: FTIssuerDialog,
        componentProps: {
            issuerUtxo: v,
            selfAddress: wzWallet.value?.receive?.getTokenDepositAddress(0),
            identitySnapshot
        },
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

            const issueFungibleReservesRequest = issueFungibleReserves({
                issuerTokenUtxo,
                authkeyUtxo: issuerTokenUtxo.authkey,
                recipientAddress: userInputs.recipient,
                issuedTokenAmount: userInputs.tokenAmount,
                network: import.meta.env.VITE_BCH_NETWORK as Network,
                funderUtxos: (wzWallet.value?.utxos || []) as UtxoWithPath[]
            })

            loadingGroup({
                message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
            })
            const response = await wzDappMgr.value.signTransaction(issueFungibleReservesRequest);

            loadingGroup({
                message: 'Broadcasting transaction, please wait...'
            })

            const broadcastResponse = await broadcast(response.signedTransaction)

            if (broadcastResponse.ok) {
                const broadcastResult = await broadcastResponse.json()
                $q.dialog({
                    component: TransactionStatusDialog,
                    componentProps: {
                        statusType: 'success',
                        statusText: `Fungible token successfully issued from FT reserves`,
                        txid: broadcastResult.txid
                    }
                })
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
        console.log('Syncing Authheads')
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

watch(() => wzWallet.value.ready, async (walletReady) => {
    if (walletReady && !authkeysLastSync.value) {
        await loadAuthkeys()
    }
})


onMounted(async () => {
    if (wzWallet.value.ready) {
        await loadAuthkeys()
    }
})
</script>