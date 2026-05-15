<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-card flat bordered>
                    <q-card-section class="flex justify-between items-center">
                        <div class="flex items-center no-wrap">
                            <q-avatar><q-icon name="key" color="warning"></q-icon></q-avatar>
                            <div class="text-h5 text-bold">Create Authkey</div>
                        </div>
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
                        <q-btn label="Create AuthKey" color="primary" class="full-width" @click="onCreateAuthKey" />
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
import { useWizardConnect } from 'src/composables/useWizardConnect'
import { delay } from 'mainnet-js-v3'
import { createAuthkey, createGenesisInput } from 'src/core/transaction'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { broadcast } from 'src/core/transaction/broadcast'
import { UtxoWithPath } from 'src/core/types'

const $q = useQuasar()
const {
    externalWallet,
    wzDappMgr
} = useWizardConnect()

const { t } = useI18n()

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
    const loadingGroup = $q.loading.show({
        group: 'cakp1-lg',
        message: t('info.preparingTx')
    })

    try {
        if (!externalWallet.value?.ready) {
            $q.notify({
                message: 'Wallet not ready'
            })
            return
        }

        const utxos = await externalWallet.value.getUtxos()
        const genesisInputSignReq = createGenesisInput({
            funderUtxos: utxos,
        })

        loadingGroup({
            message: t('transaction.waitingForSignature')
        })

        const response = await wzDappMgr.value.signTransaction(genesisInputSignReq);

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
                        statusText: t('success.genesisInputCreation'),
                        txid: broadcastResult.txid
                    }
                })
            } else {
                throw new Error(broadcastResult.error)
            }
        }

    } catch (error) {
        console.log(error)
        $q.notify({
            type: 'Error',
            message: t('error.genesisInputCreation')
        })
    } finally {
        loadingGroup()
    }
}

const onCreateAuthKey = async () => {

    const loadingGroup = $q.loading.show({
        group: 'cakp2-lg',
        message: t('info.preparingTx')
    })

    try {

        if (!externalWallet.value?.ready) {

            $q.notify({
                message: t('info.walletNotReady')
            })

            return
        }

        const utxos = await externalWallet.value.getUtxos()
        const recipientAddress = externalWallet.value.getDepositAddress(0)

        const signRequest = createAuthkey({
            genesisInputId: `${genesisInputCandidate.value!.txid}:${genesisInputCandidate.value!.vout}` as `${string}:${number}`,
            utxos: utxos,
            authKeyRecipientAddress: recipientAddress,
            network: import.meta.env.VITE_BCH_NETWORK
        })

        console.log('SIGN REQUEST', signRequest)
        loadingGroup({
            message: t('info.waitingForSignature')
        })

        const response = await wzDappMgr.value.signTransaction(signRequest);

        loadingGroup({
            message: t('info.broadcastingTx')
        })

        const broadcastResponse = await broadcast(response.signedTransaction)

        if (broadcastResponse.ok) {
            const broadcastResult = await broadcastResponse.json()
            $q.dialog({
                component: TransactionStatusDialog,
                componentProps: {
                    statusType: 'success',
                    statusText: t('success.authkeyCreation'),
                    txid: broadcastResult.txid
                }
            })
        }

    } catch (error) {
        console.log(error)
    } finally {
        loadingGroup()
    }
}

watch(() => externalWallet.value.ready, async (ready, readyPrev) => {
    if (ready !== readyPrev) {
        utxos.value = await externalWallet.value.getUtxos()
    }
})

onMounted(async () => {
    if (externalWallet.value.ready) {
        utxos.value = await externalWallet.value.getUtxos()
    }
})


</script>