<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-banner v-if="isImportAuthUtxoFlow" class="authkey-banner border-radius-12 q-mt-xl">
                    <template v-slot:avatar>
                        <q-icon name="key" color="warning" size="sm" />
                    </template>
                    <div class="text-weight-bold text-white">{{ t('authguard.importAuthhead.requirementTitle') }}</div>
                    <div class="text-body2 text-grey-4 text-justify">{{ t('authguard.importAuthhead.requirement') }}
                    </div>
                </q-banner>

                <q-card flat bordered class="feature-card-bg rounded-borders q-mt-xl q-py-md">
                    <q-card-section class="flex justify-between items-center">
                        <q-card-title class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm ">
                            <span>{{ t('createAuthkey.title') }}</span>
                            <q-icon name="key" size="lg" color="warning" style="transform: rotate(-25deg);" />
                        </q-card-title>
                        <q-btn @click="$q.dialog({
                            class: 'q-py-sm text-body1 text-justify',
                            html: true,
                            message: t('info.createAuthKeyNftExplainer')
                        })" flat no-caps dense text-color="secondary">
                            {{ t('info.whatsThis') }}
                        </q-btn>
                    </q-card-section>
                    <q-card-section>
                        <q-form class="q-gutter-y-md" greedy>
                            <FormField class="full-width">
                                <label>{{ t('createAuthkey.tokenIdCandidate') }}</label>
                                <q-input :model-value="genesisInputCandidate?.txid || hint" class="full-width" outlined
                                    readonly>
                                    <template v-slot:prepend>
                                        <q-icon name="key"></q-icon>
                                    </template>
                                    <template v-slot:append>
                                        <q-btn v-if="!genesisInputCandidate?.txid" @click="onGenerateGenesisInput"
                                            text-color="secondary" no-caps flat>{{ t('createAuthkey.generate')
                                            }}</q-btn>
                                    </template>
                                </q-input>
                            </FormField>
                            <FormField class="full-width">
                                <label>{{ t('createAuthkey.commitment') }}</label>
                                <q-input model-value="00" class="full-width" outlined disable />
                            </FormField>
                            <FormField class="full-width">
                                <label>{{ t('createAuthkey.capability') }}</label>
                                <q-input model-value="none" class="full-width" outlined disable />
                            </FormField>
                        </q-form>
                    </q-card-section>
                    <q-card-actions class="q-mt-lg">
                        <q-btn :label="t('createAuthkey.submit')" color="primary" class="full-width"
                            :disable="!genesisInputCandidate?.txid" @click="onCreateAuthKey" rounded no-caps
                            size="lg" />
                    </q-card-actions>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { createAuthkey, createGenesisInput } from 'src/core/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import FormField from 'src/components/FormField.vue'
import { UtxoWithPath } from 'src/core/types'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { createAuthguardContract } from 'src/core/authguard'
import { subscribe } from 'src/services/watchtower'
import { broadcastTransaction } from 'src/services/transaction'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const {
    wallet,
    manager
} = useWizardConnectWallet()

const { t } = useI18n()

/**
 * Where to go once the AuthKey exists — set by pages that need one before they can continue (see
 * ImportAuthheadPage). Only internal paths are honoured so the query cannot redirect off-site.
 */
const returnTo = computed(() => {
    const queryValue = route.query.returnTo
    const value = Array.isArray(queryValue) ? queryValue[0] : queryValue
    return typeof value === 'string' && value.startsWith('/') ? value : undefined
})

/**
 * True when the auth UTXO import flow sent us here, so the page can explain why it needs an AuthKey.
 * The import page tags its redirect with `from`, and also hands over a `returnTo`, so either
 * signal counts (a stale or hand-typed `returnTo` still gets the banner).
 */
const isImportAuthUtxoFlow = computed(() => {
    if (route.query.from === 'import-authhead') return true

    const target = returnTo.value
    return !!target && router.resolve(target).name === 'import-authhead'
})

const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog()

const utxos = ref<UtxoWithPath[]>([])
const genesisInputCandidate = computed<UtxoWithPath>(() => {
    return utxos.value.filter((u) => !u.token && u.vout === 0).sort((u1, u2) => {
        return Number(u2.satoshis) - Number(u1.satoshis)
    })[0] as UtxoWithPath
})

