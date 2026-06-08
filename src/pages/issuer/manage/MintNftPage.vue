<template>
    <q-page class="bg-black text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back to Collection" color="grey-4"
                        @click="router.push('/issuer/nft-collection/' + authhead?.token?.category)" />
                </div>

                <div v-if="authhead" class="bg-dark border-radius-12 q-pa-lg">
                    <div class="row items-center q-gutter-x-md q-mb-lg">
                        <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="authhead.identitySnapshot?.uris?.icon"
                                :src="ipfsToGatewayUrl(authhead.identitySnapshot?.uris?.icon)!" fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div>
                            <div class="token-symbol text-h4 text-weight-bold text-white">
                                {{ authhead.identitySnapshot?.name || 'Unnamed Collection' }}
                            </div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs">
                                <span class="text-h6 text-weight-medium text-primary token-symbol">
                                    {{ authhead.identitySnapshot?.token?.symbol || '?' }}
                                </span>
                                <span class="text-grey-7">•</span>
                                <span class="text-caption text-grey-5 text-mono">
                                    {{ shortenTokenId(authhead.token!.category) }}
                                    <CopyText :text="authhead.token!.category" />
                                </span>
                            </div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs">
                                <q-badge v-if="authhead.token?.nft?.capability === 'minting'" color="purple-10"
                                    text-color="purple-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Minting
                                </q-badge>
                                <q-badge v-else-if="authhead.token?.nft?.capability === 'mutable'" color="teal-10"
                                    text-color="teal-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Mutable
                                </q-badge>
                                <q-badge v-else color="grey-9" text-color="grey-4"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Immutable
                                </q-badge>
                                <q-badge v-if="isSequential" color="yellow-10" text-color="yellow-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Sequential
                                </q-badge>
                                <q-badge v-else color="green-10" text-color="green-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Parsable
                                </q-badge>
                            </div>
                            <div v-if="isSequential && lastMintedCommitment !== undefined" class="q-mt-xs">
                                <span class="text-caption text-grey-5">Last minted seq: </span>
                                <span class="text-caption text-mono text-white">
                                    {{ formatCommitmentValue(lastMintedCommitment) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <q-form class="q-gutter-y-md">
                        <div>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Mint Strategy
                            </label>
                            <q-select v-model="mintStrategy" :options="strategyOptions" outlined dark class="q-mb-sm"
                                label="I want to" stack-label emit-value map-options />
                        </div>

                        <div>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Number of NFTs to mint
                            </label>
                            <q-input v-model.number="mintQuantity" type="number" :min="1" outlined dark />
                        </div>

                        <template v-if="mintStrategy === MINT_NEXT_SEQUENCE">
                            <div>
                                <label class="text-caption text-grey-5 text-uppercase q-mb-xs"
                                    style="letter-spacing: 1px;">
                                    {{ isSequential ? 'Sequence #' : 'NFT Type' }}
                                </label>
                                <q-input :model-value="isSequential ? nextSequence : customHex" outlined dark disable>
                                    <template v-slot:hint>
                                        <span class="text-grey-6">
                                            {{ isSequential ? 'Next sequence number' : 'Bottom AltStack hex' }}
                                        </span>
                                    </template>
                                </q-input>
                                <div v-if="isSequential"
                                    class="text-caption text-grey-5 q-mt-xs flex items-center q-gutter-x-xs">
                                    <q-icon name="info" size="14px" color="info" />
                                    <span>{{ t('mint.nextSequenceHint', { start: mintRange.start, end: mintRange.end })
                                        }}</span>
                                </div>
                            </div>
                        </template>

                        <template v-else-if="mintStrategy === MINT_A_TYPE">
                            <div v-if="isSequential">
                                <label class="text-caption text-grey-5 text-uppercase q-mb-xs"
                                    style="letter-spacing: 1px;">
                                    Sequence #
                                </label>
                                <q-input v-model.number="customSequence" type="number"
                                    placeholder="Enter sequence number" outlined dark>
                                    <template v-slot:hint>
                                        <q-icon name="warning" color="warning" class="q-mr-xs" size="14px" />
                                        <span class="text-grey-6">{{ t('mint.uniquenessWarning') }}</span>
                                    </template>
                                </q-input>
                                <div v-if="customSequence !== undefined && customSequence !== null"
                                    class="text-caption text-grey-5 q-mt-xs flex items-center q-gutter-x-xs">
                                    <q-icon name="info" size="14px" color="info" />
                                    <span>{{ t('mint.particularSequenceHint', { quantity: mintQuantity, seq: customSequence }) }}</span>
                                </div>
                            </div>
                            <div v-else>
                                <label class="text-caption text-grey-5 text-uppercase q-mb-xs"
                                    style="letter-spacing: 1px;">
                                    NFT Type (Hex)
                                </label>
                                <q-input v-model="customHex" placeholder="Enter bottom altstack hex" outlined dark
                                    :rules="[v => !v || /^[0-9a-fA-F]+$/.test(v) || 'Must be hex']" />
                            </div>
                        </template>

                        <template v-else-if="mintStrategy === MINT_ANOTHER_MINTER">
                            <div class="text-caption text-grey-6 q-mb-sm flex items-center q-gutter-x-xs">
                                <q-icon name="warning" color="warning" size="14px" />
                                <span>{{ t('mint.mintingCapabilityHint') }}</span>
                            </div>
                        </template>

                        <div>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Capability
                            </label>
                            <q-input :model-value="resolvedCapability" outlined dark disable>
                                <template v-slot:append>
                                    <q-icon name="edit_off" color="grey-6" />
                                </template>
                            </q-input>
                        </div>

                        <div>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Recipient
                            </label>
                            <q-input v-model="recipient" outlined dark placeholder="Enter token address">
                                <template v-slot:append>
                                    <q-btn v-if="!recipient" dense flat label="Self" color="warning"
                                        @click="setSelfRecipient" />
                                </template>
                            </q-input>
                        </div>

                        <div class="flex justify-end q-gutter-x-sm q-mt-lg">
                            <q-btn outline label="Cancel" color="grey-4"
                                @click="router.push('/issuer/nft-collection/' + authhead?.token?.category)" />
                            <q-btn unelevated color="primary" label="Mint" icon="construction" :loading="minting"
                                @click="mint" />
                        </div>
                    </q-form>
                </div>

                <div v-else class="flex flex-center q-py-xl">
                    <q-spinner color="primary" size="48px" />
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthguardStore } from 'src/stores/authguard'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { shortenTokenId } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import { UtxoWithPath } from 'src/core/types'
import { mintNfts } from 'src/core/transaction/mint-nfts'
import { broadcast } from 'src/core/transaction/broadcast'
import { decodeCashAddress } from '@bitauth/libauth'
import { delay } from 'mainnet-js-v3'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { ParsableNftCollection } from 'src/core/bcmr/bcmr-v2.schema'

const MINT_NEXT_SEQUENCE = 'Mint next sequence'
const MINT_A_TYPE = 'Mint a particular NFT type'
const MINT_ANOTHER_MINTER = 'Mint another minter'

const $q = useQuasar()
const router = useRouter()
const { t } = useI18n()

const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const {
    manager,
    wallet,
} = useWizardConnectWallet()

const authhead = computed(() => activeAuthhead.value)

const isSequential = computed(() =>
    !(authhead.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection)?.bytecode
)

const lastMintedCommitment = computed(() => {
    return authhead.value?.token?.nft?.commitment
})

const formatCommitmentValue = (commitment: string) => {
    const num = parseInt(commitment, 16)
    if (!isNaN(num)) return `#${num}`
    return commitment
}

const strategyOptions = computed(() => {
    if (isSequential.value) {
        return [
            { value: MINT_NEXT_SEQUENCE, label: MINT_NEXT_SEQUENCE },
            { value: MINT_A_TYPE, label: 'Mint a particular sequence #' },
            { value: MINT_ANOTHER_MINTER, label: MINT_ANOTHER_MINTER },
        ]
    }
    return [
        { value: MINT_A_TYPE, label: MINT_A_TYPE },
    ]
})

const mintStrategy = ref(MINT_NEXT_SEQUENCE)
const mintQuantity = ref(1)
const customSequence = ref<number>()
const customHex = ref('')
const recipient = ref('')
const minting = ref(false)

const nextSequence = computed(() => {
    if (!isSequential.value) return 0
    const lastCommit = lastMintedCommitment.value
    if (!lastCommit) return 1
    const num = parseInt(lastCommit, 16)
    if (isNaN(num)) return 1
    return num + 1
})

const mintRange = computed(() => {
    const start = nextSequence.value
    const end = start + mintQuantity.value - 1
    return { start, end }
})

const resolvedCapability = computed(() => {
    if (mintStrategy.value === MINT_ANOTHER_MINTER) return 'minting'
    return 'none'
})

const setSelfRecipient = () => {
    if (wallet.value) {
        recipient.value = wallet.value.receive!.getTokenDepositAddress(0)
    }
}

const mint = async () => {
    const v = authhead.value
    if (!v || !wallet.value?.utxos || wallet.value.utxos.length === 0) {
        $q.notify({ type: 'Error', message: 'Insufficient BCH balance' })
        return
    }

    if (!recipient.value) {
        $q.notify({ type: 'Error', message: 'Please enter a recipient address' })
        return
    }

    minting.value = true

    let commitment = ''
    let newMinterCommitment: string | undefined

    if (mintStrategy.value === MINT_NEXT_SEQUENCE) {
        const seq = nextSequence.value
        commitment = seq.toString(16).padStart(64, '0')
        newMinterCommitment = commitment
    } else if (mintStrategy.value === MINT_A_TYPE) {
        if (isSequential.value) {
            const seq = customSequence.value || 0
            commitment = seq.toString(16).padStart(64, '0')
        } else {
            commitment = customHex.value || ''
        }
    } else if (mintStrategy.value === MINT_ANOTHER_MINTER) {
        commitment = ''
    }

    try {
        const decodedRecipient = decodeCashAddress(recipient.value)
        if (typeof decodedRecipient === 'string') {
            throw new Error('Invalid recipient address')
        }

        const signRequest = mintNfts({
            minterUtxo: v,
            authkeyUtxo: v.authkey,
            recipientAddress: recipient.value,
            commitment,
            capability: resolvedCapability.value as 'none' | 'mutable' | 'minting',
            mintQuantity: mintQuantity.value,
            newMinterCommitment,
            network: import.meta.env.VITE_BCH_NETWORK as any,
            funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
        })

        const response = await manager.value!.signTransaction(signRequest)
        const broadcastResponse = await broadcast(response.signedTransaction)

        if (broadcastResponse.ok) {
            const broadcastResult = await broadcastResponse.json()
            if (broadcastResult.success) {
                await delay(2000)
                $q.dialog({
                    component: TransactionStatusDialog,
                    componentProps: {
                        statusType: 'success',
                        statusText: `${mintQuantity.value} NFT(s) minted successfully`,
                        txid: broadcastResult.txid
                    }
                }).onDismiss(() => {
                    router.push('/issuer/nft-collection/' + v.token?.category)
                })
            } else {
                throw new Error(broadcastResult.error)
            }
        }
    } catch (error: any) {
        console.log('mint error', error)
        $q.notify({ type: 'Error', message: error.message })
    } finally {
        minting.value = false
    }
}

onMounted(() => {
    if (!authhead.value) {
        router.push('/issuer/nft-collections')
    }
    if (wallet.value) {
        recipient.value = wallet.value.getTokenDepositAddress(0)
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

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}

.q-form>div {
    width: 100%;
}
</style>
