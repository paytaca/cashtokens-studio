<template>
    <q-page class="bg-dark-page text-grey-2">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-btn flat icon="arrow_back" label="Back" color="grey-4" @click="router.back()" class="q-mb-md" />
                <q-card class="bg-dark q-pa-lg rounded borders" flat>
                    <q-card-title class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm q-mb-lg">
                        <span>Token </span>
                        <q-icon name="mdi-information" size="lg" />

                    </q-card-title>
                    <div class="row items-center no-wrap q-gutter-x-md q-mb-lg">
                        <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="localSnapshot.uris?.icon" :src="ipfsToGatewayUrl(localSnapshot.uris.icon)!"
                                fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div class="col">
                            <div class="flex items-center q-gutter-x-xs q-mb-xs">
                                <span class="text-h6 text-weight-medium text-grey-2">
                                    {{
                                        localSnapshot.token?.symbol ||
                                        '?'
                                    }}
                                </span>
                            </div>
                            <div class="flex items-center q-gutter-x-xs">
                                <q-badge v-if="tokenType === 'mixed'" color="dark" text-color="orange-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                                    Mixed Token
                                </q-badge>
                                <q-badge v-else-if="tokenType === 'nft'" color="dark" text-color="blue-6"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="token" size="10px" class="q-mr-xs" />
                                    NFT
                                </q-badge>
                                <q-badge v-else-if="tokenType === 'fungible'" color="dark" text-color="green-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="money" size="10px" class="q-mr-xs" />
                                    Fungible Token
                                </q-badge>
                                <q-badge v-if="activeAuthhead?.token?.nft?.capability === 'minting'" color="dark"
                                    text-color="purple-4"
                                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                    <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                                    Minting
                                </q-badge>
                            </div>
                        </div>
                        <q-btn round dense flat icon="more_vert" color="grey-4" size="sm">
                            <q-menu dark auto-close>
                                <q-list dense>
                                    <q-item v-if="showMint" clickable @click="mintNft">
                                        <q-item-section style="white-space: nowrap;">Mint NFT</q-item-section>
                                    </q-item>
                                    <q-item v-if="showReleaseReserves" clickable
                                        @click="() => releaseReserves('issuance')">
                                        <q-item-section style="white-space: nowrap;">Release</q-item-section>
                                    </q-item>
                                    <q-item v-if="showReleaseReserves" clickable @click="() => releaseReserves('burn')">
                                        <q-item-section style="white-space: nowrap;">Burn</q-item-section>
                                    </q-item>
                                </q-list>
                            </q-menu>
                        </q-btn>
                    </div>

                    <div class="row"><q-btn class="text-caption link-style" text-color="secondary" icon="description"
                            @click="viewRegistry" no-caps dense>
                            View Metadata Registry
                        </q-btn></div>

                    <FormField>
                        <label>Category</label>
                        <div class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                            {{ activeAuthhead?.token?.category || localSnapshot.token?.category }}
                            <CopyText :text="activeAuthhead?.token?.category || localSnapshot.token?.category || ''" />
                        </div>
                    </FormField>

                    <FormField>
                        <label>Name / Description</label>
                        <div class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                            {{ localSnapshot.name }} - {{ localSnapshot.description }}
                        </div>
                    </FormField>
                    <FormField v-if="showDecimals">
                        <div class="flex items-center q-gutter-x-md"><label for="">Decimals</label>
                            <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                                {{ localSnapshot.token!.decimals === undefined ? '?' :
                                    localSnapshot.token!.decimals }}
                            </q-badge>
                        </div>
                    </FormField>

                    <FormField v-if="hasNfts">
                        <label>NFT Collection</label>
                        <!-- <q-input :model-value="nftCollectionType" input-class="text-h6 text-weight-bold text-white"
                            class="text-mono">
                            <template v-slot:append>
                                <div class="flex no-wrap q-gutter-x-sm">
                                    <q-btn no-caps color="primary" icon="token" label="View NFTs" @click="viewNfts"
                                        dense />
                                    <q-btn v-if="showMint" icon="mdi-pickaxe" color="primary" size="md" @click="mintNft"
                                        dense no-wrap>
                                        <span class="gt-xs q-ml-xs">Mint</span>
                                    </q-btn>
                                </div>
                            </template>
