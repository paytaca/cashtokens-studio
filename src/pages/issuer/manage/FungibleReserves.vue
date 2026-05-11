<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 q-my-lg">
                <q-table title="Fungible Token Reserves" :rows="authheads" :columns="columns"
                    :row-key="(row) => `${row.txid}:${row.vout}`" :loading="loading" flat bordered>
                    <template v-slot:body-cell-time="props">
                        <q-td :props="props">
                            {{ new Date(props.value * 1000).toLocaleString() }}
                        </q-td>
                    </template>
                    <template v-slot:body-cell-category="props">
                        <q-td :props="props">
                            {{ shortenTokenId(props.value) }}
                        </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                        <q-td :props="props" class="q-gutter-x-sm">
                            <q-btn flat round color="negative" icon="close" size="sm"
                                @click="() => console.log(props.row)">
                                <q-tooltip>Cancel Request</q-tooltip>
                            </q-btn>
                        </q-td>
                    </template>
                </q-table>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { QTableColumn, useQuasar } from 'quasar'
import { useWizardConnect } from 'src/composables/useWizardConnect'
import { UtxoWithPath } from 'src/core/types'
import { getLockedAuthheadUtxos, type UtxoWithAuthKey } from 'src/core/authguard'
import { useMetadataStore } from 'src/stores/metadata'
import { shortenTokenId } from 'src/core/utils'

const $q = useQuasar()
const {
    wzWallet,
    wzWalletGetUtxos
} = useWizardConnect()

const authheads = ref<UtxoWithAuthKey[]>([])
const authkeys = ref<UtxoWithPath[]>([])
const loading = ref<boolean>()
const refreshAuthheads = ref<boolean>()
const fetchUtxos = ref<boolean>(true)
const metadataStore = useMetadataStore()

const columns: QTableColumn[] = [
    {
        name: 'category',
        label: 'Category',
        align: 'left',
        field: (r) => r.token?.category,
        sortable: true
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
    { name: 'actions', label: 'Issue Tokens', align: 'center', field: 'actions' }
]

watch(() => wzWallet.value, async (wallet) => {
    if (wallet && fetchUtxos.value) {
        try {
            loading.value = true
            authkeys.value = await wzWalletGetUtxos(wallet, { resolveAddressIndex: true, authKeysOnly: true }) as UtxoWithPath[]
            fetchUtxos.value = false
        } catch (error) {
            $q.notify({
                type: 'Warning',
                message: 'Error encountered while fetching fungible reserves. Please try refreshing the page. If problem persists please contact admin.'
            })
        } finally {
            loading.value = false
            refreshAuthheads.value = true
        }
    }
}, { immediate: true, deep: true })

watch(() => refreshAuthheads.value, async (refresh) => {
    if (refresh) {
        try {
            loading.value = true
            const authkeysCategory = new Set()
            authkeys.value?.map(k => k.token!.category).forEach((c) => {
                authkeysCategory.add(c)
            })

            authheads.value = await getLockedAuthheadUtxos(
                Array.from(authkeysCategory) as string[]
            )

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
            refreshAuthheads.value = false
            loading.value = false
        }
    }
})

</script>