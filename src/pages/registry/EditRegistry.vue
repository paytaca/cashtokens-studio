<template>
    <q-page class="bg-dark-page text-white q-pb-xl">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <q-card v-if="registry" flat class="bg-dark q-pa-lg rounded-borders">
                    <div class="row">
                        <h6 class="q-my-xs">Registry Info</h6>
                        <div class="col-12">
                            <FormField>
                                <label class="form-label">Schema</label>
                                <q-input :model-value="registry['$schema']" class="full-width" disable outlined>
                                </q-input>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField>
                                <label class="form-label">{{ t('label.registry.version') }}</label>
                                <div class="row q-gutter-x-md">
                                    <q-input v-model="registry.version.major" label="Major" class="col-3" type="number"
                                        outlined disable required></q-input>
                                    <q-input v-model="registry.version.minor" label="Minor" class="col-3" type="number"
                                        outlined disable required></q-input>
                                    <q-input v-model="registry.version.patch" label="Patch" class="col-3" type="number"
                                        outlined disable required></q-input>
                                </div>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField>
                                <label>{{ t('label.registry.latestRevision') }}</label>
                                <q-input :model-value="registry.latestRevision" class="full-width" disable outlined>
                                </q-input>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField v-if="isOnchainRegistryIdentity">
                                <label>{{ t('label.registry.registryIdentity') }}</label>
                                <q-input v-model="(registry.registryIdentity as string)" autogrow outlined></q-input>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField v-if="isOnchainRegistryIdentity">
                                <label>{{ t('label.registry.license') }}</label>
                                <q-input v-model="(registry.license as string)" autogrow outlined></q-input>
                            </FormField>
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
        <q-page-sticky v-if="modified || (registryRecord as RegistryRecord).status === 'modified'" position="bottom"
            class="q-pa-md items-center" expand>
            <div class="row justify-end items-center bg-dark q-pa-md rounded-borders items-center q-gutter-x-sm"
                style="border: 1px solid #555; width: 100%;">
                <q-btn flat color="warning" icon="mdi-undo" label="Reset" :disable="publishing" @click="onResetClick" />
                <q-btn color="primary" unelevated label="Save" :disable="publishing" @click="onSaveClick" />
                <q-btn color="primary" unelevated label="Publish" :loading="publishing" :disable="publishing"
                    @click="onPublishClick" />
            </div>
        </q-page-sticky>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, triggerRef, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'

import { useAppStore } from 'src/stores/app'
import FormField from 'src/components/FormField.vue'
import { db, RegistryRecord } from 'src/core/client-db'
import { liveQuery } from 'dexie'
import { useObservable } from '@vueuse/rxjs'
import type { CompactRegistry } from 'src/core/bcmr/types'
import { getErrorMessage } from 'src/core/utils'
import type { UtxoWithAuthKey, UtxoWithPath } from 'src/core/types'
import { publishRegistry } from 'src/core/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { getRegistryWorker } from 'src/workers'
import { broadcastTransaction } from 'src/services/transaction'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { startLoader, updateStep, stopLoader } = useCancelableLoadingDialog()

const TASK_UPLOAD_REGISTRY = 'upload-registry'
const publishTaskList = [
    { id: TASK_UPLOAD_REGISTRY, label: t('info.uploadingRegistryToIpfs') },
    ...txTaskList,
]
const appStore = useAppStore()
const authguardStore = useAuthguardStore()
const registryStore = useRegistryStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const {
    manager,
    wallet,
} = useWizardConnectWallet()

const registry = ref<CompactRegistry>()
const initialRegistryJson = ref('')
const publishing = ref(false)

const modified = computed(() => {
    if (!initialRegistryJson.value || !registry.value) return false
    return JSON.stringify(registry.value) !== initialRegistryJson.value
})

const registryRecord = useObservable(
    liveQuery(async () => {
        return await db.registry.where({
            registryIdentity: route.query.registryIdentity
        }).first()
    }) as any,
    { initialValue: {} } // Added to prevent runtime template rendering crashes
)

const isOnchainRegistryIdentity = computed(() => {
    return (
        registry.value?.registryIdentity &&
        typeof (registry.value.registryIdentity) === 'string' &&
        registry.value?.registryIdentity !== 'undefined'
    )
})

watch(() => registryRecord.value as RegistryRecord, (newRecord: RegistryRecord) => {
    if (newRecord && Object.keys(newRecord || {}).length > 0 && !registry.value) {
        registry.value = JSON.parse(JSON.stringify(newRecord.registry))
        initialRegistryJson.value = JSON.stringify(registry.value)
    }
}, { immediate: true })

