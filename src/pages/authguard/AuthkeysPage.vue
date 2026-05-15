<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 q-my-lg">
                <q-table title="Authkeys" :rows="authkeys" :columns="columns"
                    :row-key="(row) => `${row.txid}:${row.vout}`" :loading="loading" flat class="border-radius-15">
                    <template v-slot:body-cell-authkey="props">
                        <q-td :props="props">
                            <div>
                                <q-icon name="key" color="yellow"></q-icon>
                                <span class="text-caption">
                                    {{ shortenTokenId(props.value.token.category) }}
                                </span>
                            </div>
                        </q-td>
                    </template>
                    <template v-slot:body-cell-authguard="props">
                        <q-td :props="props">
                            <div>
                                <q-icon name="lock" color="yellow"></q-icon>
                                <span class="text-caption">{{ shortenCashAddress(props.value) }}</span>
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
import { UtxoWithPath } from 'src/core/types'
import { filterAuthKeys, getAuthguardContractAddress } from 'src/core/authguard'
import { useMetadataStore } from 'src/stores/metadata'
import { shortenCashAddress, shortenTokenId } from 'src/core/utils'

const $q = useQuasar()
const {
    wzDappMgr,
    externalWallet
} = useWizardConnect()

const authkeys = ref<UtxoWithPath[]>([])
const loading = ref<boolean>()
const metadataStore = useMetadataStore()
const authkeysLastSync = ref<number>()

const columns: QTableColumn[] = [
    {
        name: 'authkey',
        label: 'Authkey',
        align: 'left',
        field: (r) => r
    },
    {
        name: 'authguard',
        label: 'Authguard',
        align: 'left',
        field: r => getAuthguardContractAddress({
            authkeyTokenId: r.token.category,
            network: import.meta.env.VITE_BCH_NETWORK
        }),
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