<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back to Collections" color="grey-4"
                        @click="router.push('/issuer/nft-collections')" />
                </div>
                <div v-if="authhead" class="bg-dark border-radius-12 q-pa-lg">
                    <div class="row items-center q-gutter-x-md q-mb-lg">
                        <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="authhead.identitySnapshot?.uris?.icon"
                                :src="ipfsToGatewayUrl(authhead.identitySnapshot?.uris?.icon)!" fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs token-symbol">
                                {{ authhead.identitySnapshot?.token?.symbol || "Unknown" }}
                            </div>
                            <div class="text-caption">
                                {{ authhead.identitySnapshot?.name || 'Unnamed Collection' }}
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <div class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Token ID
                            </div>
                            <div
                                class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                {{ authhead.token!.category }}
                                <CopyText :text="authhead.token!.category" />
                            </div>
                        </div>

                        <div class="col-12 col-sm-6">
                            <div class="flex items-center q-gutter-x-md">
                                <FormField>
                                    <label class="text-caption text-grey-5 text-uppercase">
                                        Capability
                                    </label>
                                    <q-chip v-if="authhead.token?.nft?.capability === 'minting'" color="purple-10"
                                        text-color="purple-2"
                                        class="text-uppercase text-caption q-px-sm q-py-xs border-radius-4">
                                        <q-icon name="auto_awesome" size="14px" class="q-mr-xs" />
                                        Minting
                                    </q-chip>
                                    <q-chip v-else-if="authhead.token?.nft?.capability === 'mutable'" color="teal-10"
                                        text-color="teal-2"
                                        class="text-uppercase text-caption q-px-sm q-py-xs border-radius-4">
                                        <q-icon name="published_with_changes" size="14px" class="q-mr-xs" />
                                        Mutable
                                    </q-chip>
                                    <q-chip v-else-if="authhead.token?.nft?.capability === 'none'" color="grey-9"
                                        text-color="grey-4"
                                        class="text-uppercase text-caption q-px-sm q-py-xs border-radius-4">
                                        <q-icon name="lock_outline" size="14px" class="q-mr-xs" />
                                        Immutable
                                    </q-chip>
                                </FormField>
                                <FormField>
                                    <label class="text-caption text-grey-5 text-uppercase" style="letter-spacing: 1px;">
                                        Collection Type
                                    </label>
                                    <q-chip
                                        v-if="(authhead.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection)?.bytecode"
                                        color="green-10" text-color="green-2"
                                        class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">

                                        Parsable
                                    </q-chip>
                                    <q-chip v-else color="yellow-10" text-color="yellow-2"
                                        class="text-uppercase text-caption q-py-xs border-radius-4 text-center">
                                        <q-icon name="pin" size="xs" class="q-mr-xs" dense />
                                        Sequential
                                    </q-chip>
                                </FormField>
                            </div>

                        </div>

                        <div v-if="authhead.identitySnapshot?.description" class="col-12">
                            <div class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Description
                            </div>
                            <div class="text-body2 text-grey-3">
                                {{ authhead.identitySnapshot.description }}
                            </div>
                        </div>

                        <div v-if="authhead.identitySnapshot?.uris?.web" class="col-12">
                            <div class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Website:
                            </div>
                            <div class="flex items-center q-gutter-x-sm q-mt-xs">
                                <q-btn v-if="authhead.identitySnapshot.uris.web" flat dense icon="language"
                                    color="primary" label="Website" :href="authhead.identitySnapshot.uris.web"
                                    target="_blank" />
                            </div>
                        </div>
                    </div>

                    <div class="row q-mt-lg q-gutter-x-sm">
                        <q-btn color="primary" icon="mdi-send" label="Mint Child NFT" unelevated
                            @click="openMintPage" />
                        <q-btn color="orange" icon="mdi-fire" label="Burn" unelevated outline
                            @click="openMintChildNftDialog('burn')" />
                    </div>
                </div>

                <div v-else class="flex flex-center q-py-xl">
                    <q-spinner color="primary" size="48px" />
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useAuthguardStore } from 'src/stores/authguard'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { shortenTokenId } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import { UtxoWithPath } from 'src/core/types'
import { transferFungibleReserves, jsonFormSafeUtxoReviver, jsonReplacer } from 'src/core/transaction'
import { Network } from 'cashscript'
import { decodeCashAddress } from '@bitauth/libauth'
import { broadcast } from 'src/core/transaction/broadcast'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import FungibleReservesTransferDialog from 'src/components/dialogs/FungibleReservesTransferDialog.vue'
import { delay } from 'mainnet-js-v3'
import { useAppStore } from 'src/stores/app'
import FormField from 'src/components/FormField.vue'
import { ParsableNftCollection } from 'src/core/bcmr/bcmr-v2.schema'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const {
    manager,
    wallet,
} = useWizardConnectWallet()

const authhead = computed(() => activeAuthhead.value)

const openMintPage = () => {
    appStore.setActiveMinter(authhead.value)
    router.push('/issuer/nft-collections/' + authhead.value!.token?.category + '/mint')
}

const openMintChildNftDialog = (action: 'issuance' | 'burn') => {
    const v = authhead.value
    if (!v) return

    if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient BCH balance'
        })
    }

    const componentProps = {
        transferType: action,
        issuerUtxo: v,
        identitySnapshot: v.identitySnapshot,
    } as any

    if (action === 'issuance') {
        componentProps.selfAddress = wallet.value.getTokenDepositAddress(0)
    } else if (action === 'burn') {
        const sampleAddress = wallet.value.getTokenDepositAddress(0)
        const sampleDecodedAddress = decodeCashAddress(sampleAddress)
        if (typeof (sampleDecodedAddress) === 'string') {
            throw new Error(sampleDecodedAddress)
        }
        componentProps.burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`
    }

    $q.dialog({
        component: FungibleReservesTransferDialog,
        componentProps,
        focus: 'none'
    }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {

        const loadingGroup = $q.loading.show({
            group: 'issue-fungible-reserves-loading-group',
            message: 'Preparing. Checking wallet for inputs...'
        })

        const issuerTokenUtxo = JSON.parse(
            JSON.stringify(v, jsonReplacer),
            jsonFormSafeUtxoReviver,
        )

        try {
            let recipientAddress = userInputs.recipient
            if (action === 'burn') {
                recipientAddress = componentProps.burnAddress
            }
            const signRequest = transferFungibleReserves({
                issuerTokenUtxo,
                authkeyUtxo: issuerTokenUtxo.authkey,
                recipientAddress: recipientAddress,
                transferTokenAmount: userInputs.tokenAmount,
                network: import.meta.env.VITE_BCH_NETWORK as Network,
                funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
                transferType: action
            })

            loadingGroup({
                message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
            })
            const response = await manager.value!.signTransaction(signRequest);

            loadingGroup({
                message: 'Broadcasting transaction, please wait...'
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
                            statusText: `Fungible token successfully ${action === 'issuance' ? 'issued' : 'burned'} from FT reserves`,
                            txid: broadcastResult.txid
                        }
                    })
                } else {
                    throw new Error(broadcastResult.error)
                }
            }
        } catch (error: any) {
            console.log('error', error)
            $q.notify({
                type: 'Error',
                message: error.message
            })
        } finally {
            loadingGroup()
        }
    })
}

onMounted(() => {
    if (!authhead.value) {
        router.push('/issuer/nft-collections')
    }
})
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
</style>
