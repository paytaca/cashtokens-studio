<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back to Collection" color="grey-4"
                        @click="router.push('/issuer/nft-collections/' + minter?.token?.category)" />
                </div>

                <div v-if="minter" class="bg-dark border-radius-12 q-pa-lg">
                    <div class="row items-center q-gutter-x-md q-mb-lg">
                        <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="minter.identitySnapshot?.uris?.icon"
                                :src="ipfsToGatewayUrl(minter.identitySnapshot?.uris?.icon)!" fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs">
                                <span class="text-h6 text-weight-medium text-primary token-symbol">
                                    {{ minter.identitySnapshot?.token?.symbol || '?' }}
                                </span>
                            </div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs">
                                <span class="text-caption">{{ shortenTokenId(minter.token!.category) }}</span>
                                <CopyText :text="minter.token!.category" />
                            </div>
                            <div class="flex items-center q-gutter-x-xs q-mt-xs">
                                <q-badge v-if="minter.token?.nft?.capability === 'minting'" color="purple-10"
                                    text-color="purple-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Minting
                                </q-badge>
                                <q-badge v-else-if="minter.token?.nft?.capability === 'mutable'" color="teal-10"
                                    text-color="teal-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Mutable
                                </q-badge>
                                <q-badge v-else color="grey-9" text-color="grey-4"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Immutable
                                </q-badge>
                                <q-badge v-if="isSequentialNftCollection" color="yellow-10" text-color="yellow-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Sequential
                                </q-badge>
                                <q-badge v-else color="green-10" text-color="green-2"
                                    class="text-uppercase text-caption q-px-xs q-py-xs border-radius-4">
                                    Parsable
                                </q-badge>
                            </div>
                            <div v-if="isSequentialNftCollection && lastMintedCommitment !== undefined" class="q-mt-xs">
                                <span class="text-caption text-grey-5">
                                    Last minted seq: {{ lastMintedCommitment || 'None' }}
                                </span>
                                <span class="text-caption text-mono text-white">
                                    {{ formatCommitmentValue(lastMintedCommitment) }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <q-form v-if="isParsableNftCollection">
                        <!-- TODO -->
                        <FormField>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                NFT Type (Hex)
                            </label>
                            <q-input v-model="customHex" placeholder="Enter bottom altstack hex" outlined dark
                                :rules="[v => !v || /^[0-9a-fA-F]+$/.test(v) || 'Must be hex']" />
                        </FormField>
                    </q-form>
                    <q-form v-else class="q-gutter-y-md">
                        <FormField>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Mint Option
                            </label>
                            <q-select v-model="mintStrategy" :options="strategyOptions" outlined dark class="q-mb-sm"
                                label="I want to" stack-label emit-value map-options />
                        </FormField>
                        <FormField>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Number of NFTs to mint
                            </label>
                            <q-input v-model.number="mintQuantity" type="number" :min="1" outlined dark />
                        </FormField>
                        <FormField v-if="mintStrategy === MINT_NEXT_SEQUENCE">
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Sequence #
                            </label>
                            <q-input v-if="mintQuantity === 1" :model-value="`#${mintRange.start}`" outlined dark
                                disable>
                                <template v-slot:hint>
                                    <span class="text-grey-6">
                                        {{ $t('label.sequenceNoHint') }}
                                    </span>
                                </template>
                            </q-input>
                            <q-input v-if="mintQuantity > 1" :model-value="`#${mintRange.start} - #${mintRange.end}`"
                                outlined disable>
                                <template v-slot:hint>
                                    <span class="text-grey-6">
                                        {{ $t('label.sequenceNoHint') }}
                                    </span>
                                </template>
                            </q-input>

                            <div class="text-caption text-grey-5 q-mt-xs flex items-center q-gutter-x-xs">
                                <q-icon name="info" size="14px" color="info" />
                                <span>
                                    {{ t('mint.nextSequenceHint', { start: mintRange.start, end: mintRange.end }) }}
                                </span>
                            </div>
                        </FormField>

                        <template v-else-if="mintStrategy === MINT_A_SEQUENCE_NUMBER">
                            <FormField>
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
                                    <span>
                                        {{ t('mint.particularSequenceHint', {
                                            quantity: mintQuantity, seq: customSequence
                                        }) }}
                                    </span>
                                </div>
                            </FormField>

                        </template>

                        <template v-else-if="mintStrategy === MINT_ANOTHER_MINTER">
                            <div class="text-caption text-grey-6 q-mb-sm flex items-center q-gutter-x-xs">
                                <q-icon name="warning" color="warning" size="14px" />
                                <span>{{ t('mint.mintingCapabilityHint') }}</span>
                            </div>
                        </template>

                        <FormField>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Capability
                            </label>
                            <q-input :model-value="resolvedCapability" outlined dark disable>
                                <template v-slot:append>
                                    <q-icon name="edit_off" color="grey-6" />
                                </template>
                            </q-input>
                        </FormField>

                        <FormField>
                            <label class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                                Recipient
                            </label>
                            <q-input v-model="recipient" outlined dark placeholder="Enter token address" clearable>
                                <template v-slot:append>
                                    <q-btn v-if="!recipient" dense flat label="Self" color="warning"
                                        @click="setSelfRecipient" />
                                </template>
                            </q-input>
                        </FormField>
                        <div class="flex justify-end q-gutter-x-sm q-mt-lg">
                            <q-btn outline label="Cancel" color="grey-4"
                                @click="router.push('/issuer/nft-collection/' + minter.token!.category)" />
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
import { type Output as TransactionOutput } from 'cashscript'
import { useAuthguardStore } from 'src/stores/authguard'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { shortenTokenId } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import { AuthheadUtxo, DecoratedUtxo, UtxoWithAuthKey, UtxoWithPath } from 'src/core/types'
import { mintNextNftSequence, mintNftSequence, mintNftMinters } from 'src/core/transaction'
import { broadcast } from 'src/core/transaction/broadcast'
import { decodeCashAddress, vmNumberToBigInt } from '@bitauth/libauth'
import { delay, hexToBin } from 'mainnet-js-v3'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { NftType, ParsableNftCollection, SequentialNftCollection } from 'src/core/bcmr/bcmr-v2.schema'
import { type SignTransactionRequest } from '@wizardconnect/core'
import FormField from 'components/FormField.vue'
import { useAppStore } from 'src/stores/app'
import { setNftUnrevealedCtsExtension } from 'src/core/bcmr/utils'
const MINT_NEXT_SEQUENCE = 'Mint next sequence'
const MINT_A_SEQUENCE_NUMBER = 'Mint a particular NFT type'
const MINT_ANOTHER_MINTER = 'Mint another minter'

const $q = useQuasar()
const router = useRouter()
const { t } = useI18n()

const authguardStore = useAuthguardStore()
const appStore = useAppStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { activeMinter } = storeToRefs(appStore)
const {
    manager,
    wallet,
} = useWizardConnectWallet()

const minter = computed<DecoratedUtxo | undefined>(() => activeMinter.value)

const isSequentialNftCollection = computed(() =>
    !(minter.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection)?.bytecode
)

const isParsableNftCollection = computed(() =>
    (minter.value?.identitySnapshot?.token?.nfts?.parse as ParsableNftCollection)?.bytecode?.length >= 2
)

const lastMintedCommitment = computed(() => {
    return minter.value?.token?.nft?.commitment
})

const formatCommitmentValue = (commitment: string) => {
    const num = parseInt(commitment, 16)
    if (!isNaN(num)) return `#${num}`
    return commitment
}

const strategyOptions = computed(() => {
    if (isSequentialNftCollection.value) {
        return [
            { value: MINT_NEXT_SEQUENCE, label: MINT_NEXT_SEQUENCE },
            { value: MINT_A_SEQUENCE_NUMBER, label: 'Mint a particular sequence #' },
            { value: MINT_ANOTHER_MINTER, label: MINT_ANOTHER_MINTER },
        ]
    }
    return [
        { value: MINT_A_SEQUENCE_NUMBER, label: MINT_A_SEQUENCE_NUMBER },
    ]
})

const mintStrategy = ref(MINT_NEXT_SEQUENCE)
const mintQuantity = ref(1)
const customSequence = ref<number>()
const customHex = ref('')
const recipient = ref('')
const minting = ref(false)

const nextSequence = computed(() => {
    if (!isSequentialNftCollection.value) return 0
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

const mintSequence = async (): Promise<SignTransactionRequest & { mintOutputs: TransactionOutput[] }> => {
    return mintNftSequence({
        minterUtxo: minter.value!,
        authkeyUtxo: minter.value?.authkey,
        sequenceNo: customSequence.value || 0,
        mintQuantity: mintQuantity.value,
        recipient: recipient.value,
        capability: 'none',
        network: import.meta.env.VITE_BCH_NETWORK as any,
        funderUtxos: (wallet.value?.utxos || []) as UtxoWithPath[],
    })
}

const mintNextSequence = async (): Promise<SignTransactionRequest & { mintOutputs: TransactionOutput[] }> => {
    return mintNextNftSequence({
        minterUtxo: minter.value!,
        authkeyUtxo: minter.value?.authkey,
        mintQuantity: mintQuantity.value,
        recipient: recipient.value,
        capability: 'none',
        network: import.meta.env.VITE_BCH_NETWORK as any,
        funderUtxos: (wallet.value?.utxos || []) as UtxoWithPath[],
    })
}

const mintMinter = async (): Promise<SignTransactionRequest & { mintOutputs: TransactionOutput[] }> => {
    return mintNftMinters({
        minterUtxo: minter.value!,
        authkeyUtxo: minter.value?.authkey,
        mintQuantity: mintQuantity.value,
        recipient: recipient.value,
        network: import.meta.env.VITE_BCH_NETWORK as any,
        funderUtxos: (wallet.value?.utxos || []) as UtxoWithPath[],
    })
}

const mint = async () => {

    try {
        const decodedRecipient = decodeCashAddress(recipient.value)
        if (typeof decodedRecipient === 'string') {
            throw new Error('Invalid recipient address')
        }

        let signRequest: SignTransactionRequest & { mintOutputs: TransactionOutput[] }

        switch (mintStrategy.value) {
            case MINT_NEXT_SEQUENCE:
                signRequest = await mintNextSequence()
                break
            case MINT_A_SEQUENCE_NUMBER:
                signRequest = await mintSequence()
                break
            case MINT_ANOTHER_MINTER:
                signRequest = await mintMinter()
                break
            default:
                throw new Error('Invalid mint strategy')
        }

        const { mintOutputs } = signRequest

        const nftCollection: SequentialNftCollection = {
            types: {}
        }

        mintOutputs.forEach((output: TransactionOutput) => {
            let nftName = `${minter.value?.identitySnapshot?.token?.symbol || 'Unnamed NFT'}`
            if (output.token?.nft?.commitment) {
                const sequenceNumber = vmNumberToBigInt(hexToBin(output.token.nft.commitment))
                nftName = `${nftName} #${Number(sequenceNumber)}`
            }
            const nft: NftType = {
                name: nftName,
            }
            nftCollection.types[output.token!.nft!.commitment] = nft
        })

        console.log('Minter', minter.value)
        console.log('MInt outputs', mintOutputs)
        return
        //TODO: update the registry add this nfts

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
                    router.push('/issuer/nft-collection/' + minter.value!.token!.category)
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
    if (!minter.value) {
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
