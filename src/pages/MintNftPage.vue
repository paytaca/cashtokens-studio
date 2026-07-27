<template>
    <q-page class="bg-dark-page text-grey-2">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-btn flat icon="arrow_back" label="Back" color="grey-4" @click="router.back()" class="q-mb-md" />

                <q-card v-if="minter" flat class="bg-dark q-pa-lg rounded-borders">
                    <q-card-title class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm q-mb-lg">
                        <span>Mint NFT</span>
                        <q-icon name="mdi-pickaxe" size="lg" />

                    </q-card-title>
                    <div class="row items-center no-wrap q-gutter-x-md q-mb-lg">
                        <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="minter.identitySnapshot?.uris?.icon"
                                :src="ipfsToGatewayUrl(minter.identitySnapshot?.uris?.icon)!" fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div class="col">
                            <div class="flex items-center q-gutter-x-xs q-mb-xs">
                                <span class="text-h6 text-weight-medium text-grey-2">{{
                                    minter.identitySnapshot?.token?.symbol || '?' }}</span>
                            </div>
                            <div class="flex items-center q-gutter-x-xs">
                                <q-badge v-if="minter.token?.nft?.capability === 'minting'" color="dark"
                                    text-color="purple-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                                    Minting
                                </q-badge>
                                <q-badge v-else-if="minter.token?.nft?.capability === 'mutable'" color="dark"
                                    text-color="teal-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="edit" size="10px" class="q-mr-xs" />
                                    Mutable
                                </q-badge>
                                <q-badge v-else color="dark" text-color="grey-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="lock" size="10px" class="q-mr-xs" />
                                    Immutable
                                </q-badge>
                                <q-badge v-if="isSequentialNftCollection" color="dark" text-color="orange-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="mdi-counter" size="10px" class="q-mr-xs" />
                                    Sequential
                                </q-badge>
                                <q-badge v-else color="dark" text-color="blue-6"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="mdi-hexadecimal" size="10px" class="q-mr-xs" />
                                    Parsable
                                </q-badge>
                            </div>
                        </div>
                    </div>
                    <FormField>
                        <label>Category</label>
                        <div class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                            {{ minter.token!.category }}
                            <CopyText :text="minter.token!.category" />
                        </div>
                    </FormField>
                    <FormField v-if="isSequentialNftCollection && lastMintedCommitment !== undefined">
                        <label>Last Minted Sequence #</label>
                        <div class="row items-center bg-dark rounded-borders q-px-md q-py-xs font-mono"
                            style="min-height: 40px;">
                            <q-chip color="accent" text-color="white" class="text-weight-bold">
                                {{ formatCommitmentValue(lastMintedCommitment) }}
                            </q-chip>

                            <div class="row items-center text-caption text-grey-5 q-ml-sm">
                                <span class="icon-badge-hex">
                                    &lt;0x{{ lastMintedCommitment }}&gt;
                                </span>
                                <q-tooltip class="bg-grey-9 text-white">Raw on-chain state value</q-tooltip>
                            </div>
                        </div>

                    </FormField>

                    <q-form v-if="isParsableNftCollection">
                        <!-- TODO -->
                        <FormField>
                            <label>NFT Type (Hex)</label>
                            <q-input v-model="customHex" placeholder="Enter bottom altstack hex" outlined dark
                                :rules="[v => !v || /^[0-9a-fA-F]+$/.test(v) || 'Must be hex']" />
                        </FormField>
                    </q-form>
                    <q-form v-else>
                        <FormField>
                            <label>Mint Option</label>
                            <q-select v-model="mintStrategy" :options="strategyOptions" outlined dark label="I want to"
                                stack-label emit-value map-options />
                        </FormField>
                        <FormField>
                            <label>Number of NFTs to mint</label>
                            <q-input v-model.number="mintQuantity" type="number" :min="1" outlined dark />
                        </FormField>
                        <FormField v-if="mintStrategy === MINT_NEXT_SEQUENCE">
                            <label>Sequence #</label>
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
                                <label>Sequence #</label>
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
                            <label>Capability</label>
                            <q-input :model-value="resolvedCapability" outlined dark disable>
                                <template v-slot:append>
                                    <q-icon name="edit_off" color="grey-6" />
                                </template>
                            </q-input>
                        </FormField>

                        <FormField>
                            <label>Recipient</label>
                            <q-input v-model="recipient" outlined dark placeholder="Enter token address" clearable>
                                <template v-slot:append>
                                    <q-btn v-if="!recipient" dense flat label="Self" color="warning"
                                        @click="setSelfRecipient" />
                                </template>
                            </q-input>
                        </FormField>
                        <div class="flex justify-end q-gutter-x-sm q-mt-lg">
                            <q-btn label="Cancel" flat text-color="primary" @click="router.back()" />
                            <q-btn color="primary" label="Mint" icon="mdi-pickaxe" :loading="minting" @click="mint" />
                        </div>
                    </q-form>

                </q-card>
                <div v-else class="flex flex-center q-py-xl">
                    <q-spinner color="primary" size="48px" />
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, triggerRef } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { type Output as TransactionOutput } from 'cashscript'
import { useAuthguardStore } from 'src/stores/authguard'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'
import { DecoratedUtxo, UtxoWithAuthKey, UtxoWithPath } from 'src/core/types'
import { mintNextNftSequence, mintNftSequence, mintNftMinters, isBroadcastSuccess } from 'src/core/transaction'
import { broadcast } from 'src/core/transaction/broadcast'
import { decodeCashAddress, vmNumberToBigInt } from '@bitauth/libauth'
import { BaseWallet, delay, hexToBin, NetworkType } from 'mainnet-js-v3'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { NftType, ParsableNftCollection, SequentialNftCollection } from 'src/core/bcmr/bcmr-v2.schema'
import { type SignTransactionRequest } from '@wizardconnect/core'
import FormField from 'components/FormField.vue'
import { useAppStore } from 'src/stores/app'
import { db } from 'src/core/client-db'
import { broadcastTransaction } from 'src/services/transaction'
const MINT_NEXT_SEQUENCE = 'Mint next sequence'
const MINT_A_SEQUENCE_NUMBER = 'Mint a particular NFT type'
const MINT_ANOTHER_MINTER = 'Mint another minter'

