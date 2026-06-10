<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div v-if="loading || !registryRecord?.registry" class="col-xs-12 col-sm-8 flex justify-left q-gutter-y-md">
                <q-skeleton type="QInput" class="full-width" label="Schema" />
                <q-skeleton type="QInput" style="min-width: 6em;" class="q-mr-sm" />
                <q-skeleton type="QInput" style="min-width: 6em;" class="q-mr-sm" />
                <q-skeleton type="QInput" style="min-width: 6em;" class="q-mr-sm" />
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
                <q-skeleton type="QInput" class="full-width" />
            </div>
            <div v-else class="col-xs-12 col-sm-8">
                <RegistryComponent v-model:registry="registryRecord.registry"
                    v-model:identity-snapshot="identitySnapshot" view-type="form"
                    :unpublished-changes="unpublishedChanges" :visibility="displayFull ? 'visible' : 'hidden'"
                    @select:identity="onIdentitySelected" @reset="onReset" @save="onSave" @publish="onPublish">
                </RegistryComponent>
                {{ unpublishedChanges }}
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { delay } from 'mainnet-js-v3'
import type { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { db, IdentitySnapshotRecord, ParsedRegistryRecord, setRecordStatus } from 'src/core/client-db'

import type { UtxoWithPath, UtxoWithAuthKey } from 'src/core/types'
import { broadcast, publishRegistry } from 'src/core/transaction'
import { useWizardConnect } from 'src/composables/useWizardConnect_'
import TransactionStatusDialog from 'components/dialogs/TransactionStatusDialog.vue'
import SaveSuccessDialog from 'components/dialogs/SaveSuccessDialog.vue'
import RegistryComponent from 'components/bcmr/Registry.vue'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import type { PublicationStrategy } from 'components/bcmr/types'
import { getRegistryWorker } from 'src/workers'
import { getErrorMessage } from 'src/core/utils'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const {
    externalWallet,
    wzDappMgr
} = useWizardConnect()

const { getRegistryByAuthbase } = useRegistryStore()

const authguardStore = useAuthguardStore()
const {
    activeAuthhead
} = storeToRefs(authguardStore)

let _registryWorker: ReturnType<typeof getRegistryWorker> | null = null
const getRegistryWorkerInstance = () => {
    if (!_registryWorker) _registryWorker = getRegistryWorker()
    return _registryWorker
}
const displayFull = ref<boolean>(false)
const registryRecord = ref<ParsedRegistryRecord>()
const identitySnapshotRecord = ref<IdentitySnapshotRecord>()
const identitySnapshot = computed<IdentitySnapshot | null>({
    get() {
        return identitySnapshotRecord.value?.identitySnapshot ?? null
    },
    set(val) {
        if (identitySnapshotRecord.value && val) {
            identitySnapshotRecord.value.identitySnapshot = val
        }
    }
})

type SaveEventPayload = {
    registry?: boolean,
    identity?: {
        authbase: string,
        timestamp: string,
        identitySnapshot: IdentitySnapshot
    }
}

const unpublishedChanges = computed<SaveEventPayload | undefined>(() => {
    const result: SaveEventPayload = {}
    if (registryRecord.value?.status === 'modified' || registryRecord.value?.status === 'new') {
        result.registry = true
    }
    if (identitySnapshotRecord.value?.status === 'modified' || identitySnapshotRecord.value?.status === 'new') {
        result.identity = {
            authbase: identitySnapshotRecord.value.authbase,
            timestamp: identitySnapshotRecord.value.timestamp,
            identitySnapshot: identitySnapshotRecord.value.identitySnapshot
        }
    }
    if (!result.registry && !result.identity) return undefined
    return result
})

const loading = ref<boolean>()


const onIdentitySelected = async (authbase: string, timestamp: string) => {
    identitySnapshotRecord.value = await getRegistryWorkerInstance().getIdentitySnapshot({
        contentHash: registryRecord.value!.contentHash,
        identity: {
            authbase,
            timestamp
        }
    })
}

const onSave = async (changes: { registry?: boolean, identity?: { authbase: string, timestamp: string, identitySnapshot: IdentitySnapshot } }) => {
    try {
        if (changes.registry && registryRecord.value) {
            registryRecord.value.registry = registryRecord.value.registry
            setRecordStatus(registryRecord.value, 'modified')
            await db.registry.update(registryRecord.value.id, {
                registry: structuredClone(registryRecord.value.registry),
                status: 'modified'
            })
        }
        if (changes.identity && identitySnapshotRecord.value) {
            const clonedSnapshot = JSON.parse(JSON.stringify(changes.identity.identitySnapshot))
            identitySnapshotRecord.value.identitySnapshot = clonedSnapshot
            setRecordStatus(identitySnapshotRecord.value, 'modified')
            await db.registryIdentitySnapshot
                .where('[contentHash+authbase+timestamp]')
                .equals([
                    identitySnapshotRecord.value.contentHash,
                    identitySnapshotRecord.value.authbase,
                    identitySnapshotRecord.value.timestamp
                ])
                .modify({ identitySnapshot: clonedSnapshot, status: identitySnapshotRecord.value.status })
        }

        $q.dialog({
            component: SaveSuccessDialog,
            componentProps: {
                message: t('success.savedDescription'),
                okLabel: t('button.save')
            }
        })
    } catch (error) {
        $q.notify({
            type: 'error',
            message: getErrorMessage(error)
        })
    }
}

const onReset = async () => {
    const loadingGroup = $q.loading.show({
        group: 'mpor-lg',
        message: t('info.clearingChanges')
    })
    try {
        if (!registryRecord.value) return
        const contentHash = registryRecord.value.contentHash
        registryRecord.value = undefined
        const resetRecord = await getRegistryWorkerInstance().resetRegistry({ contentHash })
        if (resetRecord) {
            registryRecord.value = resetRecord
            identitySnapshotRecord.value = undefined
        }
    } catch (error) {
        $q.notify({
            type: 'error',
            message: getErrorMessage(error)
        })
    } finally {
        loadingGroup()
    }

}

const onPublish = async (publicationStrategy: PublicationStrategy) => {
    const loadingGroup = $q.loading.show({
        group: 'mpop-lg',
        message: t('info.uploadingRegistryToIpfs')
    })

    try {
        const originalContentHash = registryRecord.value!.contentHash
        const bumpArtifact = await getRegistryWorkerInstance()?.bumpRegistry({
            ...publicationStrategy,
            originalContentHash
        })

        if (!bumpArtifact) {
            throw new Error('Error uploading registry')
        }

        loadingGroup({
            message: t('transaction.waitingForSignature')
        })

        const publishRegistryRequest = publishRegistry({
            authhead: activeAuthhead.value as UtxoWithAuthKey,
            funderUtxos: externalWallet.value.utxos as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK,
            registryPublicationData: {
                contentHash: bumpArtifact.contentHash,
                uris: bumpArtifact.uris
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
                await getRegistryWorkerInstance().commitBumpRegistry(originalContentHash, `${broadcastResult.txid}:0`)
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
    } finally {
        loadingGroup()
    }

}


onMounted(async () => {
    try {
        loading.value = true
        const authbase = route.query.authbase as string
        if (!authbase) router.back()
        registryRecord.value = await getRegistryByAuthbase(authbase)

        if (registryRecord.value?.registry?.identities?.[authbase]) {
            const timestamps = registryRecord.value.registry.identities[authbase]
            const latestTimestamp = timestamps.sort((a, b) => b.localeCompare(a))[0]
            if (latestTimestamp) {
                identitySnapshotRecord.value = await getRegistryWorkerInstance().getIdentitySnapshot({
                    contentHash: registryRecord.value.contentHash,
                    identity: { authbase, timestamp: latestTimestamp }
                })
            }
        }
    } catch (error) {
        $q.notify({
            type: 'Error',
            message: t('error.loadingRegistry')
        })
    } finally {
        loading.value = false
    }
})



</script>