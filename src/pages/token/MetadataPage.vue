<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div v-if="loading || !registry" class="col-xs-12 col-sm-8 flex justify-left q-gutter-y-md">
                <q-skeleton type="QInput" class="full-width" label="Schema" />
                <q-skeleton type="QInput" style="min-width: 6em;" class="q-mr-sm" />
                <q-skeleton type="QInput" style="min-width: 6em;" class="q-mr-sm" />
                <q-skeleton type="QInput" style="min-width: 6em;" class="q-mr-sm" />
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
            </div>
            <div v-else class="col-xs-12 col-sm-8">
                <div class="text-right">
                    <!-- <q-checkbox left-label v-model="displayFull" :label="t('label.registry.displayFull')" /> -->
                    <q-toggle :false-value="true" :true-value="false" color="red" v-model="displayFull" />
                </div>
                <RegistryComponent v-model:registry="registry" view-type="form"
                    :visibility="displayFull ? 'visible' : 'hidden'" @publish="onPublish"
                    @update:identity-history-timestamp="onUpdateIdentityHistoryTimestamp"
                    @update:registry-identity="onUpdateRegistryIdentity">
                </RegistryComponent>

            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { binToHex, sha256 } from '@bitauth/libauth'
import { delay, utf8ToBin } from 'mainnet-js-v3'

import type { IdentityHistory, IdentitySnapshot, OffChainRegistryIdentity, Registry } from 'src/core/bcmr/bcmr-v2.schema'
import { uploadFile } from 'src/core/ipfs/upload-file'

import { UtxoWithPath } from 'src/core/types'
import { broadcast, publishRegistry } from 'src/core/transaction'
import { retrieveLastRegistryPublication } from 'src/core/chaingraph'
import { useWizardConnect } from 'src/composables/useWizardConnect'
import TransactionStatusDialog from 'components/dialogs/TransactionStatusDialog.vue'
import RegistryComponent from 'components/bcmr/Registry.vue'
import { useAuthguardStore } from 'src/stores/authguard'
import { UtxoWithAuthKey } from 'src/core/authguard'

const $q = useQuasar()
const router = useRouter()
const { t } = useI18n()
const {
    externalWallet,
    wzDappMgr
} = useWizardConnect()

const authguardStore = useAuthguardStore()
const {
    activeAuthhead
} = storeToRefs(authguardStore)

const displayFull = ref<boolean>(false)
const registry = ref<Registry>()
const registryIdentity = ref<string | OffChainRegistryIdentity>()
const identityHistory = ref<IdentityHistory>()
const identitySnapshot = ref<IdentitySnapshot>()

const isOnchainRegistryIdentity = computed(() => {
    return (
        registry.value?.registryIdentity &&
        typeof (registry.value.registryIdentity) === 'string' &&
        registry.value?.registryIdentity !== 'undefined'
    )
})

const loading = ref<boolean>()

watch(() => registryIdentity.value, (registryIdentity) => {
    if (isOnchainRegistryIdentity.value && typeof (registryIdentity) === 'string') {
        if (registry.value && registry.value.identities) {
            identityHistory.value = registry.value.identities[registryIdentity]
        }
    }
})

const onUpdateIdentityHistoryTimestamp = (selectedIdentityHistoryTimestamp: string) => {
    identitySnapshot.value = registry.value!.identities![registryIdentity.value as string]![selectedIdentityHistoryTimestamp]
}

const onUpdateRegistryIdentity = (selectedRegistryIdentity: string) => {
    registryIdentity.value = selectedRegistryIdentity
}

const onPublish = async (registry: Registry) => {
    const loadingGroup = $q.loading.show({
        group: 'mpop-lg',
        message: t('info.uploadingRegistryToIpfs')
    })

    try {
        const jsonString = JSON.stringify(registry);
        const jsonBlob = new Blob([jsonString], { type: 'application/json' });
        const filename = 'bitcoin-cash-metadata-registry.json';
        const artifact = await uploadFile(jsonBlob, filename)
        const contentHash = binToHex(sha256.hash(utf8ToBin(jsonString)))
        const uris = [`ipfs://${artifact.cid}`]

        loadingGroup({
            message: t('transaction.waitingForSignature')
        })

        const publishRegistryRequest = publishRegistry({
            authhead: activeAuthhead.value as UtxoWithAuthKey,
            funderUtxos: externalWallet.value.utxos as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK,
            registryPublicationData: {
                contentHash: contentHash,
                uris
            }
        })

        const response = await wzDappMgr.value.signTransaction(publishRegistryRequest);

        loadingGroup({
            message: t('transaction.broadcasting')
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
                        statusText: t('success.registryPublication'),
                        txid: broadcastResult.txid
                    }
                }).onOk(() => {
                    router.back()
                })
            } else {
                throw new Error(broadcastResult.error)
            }
        }
    } catch (error) {
        $q.notify({
            type: 'error',
            message: t('error.registryPublication')
        })
    }

}

onMounted(async () => {
    try {
        loading.value = true
        if (activeAuthhead.value?.token?.category) {
            const pub = await retrieveLastRegistryPublication({ authbase: activeAuthhead.value.token.category })
            const httpUris = pub[0]?.uris?.map((uri: string) => {
                if (uri.startsWith('ipfs://')) {
                    return `/api/ipfs/${uri.replace('ipfs://', '')}`
                }
                return uri
            })
            const response = await Promise.race(
                httpUris.map((uri: string) => {
                    return fetch(uri)
                })
            )
            if (response.ok) {
                registry.value = await response.json()
                registryIdentity.value = registry.value?.registryIdentity

            }
        }

    } catch (error) {
        $q.notify({
            type: 'Error',
            message: t('error.loadingRegistry')
        })
        loading.value = false
    } finally {
        loading.value = false
    }

})


</script>