</q-input> -->
                        <div class="flex justify-between">
                            <div
                                class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                {{ nftCollectionType
                                }}</div>
                            <div class="flex no-wrap q-gutter-x-sm">
                                <q-btn text-color="secondary" icon="preview" label="View NFTs" @click="viewNfts" />
                                <q-btn v-if="showMint" icon="mdi-pickaxe" color="primary" @click="mintNft" no-wrap>
                                    <span class="gt-xs q-ml-xs">Mint</span>
                                </q-btn>
                            </div>
                        </div>
                    </FormField>

                    <FormField v-if="showReleaseReserves && activeAuthhead">
                        <label class="text-bold text-h6">Fungible Reserves</label>
                        <!-- <q-input :model-value="formatTokenAmount(
                            activeAuthhead.token?.amount ?? 0,
                            localSnapshot.token!.symbol || '?',
                            localSnapshot.token!.decimals,
                            'none'
                        )" input-class="text-h6 text-weight-bold text-white" class="text-mono">
                            <template v-slot:append>
                                <div class="flex no-wrap q-gutter-sm">
                                    <q-btn flat dense no-wrap icon="mdi-fire" color="orange" size="md"
                                        @click="() => releaseReserves('burn')">
                                        <span class="gt-xs q-ml-xs">Burn</span>
                                    </q-btn>
                                    <q-btn dense no-wrap icon="mdi-send-circle-outline" color="primary" size="md"
                                        @click="() => releaseReserves('issuance')">
                                        <span class="gt-xs q-ml-xs">Release</span>
                                    </q-btn>

                                </div>
                            </template>
                        </q-input> -->
                        <div class="flex justify-between no-wrap">
                            <div
                                class="text-mono text-h6 text-bold  text-bch bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                {{ formatTokenAmount(
                                    activeAuthhead.token?.amount ?? 0,
                                    localSnapshot.token!.symbol || '?',
                                    localSnapshot.token!.decimals,
                                    'suffix'
                                )
                                }}
                            </div>
                            <div class="flex no-wrap q-gutter-sm">
                                <q-btn flat dense no-wrap icon="mdi-fire" color="orange" size="md"
                                    @click="() => releaseReserves('burn')">
                                    <span class="gt-xs q-ml-xs">Burn</span>
                                </q-btn>
                                <q-btn dense no-wrap icon="mdi-send-circle-outline" color="primary" size="md"
                                    @click="() => releaseReserves('issuance')">
                                    <span class="gt-xs q-ml-xs">Release</span>
                                </q-btn>
                            </div>
                        </div>
                    </FormField>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, triggerRef } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthguardStore } from 'src/stores/authguard'
import { useAppStore } from 'src/stores/app'
import type { IdentitySnapshot, ParsableNftCollection } from 'src/core/bcmr/bcmr-v2.schema'
import type { DecoratedUtxo, UtxoWithPath } from 'src/core/types'
import { shortenTokenId, getTokenType, formatTokenAmount } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import FormField from 'components/FormField.vue'
import CopyText from 'src/components/CopyText.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { useQuasar } from 'quasar'
import { decodeCashAddress } from '@bitauth/libauth'
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue'
import { broadcast, isBroadcastSuccess, jsonFormSafeUtxoReviver, jsonReplacer, transferFungibleReserves } from 'src/core/transaction'
import { Network } from 'cashscript'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { db } from 'src/core/client-db'

const $q = useQuasar()
const router = useRouter()
const authguardStore = useAuthguardStore()
const { loadAuthkeys } = authguardStore
const appStore = useAppStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { wallet, manager } = useWizardConnectWallet()

const category = computed(() => activeAuthhead.value?.token?.category || '')

function cloneSnapshot(source?: IdentitySnapshot): IdentitySnapshot {
    if (source) {
        return JSON.parse(JSON.stringify(source))
    }

    const identitySnapshot: IdentitySnapshot = {
        name: '',
        description: '',
        token: {
            category: '',
            symbol: '',
            decimals: 0,
        },
        uris: {
            icon: '',
        },
    }

    if (activeAuthhead.value?.token?.nft) {
        identitySnapshot.token!.nfts = {
            description: '',
            parse: {
                types: {}
            }
        }
    }

    return identitySnapshot
}

const localSnapshot = ref<IdentitySnapshot>(cloneSnapshot(activeAuthhead.value?.identitySnapshot))

const tokenType = computed(() => {
    if (!activeAuthhead.value) return 'Unknown'
    return getTokenType(activeAuthhead.value)
})

const reservedSupply = computed(() => {
    console.log('activeAuthhead.value?.token?.amount', activeAuthhead.value?.token?.amount)
    let amount: string | bigint = activeAuthhead.value?.token?.amount ?? 0n
    let decimals = localSnapshot.value.token?.decimals ?? 0
    return formatTokenAmount(amount ?? 0, localSnapshot.value.token?.symbol || '', decimals)
    // if (amount == null) return null
    // try {
    //     return BigInt(amount).toLocaleString()
    // } catch {
    //     return String(amount)
    // }
})

const hasNfts = computed(() => !!localSnapshot.value?.token?.nfts)

const nftCollectionType = computed(() => {
    const bytecode = (localSnapshot.value?.token?.nfts?.parse as ParsableNftCollection)?.bytecode
    return bytecode && bytecode.length > 2 ? 'Parsable' : 'Sequential'
})

