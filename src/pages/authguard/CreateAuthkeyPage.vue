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
                            message: t('info.createAuthkeyNftExplainer')
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
                            :disable="!genesisInputCandidate?.txid" @click="onCreateAuthKey" rounded />
                    </q-card-actions>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { BaseWallet, NetworkType } from 'mainnet-js'
import { createAuthkey, createGenesisInput } from 'src/core/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import FormField from 'src/components/FormField.vue'
import { UtxoWithPath } from 'src/core/types'
import { useWalletSigner } from 'src/composables/useWalletSigner'
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
    utxosVersion,
    signTransaction
} = useWalletSigner()

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
/** Outpoint created by the last genesis-input broadcast, preferred over any other vout-0 UTXO. */
const pendingGenesisOutpoint = ref<string>()

/** Blocking poll after a broadcast: 10 × 1.5s, enough for the wallet's watcher to catch up. */
const GENESIS_POLL_ATTEMPTS = 10
const GENESIS_POLL_INTERVAL_MS = 1500
/** Background poll while the page stays open: 24 × 5s, so it heals without a reload. */
const GENESIS_BACKGROUND_ATTEMPTS = 24
const GENESIS_BACKGROUND_INTERVAL_MS = 5000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const outpointOf = (utxo: UtxoWithPath) => `${utxo.txid}:${utxo.vout}`

/**
 * Re-reads the wallet's UTXO set and publishes it to the page.
 *
 * `sync` is not optional here: without it the wallet replays the snapshot it cached when it
 * initialised (same array reference), so an output broadcast a moment ago can never show up.
 * A wallet that is not ready yet leaves the page on its last known list instead of blanking it.
 */
const refreshUtxos = async (): Promise<UtxoWithPath[]> => {
    if (!wallet.value?.ready) return utxos.value

    const snapshot = (await wallet.value.getUtxos({ sync: true })) as UtxoWithPath[]
    utxos.value = snapshot
    return snapshot
}

/**
 * The genesis input must be an unspent, token-free output at index 0 — its txid becomes the
 * Authkey's token category. The freshly generated outpoint wins over any older vout-0 UTXO.
 */
const pickGenesisInput = (list: UtxoWithPath[], preferredOutpoint?: string): UtxoWithPath | undefined => {
    const candidates = list.filter((utxo) => !utxo.token && utxo.vout === 0)
    const preferred = preferredOutpoint
        ? candidates.find((utxo) => outpointOf(utxo) === preferredOutpoint)
        : undefined

    return preferred ?? candidates.sort((u1, u2) => Number(u2.satoshis) - Number(u1.satoshis))[0]
}

const genesisInputCandidate = computed<UtxoWithPath | undefined>(() => {
    return pickGenesisInput(utxos.value, pendingGenesisOutpoint.value)
})

const hint = computed(() => {
    if (genesisInputCandidate.value?.txid) {
        return t('info.authkeyTokenIdCandidateHint')
    }
    if (pendingGenesisOutpoint.value) {
        return t('info.genesisInputIndexing')
    }
    return t('info.authkeyTokenIdCandidateNotFoundHint')
})

let genesisPollTimer: ReturnType<typeof setTimeout> | undefined

const stopGenesisPolling = () => {
    if (genesisPollTimer) clearTimeout(genesisPollTimer)
    genesisPollTimer = undefined
}

/**
 * Keeps checking until the wallet's electrum watcher reports the new output.
 *
 * The transaction is already broadcast, so this only drives the page: polling means the candidate
 * appears on its own instead of the user having to reload.
 */
const pollForGenesisInput = (outpoint: string, attemptsLeft = GENESIS_BACKGROUND_ATTEMPTS) => {
    stopGenesisPolling()

    genesisPollTimer = setTimeout(async () => {
        genesisPollTimer = undefined
        await refreshUtxos()

        if (utxos.value.some((utxo) => outpointOf(utxo) === outpoint)) return
        if (attemptsLeft <= 1) return

        pollForGenesisInput(outpoint, attemptsLeft - 1)
    }, GENESIS_BACKGROUND_INTERVAL_MS)
}

/**
 * Blocking poll used while the loader is up; returns whether the wallet has seen `outpoint` yet.
 */
