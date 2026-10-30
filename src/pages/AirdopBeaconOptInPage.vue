<template>
    <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
        <div class="q-px-md q-px-md-xl content-container q-mt-xl q-gutter-y-lg">
            <ExplainerBanner class="q-my-md" icon="mdi-parachute" :title="$t('airdropBeaconOptInPage.pageTitle')"
                :description="$t('airdropBeaconOptInPage.pageSubtitle')" explainer="info.airdropOptInExplainer" />
            <q-card class="q-pa-lg rounded-borders">
                <q-banner v-if="!beaconConfigured" class="bg-warning text-dark rounded-borders">
                    {{ $t('airdropBeaconOptInPage.comingSoon') }}
                </q-banner>
                <div v-else-if="wallet?.getDepositAddress?.(0)" class="q-gutter-y-lg">
                    <q-banner>
                        Once you have the Airdrop Beacon
                        NFT, your address will be whitelisted as recipient to future airdrops in Cashtokens
                        Studio
                    </q-banner>
                    <FormField>
                        <label>Your Address</label>
                        <q-input :model-value="wallet?.getDepositAddress?.(0)" outlined readonly></q-input>
                    </FormField>
                    <FormField>
                        <label>Beacon NFT Category</label>
                        <q-input :model-value="getBeaconNftTokenCategory()" outlined readonly class="ellipsis"
                            autogrow></q-input>
                    </FormField>
                    <div class="flex justify-end">
                        <q-btn color="primary" @click="onSubmit" no-caps>Claim Airdrop Beacon NFT</q-btn>
                    </div>
                </div>
            </q-card>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { ref, onMounted, triggerRef } from 'vue';
import { BaseWallet, NetworkType } from 'mainnet-js';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { db } from 'src/core/client-db';
import { useWalletSigner } from 'src/composables/useWalletSigner';
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog';
import { broadcastTransaction } from 'src/services/transaction';
import {
    TASK_BROADCASTING,
    TASK_INPUTS_CHECK,
    TASK_PREPARE_TX,
    TASK_REFRESH_UTXOS,
    TASK_WAIT_FOR_SIG,
    TASK_WAITING_PROPAGATION,
    txTaskList
} from 'src/utils';
import { createAirdropBeaconContract } from 'src/core/airdrop/create-airdrop-beacon-contract';
import { AIRDROP_NFT_ADMIN_ID, getBeaconNftTokenCategory, optInToAirdrops } from 'src/core/airdrop';
import { subscribe } from 'src/services/watchtower';
import FormField from 'src/components/FormField.vue';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue';

const { t } = useI18n();
const $q = useQuasar();
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog();
const { wallet, signTransaction } = useWalletSigner();
/** The opt-in needs both the beacon category and the contract's admin id; without either the
    page renders its "coming soon" state and never touches the chain. */
const beaconConfigured = Boolean(
    import.meta.env.VITE_AIRDROP_BEACON_TOKEN_CATEGORY && import.meta.env.VITE_AIRDROP_BEACON_ADMIN_ID
)
const airdropBeaconContract = ref()
const airdropBeaconContractSidecarNfts = ref()

const onSubmit = async () => {
    if (!beaconConfigured) return

    const genesisTaskList = [
        ...txTaskList,
    ]

    startLoader(genesisTaskList, () => {
        $q.notify({ type: 'warning', message: 'Cancelled by user' })
    })

    try {

        const beaconNftTokenCategory = getBeaconNftTokenCategory()

        const walletutxos = await wallet.value?.getUtxos() || []

        const beaconNftExists = walletutxos.find((u) => u.token?.category === beaconNftTokenCategory)

        if (beaconNftExists) {
            return $q.notify({
                message: 'You already have and Airdrop Beacon NFT on your wallet.'
            })
        }

        if (!wallet?.value?.utxos || wallet.value?.utxos?.length === 0) {
            return $q.notify({
                type: 'Error',
                message: 'Insufficient balance'
            })
        }

        const recipientAddress = wallet.value.getTokenDepositAddress(0)
        // Best effor watchtower subscription
        subscribe(recipientAddress).catch()

        updateStep(TASK_INPUTS_CHECK, 'done')

        updateStep(TASK_PREPARE_TX, 'running')

        const optInRequest = await optInToAirdrops({
            airdropBeaconTokenCategory: beaconNftTokenCategory,
            airdropBeaconAdminId: AIRDROP_NFT_ADMIN_ID,
            recipientAddress,
            walletUtxos: walletutxos
        })

        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')

        let response: any = {}

        response = await signTransaction(optInRequest, { signal: getSignal() });

        updateStep(TASK_WAIT_FOR_SIG, 'done')
        updateStep(TASK_BROADCASTING, 'running')

        const [broadcastError, txid] = await broadcastTransaction({
            transactionHex: response.signedTransaction,
            network: import.meta.env.VITE_BCH_NETWORK,
            onProgress: (progress: string) => {
                const task = genesisTaskList.find(t => t.id === TASK_BROADCASTING)
                const newLabel = task!.label?.replace(/\s*\(.*?\)/g, `(${progress})`)
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
        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: txid
        })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'done')

        await db.saveActivity({
            event: `Claimed Airdrop Beacon NFT`,
            txid: txid,
            status: 'success'
        })

        triggerRef(wallet)

        updateStep(TASK_REFRESH_UTXOS, 'done')

        stopLoader(1000)

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: 'Aidrop Beacon NFT sent to your wallet',
                txid: txid
            }
        })

    } catch (error: any) {
        if (error?.name === 'AbortError') {
            stopLoader(4000)
            return
        }
        stopLoader(4000)
        $q.notify({
            type: 'Error',
            message: 'Error creating transaction: ' + error
        })
    }

}

onMounted(async () => {
    // Guarded: without the env config there is no contract to introspect, and the page shows its
    // "coming soon" banner instead.
    if (!beaconConfigured) return
    airdropBeaconContract.value = createAirdropBeaconContract({
        beaconTokenCategory: import.meta.env.VITE_AIRDROP_BEACON_TOKEN_CATEGORY,
        beaconAdminId: import.meta.env.VITE_AIRDROP_BEACON_ADMIN_ID,
        network: import.meta.env.VITE_BCH_NETWORK
    })
    airdropBeaconContractSidecarNfts.value = await airdropBeaconContract.value.getUtxos()
})

</script>

<style scoped></style>