const onResetClick = () => {
    if (!initialRegistryJson.value) return
    registry.value = JSON.parse(initialRegistryJson.value)
}

const onSaveClick = async () => {
    const record = registryRecord.value as RegistryRecord
    if (!registry.value || !record?.id) return
    try {
        const clonedRegistry = JSON.parse(JSON.stringify(registry.value))
        await db.registry.update(record.id, {
            registry: clonedRegistry,
            status: 'modified'
        })
        initialRegistryJson.value = JSON.stringify(clonedRegistry)
        $q.notify({ type: 'positive', message: t('success.savedDescription') })
    } catch (error) {
        $q.notify({ type: 'error', message: getErrorMessage(error) })
    }
}

const onPublishClick = async () => {
    const record = registryRecord.value as RegistryRecord
    if (!registry.value || !record?.id || !activeAuthhead.value) return

    publishing.value = true

    startLoader(publishTaskList, () => {
        $q.notify({ type: 'warning', message: 'Cancelled by user' })
    })

    updateStep(TASK_UPLOAD_REGISTRY, 'running')

    let broadcastTxidCopy = ''

    try {
        // Persist the registry-level edits so bumpRegistry picks them up from the
        // compact registry record, then let it merge any pending identity/nft changes.
        await db.registry.update(record.id, {
            registry: JSON.parse(JSON.stringify(registry.value)),
            status: 'modified'
        })

        const bumpArtifact = await getRegistryWorker().bumpRegistry({
            originalContentHash: record.contentHash,
            bumpType: 'patch'
        })

        if (!bumpArtifact) throw new Error('Error uploading registry')

        updateStep(TASK_UPLOAD_REGISTRY, 'done')
        updateStep(TASK_INPUTS_CHECK, 'running')

        await wallet.value.sync()
        triggerRef(wallet)

        updateStep(TASK_INPUTS_CHECK, 'done')
        updateStep(TASK_PREPARE_TX, 'running')

        const publishRegistryRequest = publishRegistry({
            authhead: activeAuthhead.value as UtxoWithAuthKey,
            funderUtxos: wallet.value.utxos as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK,
            registryPublicationData: {
                contentHash: bumpArtifact.contentHash,
                uris: bumpArtifact.uris
            }
        })

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        const response = await manager.value!.signTransaction(publishRegistryRequest)

        updateStep(TASK_WAIT_FOR_SIG, 'done')
        updateStep(TASK_BROADCASTING, 'running')

        const [broadcastError, txid] = await broadcastTransaction({
            transactionHex: response.signedTransaction,
            network: import.meta.env.VITE_BCH_NETWORK,
            onProgress: (progress: string) => {
                const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
                updateStep(TASK_BROADCASTING, 'running', newLabel)
            }
        })

        broadcastTxidCopy = txid

        if (broadcastError) {
            updateStep(TASK_BROADCASTING, 'failed')
            throw broadcastError
        }

        await getRegistryWorker().commitBumpRegistry(record.contentHash, `${txid}:0`)

        updateStep(TASK_BROADCASTING, 'done')
        updateStep(TASK_WAITING_PROPAGATION, 'running')

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({ txHash: txid })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'running')

        loadAuthkeys(wallet.value, true).then(() => {
            triggerRef(wallet)
        })

        await updateActiveAuthhead()

        await db.saveActivity({
            event: `Published registry of ${activeAuthhead.value?.identitySnapshot?.token?.symbol || record.authbase}`,
            txid,
            status: 'success'
        })

        updateStep(TASK_REFRESH_UTXOS, 'done')
        stopLoader(1000)

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('success.registryPublication'),
                txid
            }
        }).onOk(async () => {
            await registryStore.loadRegistry(record.authbase, true)
            const refreshed = await db.registry.where({ authbase: record.authbase }).first()
            if (refreshed) {
                registry.value = JSON.parse(JSON.stringify(refreshed.registry))
                initialRegistryJson.value = JSON.stringify(registry.value)
            }
        })
    } catch (error: any) {
        if (!broadcastTxidCopy) {
            await db.saveActivity({
                event: `Published registry of ${activeAuthhead.value?.identitySnapshot?.token?.symbol || record.authbase}`,
                txid: broadcastTxidCopy,
                status: 'failed'
            })
        }
        stopLoader(3000)
        $q.notify({ type: 'Error', message: error.message })
    } finally {
        publishing.value = false
    }
}

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