const hint = computed(() => {
    if (genesisInputCandidate.value?.txid) {
        return t('info.authkeyTokenIdCandidateHint')
    }
    return t('info.authkeyTokenIdCandidateNotFoundHint')
})

const onGenerateGenesisInput = async () => {
    startLoader(txTaskList, () => {
        $q.notify({ type: 'warning', message: t('info.cancelled') })
    })

    try {
        updateStep(TASK_INPUTS_CHECK, 'running')

        if (!wallet.value?.ready) {
            updateStep(TASK_INPUTS_CHECK, 'failed')
            $q.notify({
                message: 'Wallet not ready'
            })
            return
        }

        const walletUtxos = await wallet.value.getUtxos()

        updateStep(TASK_INPUTS_CHECK, 'done')
        updateStep(TASK_PREPARE_TX, 'running')

        const genesisInputSignReq = createGenesisInput({
            funderUtxos: walletUtxos,
            recipientAddress: wallet.value.getDepositAddress(0)
        })

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        const response = await manager.value?.signTransaction(genesisInputSignReq, { signal: getSignal() });

        if (!response) {
            updateStep(TASK_WAIT_FOR_SIG, 'failed')
            return
        }

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

        if (broadcastError) {
            updateStep(TASK_BROADCASTING, 'failed')
            throw broadcastError
        }

        updateStep(TASK_BROADCASTING, 'done')
        updateStep(TASK_WAITING_PROPAGATION, 'running')

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({ txHash: txid })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'running')

        utxos.value = await wallet.value.getUtxos()

        updateStep(TASK_REFRESH_UTXOS, 'done')

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('success.genesisInputCreation'),
                txid
            }
        })

    } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.log(error)
        $q.notify({
            type: 'Error',
            message: t('error.genesisInputCreation')
        })
    } finally {
        stopLoader(1000)
    }
}

const onCreateAuthKey = async () => {
    startLoader(txTaskList, () => {
        $q.notify({ type: 'warning', message: t('info.cancelled') })
    })

    try {
        updateStep(TASK_INPUTS_CHECK, 'running')

        if (!wallet.value?.ready) {
            updateStep(TASK_INPUTS_CHECK, 'failed')
            $q.notify({
                message: t('info.walletNotReady')
            })
            return
        }

        const walletUtxos = await wallet.value.getUtxos()
        const recipientAddress = wallet.value.getDepositAddress(0)

        updateStep(TASK_INPUTS_CHECK, 'done')
        updateStep(TASK_PREPARE_TX, 'running')

        const signRequest = createAuthkey({
            genesisInputId: `${genesisInputCandidate.value!.txid}:${genesisInputCandidate.value!.vout}` as `${string}:${number}`,
            utxos: walletUtxos,
            authKeyRecipientAddress: recipientAddress,
            network: import.meta.env.VITE_BCH_NETWORK
        })

        const authguard = createAuthguardContract({
            authkeyTokenId: genesisInputCandidate.value!.txid,
            network: import.meta.env.VITE_BCH_NETWORK
        })

        // Best effort watchtower subscription
        subscribe(authguard.address).catch()

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        const response = await manager.value?.signTransaction(signRequest, { signal: getSignal() });

        if (!response) {
            updateStep(TASK_WAIT_FOR_SIG, 'failed')
            return
        }

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

        if (broadcastError) {
            updateStep(TASK_BROADCASTING, 'failed')
            throw broadcastError
        }

        updateStep(TASK_BROADCASTING, 'done')
        updateStep(TASK_WAITING_PROPAGATION, 'running')

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({ txHash: txid })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'running')

        utxos.value = await wallet.value.getUtxos()

        updateStep(TASK_REFRESH_UTXOS, 'done')

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('success.authkeyCreation'),
                txid
            }
        }).onOk(() => {
            if (returnTo.value) router.replace(returnTo.value)
        })

    } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.log(error)
    } finally {
        stopLoader(1000)
    }
}

watch(() => wallet.value.ready, async (ready, readyPrev) => {
    if (ready !== readyPrev) {
        utxos.value = await wallet.value.getUtxos()
    }
})

onMounted(async () => {
    if (wallet.value.ready) {
        utxos.value = await wallet.value.getUtxos()
    }
})


</script>

<style scoped lang="scss">
.border-radius-12 {
    border-radius: 12px;
}

.authkey-banner {
    background: rgba(255, 193, 7, 0.08);
    border: 1px solid rgba(255, 193, 7, 0.35);
}
</style>