const $q = useQuasar()
const router = useRouter()
const { t } = useI18n()


const authguardStore = useAuthguardStore()
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const appStore = useAppStore()
const { activeMinter } = storeToRefs(appStore)
const wizardConnectWallet = inject('wizardConnectWallet') as any

const { manager, wallet } = wizardConnectWallet

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
    if (!isNaN(num)) return `${num}`
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
    const loadingGroup = $q.loading.show({
        group: 'mnpm-lg',
        message: 'Uploading registry to IPFS...'
    })


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

        const { mintOutputs, ...restOfSignRequest } = signRequest

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

        const category = minter.value!.token!.category
        const identitySnapshotRecord = await db.identitySnapshot
            .where('category')
            .equals(category)
            .first()

        if (!identitySnapshotRecord) {
            throw new Error('Registry identity snapshot not found')
        }

        const { contentHash, authbase, timestamp } = identitySnapshotRecord

        const types: string[] = []
        for (const [commitment, nft] of Object.entries(nftCollection.types)) {
            types.push(commitment)
            await db.createNftRecord({
                contentHash,
                authbase,
                timestamp,
                category,
                type: commitment,
                nft
            })
        }

        loadingGroup({ message: 'Waiting for approval, please check your wallet...' })

        const response = await manager.value!.signTransaction(restOfSignRequest)

        loadingGroup({ message: 'Broadcasting, please wait...' })

        const [broadcastError, txid] = await broadcastTransaction({
            transactionHex: response.signedTransaction,
            network: import.meta.env.VITE_BCH_NETWORK,
            onProgress: (progress: string) => {
                loadingGroup({ message: progress })
            }
        })

        if (broadcastError) throw broadcastError




        // await db.setNftRecordsPublished({
        //     contentHash,
        //     authbase,
        //     timestamp,
        //     types
        // })

        loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
        })

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet

        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: txid
        })

        await db.saveActivity({
            event: `Mint ${mintOutputs.length} ${activeMinter.value?.identitySnapshot?.token?.symbol || activeMinter.value!.token!.category} NFT ${mintOutputs.length > 1 ? 's' : ''}`,
            txid: txid,
            status: 'success'
        })

        loadAuthkeys(wallet.value, true).then(() => {
            triggerRef(wallet)
        })

        await updateActiveAuthhead()

        loadingGroup()

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: `${mintQuantity.value} NFT(s) minted successfully`,
                txid
            }
        }).onDismiss(() => {

            if (activeMinter.value?.isAuthhead) {
                return router.push(`/issuer/nft-collections/${activeMinter.value.token!.category}`)
            }

            if (wallet.value.receive!.getTokenDepositAddress(0) === recipient.value) {
                return router.push({
                    name: 'nfts',
                    query: {
                        timestamp,
                        contentHash,
                        authbase
                    }
                })
            }
            router.push('/dashboard')
        })
    } catch (error: any) {
        $q.notify({ type: 'Error', message: error.message })
    } finally {
        minting.value = false
        loadingGroup()
    }
}

onMounted(async () => {
    if (!minter.value) {
        router.back()
        return
    }
    if (wallet.value) {
        recipient.value = wallet.value.getTokenDepositAddress(0)
    }
})

onBeforeUnmount(() => {
    appStore.setActiveMinter(undefined)
})
</script>

<style scoped lang="scss">
.border-radius-8 {
    border-radius: 8px;
}

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}

.styled-capability-badge {
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.q-form>div {
    width: 100%;
}
</style>
