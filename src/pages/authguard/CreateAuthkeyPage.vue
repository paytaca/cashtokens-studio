<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-card flat bordered class="feature-card-bg rounded-borders q-mt-xl q-py-md">
                    <q-card-section class="flex justify-between items-center">
                        <q-card-title
                            class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm q-pa-lg">
                            <span>Create Authkey NFT</span>
                            <q-icon name="key" size="lg" color="warning" style="transform: rotate(-25deg);" />
                        </q-card-title>
                        <q-btn @click="$q.dialog({
                            class: 'q-py-sm text-body1 text-justify',
                            html: true,
                            message: t('info.authkeyTokenIdCandidateExplainer')
                        })" flat no-caps dense text-color="secondary">
                            {{ t('info.whatsThis') }}
                        </q-btn>
                    </q-card-section>
                    <q-card-section>
                        <q-form class="q-gutter-y-md" greedy>
                            <q-input label="AuthKey Token Id Candidate" type="textarea"
                                :model-value="genesisInputCandidate?.txid || hint" class="full-width" :hint="hint"
                                filled readonly autogrow bottom-slots>
                                <template v-slot:prepend>
                                    <q-icon name="key"></q-icon>
                                </template>
                                <template v-slot:append>
                                    <q-btn v-if="!genesisInputCandidate?.txid" @click="onGenerateGenesisInput"
                                        text-color="primary" no-caps flat>Generate</q-btn>
                                </template>
                            </q-input>
                            <q-input label="Commitment" type="textarea" model-value="00" class="full-width" filled
                                readonly autogrow bottom-slots />
                            <q-input label="Capability" type="textarea" model-value="none" class="full-width" filled
                                readonly autogrow bottom-slots />
                        </q-form>
                    </q-card-section>
                    <q-card-actions class="q-mt-lg">
                        <q-btn label="Create AuthKey" color="primary" class="full-width" @click="onCreateAuthKey"
                            rounded no-caps size="lg" />
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
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { createAuthkey, createGenesisInput } from 'src/core/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { UtxoWithPath } from 'src/core/types'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { createAuthguardContract } from 'src/core/authguard'
import { subscribe } from 'src/services/watchtower'
import { broadcastTransaction } from 'src/services/transaction'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils'

const $q = useQuasar()
const {
    wallet,
    manager
} = useWizardConnectWallet()

const { t } = useI18n()

const { startLoader, updateStep, stopLoader } = useCancelableLoadingDialog()

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
    startLoader(txTaskList)

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

        const response = await manager.value?.signTransaction(genesisInputSignReq);

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

    } catch (error) {
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
    startLoader(txTaskList)

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

        const response = await manager.value?.signTransaction(signRequest);

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
        })

    } catch (error) {
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