const awaitGenesisInput = async (outpoint: string): Promise<boolean> => {
    for (let attempt = 1; attempt <= GENESIS_POLL_ATTEMPTS; attempt++) {
        await refreshUtxos()
        if (utxos.value.some((utxo) => outpointOf(utxo) === outpoint)) return true
        if (attempt < GENESIS_POLL_ATTEMPTS) await delay(GENESIS_POLL_INTERVAL_MS)
    }

    return false
}

onUnmounted(stopGenesisPolling)

const onGenerateGenesisInput = async () => {
    startLoader(txTaskList, () => {
        $q.notify({ type: 'warning', message: t('info.cancelled') })
    })

    try {
        updateStep(TASK_INPUTS_CHECK, 'running')

        if (!wallet.value?.ready) {
            updateStep(TASK_INPUTS_CHECK, 'failed')
            $q.notify({
                type: 'negative',
                message: t('info.walletNotReady')
            })
            return
        }

        const walletUtxos = await refreshUtxos()

        updateStep(TASK_INPUTS_CHECK, 'done')
        updateStep(TASK_PREPARE_TX, 'running')

        const genesisInputSignReq = createGenesisInput({
            funderUtxos: walletUtxos,
            recipientAddress: wallet.value.getDepositAddress(0)
        })

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        const signal = getSignal()
        const response = await signTransaction(genesisInputSignReq, { signal });

        // The user cancelled while the wallet had the request: the run is over, so nothing else
        // may happen — continuing here is how a cancelled flow used to keep broadcasting.
        if (signal?.aborted) return

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
        updateStep(TASK_REFRESH_UTXOS, 'running', t('info.genesisInputIndexing'))

        const genesisOutpoint = `${txid}:0`
        pendingGenesisOutpoint.value = genesisOutpoint

        const genesisInputSeen = await awaitGenesisInput(genesisOutpoint)

        updateStep(TASK_REFRESH_UTXOS, 'done')

        if (!genesisInputSeen) {
            // The transaction is on the wire; only the wallet's watcher is behind. Keep looking in
            // the background so the candidate appears without the user having to reload.
            pollForGenesisInput(genesisOutpoint)
            $q.notify({ type: 'info', message: t('info.genesisInputPending') })
        }

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
        $q.notify({
            type: 'negative',
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
                type: 'negative',
                message: t('info.walletNotReady')
            })
            return
        }

        const walletUtxos = await refreshUtxos()

        // Re-read before signing: the candidate must still be unspent, and what the page showed may
        // predate the wallet's latest sync.
        const genesisInput = pickGenesisInput(walletUtxos, pendingGenesisOutpoint.value)
        if (!genesisInput) {
            updateStep(TASK_INPUTS_CHECK, 'failed')
            $q.notify({ type: 'negative', message: t('info.authkeyTokenIdCandidateNotFoundHint') })
            return
        }

        const recipientAddress = wallet.value.getDepositAddress(0)

        updateStep(TASK_INPUTS_CHECK, 'done')
        updateStep(TASK_PREPARE_TX, 'running')

        const signRequest = createAuthkey({
            genesisInputId: `${genesisInput.txid}:${genesisInput.vout}` as `${string}:${number}`,
            utxos: walletUtxos,
            authKeyRecipientAddress: recipientAddress,
            network: import.meta.env.VITE_BCH_NETWORK
        })

        const authguard = createAuthguardContract({
            authkeyTokenId: genesisInput.txid,
            network: import.meta.env.VITE_BCH_NETWORK
        })

        // Best effort watchtower subscription
        subscribe(authguard.address).catch(() => undefined)

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        const signal = getSignal()
        const response = await signTransaction(signRequest, { signal });

        // Cancelled while the wallet had the request: stop here instead of carrying on to broadcast.
        if (signal?.aborted) return

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

        // The genesis input is spent by now, so it can no longer be the next Authkey's candidate.
        pendingGenesisOutpoint.value = undefined
        await refreshUtxos()

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
        console.error(error)
        $q.notify({
            type: 'negative',
            message: t('error.authkeyCreation')
        })
    } finally {
        stopLoader(1000)
    }
}

watch(() => wallet.value?.ready, async (ready, readyPrev) => {
    if (ready !== readyPrev) {
        await refreshUtxos()
    }
})

// Background syncs, reconnects and provider swaps all land here: the wallet publishes them without
// poking its own ref, so without this the page would stay on its mount-time snapshot.
watch(utxosVersion, async () => {
    await refreshUtxos()
})

onMounted(async () => {
    await refreshUtxos()
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