const viewNfts = () => {

    const category = activeAuthhead?.value?.identitySnapshot?.token?.category || activeAuthhead.value?.token?.category
    if (category) {
        appStore.setActiveMinter(activeAuthhead.value)
        router.push({
            name: 'authhead-nft-collection',
            params: { category },
        })
    }
}

const showDecimals = computed(() => {
    if (!activeAuthhead.value) return false
    const type = getTokenType(activeAuthhead.value)
    return type === 'fungible' || type === 'mixed'
})

const showMint = computed(() => activeAuthhead.value?.token?.nft?.capability === 'minting')

const showReleaseReserves = computed(() => {
    const amount = activeAuthhead.value?.token?.amount
    return amount != null && BigInt(amount) > 0n
})

const originalSnapshotJson = ref('')

const snapshotModified = ref(false)

watch(localSnapshot, () => {
    const current = JSON.stringify(localSnapshot.value)
    snapshotModified.value = current !== originalSnapshotJson.value
}, { deep: true })

const mintNft = () => {
    if (activeAuthhead.value) {
        appStore.setActiveMinter(activeAuthhead.value as DecoratedUtxo)
    }
    router.push({ name: 'authhead-mint-nft', params: { category: category.value } })
}

const releaseReserves = (action: 'issuance' | 'burn') => {
    if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient BCH balance'
        })
    }

    const componentProps: Record<string, any> = {
        transferType: action,
        tokenCategory: activeAuthhead.value!.token!.category,
        balance: BigInt(activeAuthhead.value!.token!.amount),
        decimals: activeAuthhead.value!.identitySnapshot?.token?.decimals ?? 0,
        identitySnapshot: activeAuthhead.value!.identitySnapshot,
    }
    if (action === 'issuance') {
        componentProps.selfAddress = wallet.value.getTokenDepositAddress(0)
    } else if (action === 'burn') {
        componentProps.burnAddress = import.meta.env.VITE_BURN_ADDRESS
    }

    $q.dialog({
        component: FungibleTransferDialog,
        componentProps,
        focus: 'none'
    }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {

        const loadingGroup = $q.loading.show({
            group: 'issue-fungible-reserves-loading-group',
            message: 'Preparing. Checking wallet for inputs...'
        })

        const issuerTokenUtxo = activeAuthhead.value as DecoratedUtxo
        try {
            let recipientAddress = userInputs.recipient
            if (action === 'burn') {
                recipientAddress = componentProps.burnAddress
            }
            const signRequest = transferFungibleReserves({
                issuerTokenUtxo,
                authkeyUtxo: issuerTokenUtxo.authkey as DecoratedUtxo,
                recipientAddress: recipientAddress,
                transferTokenAmount: userInputs.tokenAmount,
                network: import.meta.env.VITE_BCH_NETWORK as Network,
                funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
                transferType: action,
                feeRateSatsPerKb: BigInt(import.meta.env.VITE_TX_FEE_RATE_SATS_PER_KB)
            })

            loadingGroup({
                message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
            })
            const response = await manager.value!.signTransaction(signRequest);

            loadingGroup({
                message: 'Broadcasting transaction, please wait...'
            })

            const broadcastResponse = await broadcast(response.signedTransaction)

            if (!broadcastResponse.ok) throw new Error('Error broadcasting transaction')

            const broadcastResult = await broadcastResponse.json()

            if (!isBroadcastSuccess(broadcastResult)) throw new Error(broadcastResult.error)

            loadingGroup({
                message: 'Broadcast success, awaiting tx propagation...'
            })

            const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
            await (new BaseWallet(networkType)).waitForTransaction({
                txHash: broadcastResult.txid
            })

            loadingGroup()

            await db.saveActivity({
                event: `Released ${activeAuthhead.value!.identitySnapshot?.token!.symbol || activeAuthhead.value?.token?.category} Tokens from reserves`,
                txid: broadcastResult.txid,
                status: 'success'
            })

            await loadAuthkeys(wallet.value, true)

            triggerRef(wallet)

            $q.dialog({
                component: TransactionStatusDialog,
                componentProps: {
                    statusType: 'success',
                    statusText: `Released ${activeAuthhead.value!.identitySnapshot?.token!.symbol || activeAuthhead.value?.token?.category} Tokens from reserves`,
                    txid: broadcastResult.txid
                }
            }).onOk(() => {
                router.push('/dashboard#collected')
            })

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

const viewRegistry = () => {
    router.push({
        path: '/token/metadata-registry', query: {
            authbase: activeAuthhead.value?.token?.category,
            contentHash: activeAuthhead.value?.identitySnapshotIdentifier?.contentHash
        }
    })
}


onMounted(() => {
    if (!activeAuthhead.value) {
        router.back()
        return
    }
    localSnapshot.value = cloneSnapshot(activeAuthhead.value.identitySnapshot)
    originalSnapshotJson.value = JSON.stringify(localSnapshot.value)
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
</style>
