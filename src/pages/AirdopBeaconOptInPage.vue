<template>
    <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
        <div class="q-px-md q-px-md-xl content-container q-mt-xl q-gutter-y-lg">
            <ExplainerBanner class="q-my-md" avatar-src="/images/airdrop-beacon-icon.png"
                :title="$t('airdropBeaconOptInPage.pageTitle')" :description="$t('airdropBeaconOptInPage.pageSubtitle')"
                explainer="info.airdropOptInExplainer" />
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
                        <label>Airdrop Beacon NFT</label>
                        <q-input :model-value="getBeaconNftTokenCategory()" outlined readonly class="ellipsis"
                            label="Category" autogrow></q-input>
                    </FormField>
                    <FormField>
                        <label>Your Token Address</label>
                        <q-input :model-value="recipientAddress" outlined readonly>
                            <template #prepend>
                                <q-btn v-if="recipientAddress" flat dense round size="sm" icon="qr_code_2"
                                    color="grey-5"
                                    @click="openQrDialog(recipientAddress, { title: $t('dashboard.qr.tokenTitle'), icon: '/images/cashtokens.svg' })">
                                    <q-tooltip>{{ $t('dashboard.wallet.showQr') }}</q-tooltip>
                                </q-btn>
                            </template>
                        </q-input>
                        <div v-if="recipientAddress" class="text-caption q-mt-sm"
                            :class="hasRecipientBch ? 'text-grey-5' : 'text-negative'">
                            {{ $t('airdropBeaconOptInPage.recipientBalance') }}:
                            {{ formatBch(recipientBalance) }} BCH
                        </div>
                        <div v-if="recipientAddress && !hasRecipientBch" class="text-negative text-caption">
                            {{ $t('airdropBeaconOptInPage.fundRecipientFirst') }}
                        </div>
                    </FormField>

                    <div class="flex justify-end">
                        <q-btn color="primary" @click="onSubmit" no-caps
                            icon="img:/images/airdrop-beacon-icon.png">Claim Airdrop Beacon
                            NFT</q-btn>
                    </div>
                </div>
            </q-card>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, ref, onMounted, triggerRef } from 'vue';
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
import {
    AIRDROP_NFT_ADMIN_ID,
    getBeaconNftTokenCategory,
    optInToAirdrops,
    selectOptInFunding,
    type OptInFundingSelection
} from 'src/core/airdrop';
import type { UtxoWithPath } from 'src/core/types';
import { subscribe } from 'src/services/watchtower';
import FormField from 'src/components/FormField.vue';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue';
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue';

const { t } = useI18n();
const $q = useQuasar();
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog();
const { wallet, signTransaction, utxosVersion } = useWalletSigner();
/** The opt-in needs both the beacon category and the contract's admin id; without either the
    page renders its "coming soon" state and never touches the chain. */
const beaconConfigured = Boolean(
    import.meta.env.VITE_AIRDROP_BEACON_TOKEN_CATEGORY && import.meta.env.VITE_AIRDROP_BEACON_ADMIN_ID
)
const airdropBeaconContract = ref()
const airdropBeaconContractSidecarNfts = ref()

/**
 * Mirrors the selection the builder will use, so the page shows the actual NFT destination.
 * Reading `utxosVersion` keeps this reactive when the wallet replaces its UTXO set in place.
 */
const fundingSelection = computed<OptInFundingSelection | undefined>(() => {
    void utxosVersion.value
    const activeWallet = wallet.value
    if (!activeWallet) return undefined

    return selectOptInFunding({
        walletUtxos: (activeWallet.utxos ?? []) as UtxoWithPath[],
        walletType: activeWallet.getWalletType(),
        defaultRecipientAddress: activeWallet.getTokenDepositAddress(0),
    })
})

const recipientAddress = computed(() =>
    fundingSelection.value?.recipientAddress || wallet.value?.getTokenDepositAddress?.(0) || ''
)
const recipientBalance = computed(() => fundingSelection.value?.recipientBalance ?? 0n)
const hasRecipientBch = computed(() => recipientBalance.value > 0n)

const formatBch = (satoshis: bigint) => {
    const bch = Number(satoshis) / 100_000_000
    return bch.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
}

function openQrDialog(address: string, options: { title: string, icon: string }) {
    $q.dialog({
        component: QrCodeModal,
        componentProps: {
            contents: address,
            title: options.title,
            icon: options.icon,
            subtitle: t('dashboard.qr.subtitle'),
            copyLabel: t('dashboard.qr.copyLabel'),
        },
    })
}

const onSubmit = async () => {
    if (!beaconConfigured) return

    const activeWallet = wallet.value
    if (!activeWallet) return

    const beaconNftTokenCategory = getBeaconNftTokenCategory()
    const walletutxos = (await activeWallet.getUtxos()) as UtxoWithPath[]

    const beaconNftExists = walletutxos.find((u) => u.token?.category === beaconNftTokenCategory)

    if (beaconNftExists) {
        return $q.notify({
            message: 'You already have and Airdrop Beacon NFT on your wallet.'
        })
    }

    const funding = selectOptInFunding({
        walletUtxos: walletutxos,
        walletType: activeWallet.getWalletType(),
        defaultRecipientAddress: activeWallet.getTokenDepositAddress(0),
    })

    if (!funding.success || funding.recipientBalance === 0n) {
        return $q.notify({
            type: 'warning',
            message: t('airdropBeaconOptInPage.fundRecipientFirst')
        })
    }

    const genesisTaskList = [
        ...txTaskList,
    ]

    startLoader(genesisTaskList, () => {
        $q.notify({ type: 'warning', message: 'Cancelled by user' })
    })

    try {
        // Best effort watchtower subscription
        subscribe(funding.recipientAddress).catch()

        updateStep(TASK_INPUTS_CHECK, 'done')

        updateStep(TASK_PREPARE_TX, 'running')

        const optInRequest = await optInToAirdrops({
            airdropBeaconTokenCategory: beaconNftTokenCategory,
            airdropBeaconAdminId: AIRDROP_NFT_ADMIN_ID,
            recipientAddress: funding.recipientAddress,
            funderInput: funding.funderInput,
            feeUtxos: funding.feeUtxos,
            network: import.meta.env.VITE_BCH_NETWORK
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