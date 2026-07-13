<template>
    <q-page class="bg-dark-page text-grey-2">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <q-card v-if="authheadLoading[route.query?.authhead as string]" class="bg-dark q-pa-lg rounded borders"
                    flat>
                    <div class="flex justify-end q-mb-lg">
                        <q-skeleton type="rect" width="120px" height="32px" class="bg-grey-9 border-radius-8" />
                    </div>
                    <div class="row items-center no-wrap q-gutter-x-md q-mb-lg">
                        <div class="col q-gutter-x-xs flex items-center">
                            <q-skeleton type="rect" width="100px" height="22px" class="bg-grey-9 border-radius-4" />
                            <q-skeleton type="rect" width="70px" height="22px" class="bg-grey-9 border-radius-4" />
                        </div>
                        <q-skeleton type="circle" size="32px" class="bg-grey-9" />
                    </div>
                    <div class="q-mb-md">
                        <q-skeleton type="text" width="80px" class="text-caption bg-grey-9 q-mb-xs" />
                        <q-skeleton type="rect" height="40px" class="full-width border-radius-8 bg-grey-9" />
                    </div>
                    <div class="q-mb-md">
                        <q-skeleton type="text" width="140px" class="text-caption bg-grey-9 q-mb-xs" />
                        <q-skeleton type="rect" height="40px" class="full-width border-radius-8 bg-grey-9" />
                    </div>
                    <div class="q-mb-md">
                        <q-skeleton type="text" width="80px" class="text-caption bg-grey-9 q-mb-xs" />
                        <q-skeleton type="rect" width="60px" height="24px" class="bg-grey-9 border-radius-4" />
                    </div>
                    <div class="q-mb-md">
                        <q-skeleton type="text" width="120px" class="text-caption bg-grey-9 q-mb-xs" />
                        <div class="flex justify-between">
                            <q-skeleton type="rect" height="36px" class="full-width border-radius-8 bg-grey-9"
                                style="max-width: 200px" />
                            <q-skeleton type="rect" width="80px" height="36px" class="bg-grey-9 border-radius-8" />
                        </div>
                    </div>
                    <div>
                        <q-skeleton type="text" width="130px" class="text-caption bg-grey-9 q-mb-xs" />
                        <div class="flex justify-between no-wrap">
                            <q-skeleton type="rect" height="36px" class="full-width border-radius-8 bg-grey-9"
                                style="max-width: 200px" />
                            <div class="flex no-wrap q-gutter-sm">
                                <q-skeleton type="rect" width="80px" height="36px" class="bg-grey-9 border-radius-8" />
                                <q-skeleton type="rect" width="80px" height="36px" class="bg-grey-9 border-radius-8" />
                            </div>
                        </div>
                    </div>
                </q-card>
                <q-card v-else class="bg-dark q-pa-lg rounded-borders" flat>
                    <!-- <q-card-title class="flex justify-end">
                    </q-card-title> -->
                    <div class="row items-center no-wrap q-gutter-x-md q-mb-lg">
                        <div class="col">
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
                    </div>
                    <FormField>
                        <label>Reserve UTXO Id</label>
                        <q-input :model-value="shortenTokenId(`${activeAuthhead?.txid}:${activeAuthhead?.vout}`)"
                            disable outlined>
                            <template v-slot:append>
                                <CopyText
                                    :text="activeAuthhead?.token?.category || localSnapshot.token?.category || ''" />
                            </template>
                        </q-input>
                    </FormField>

                    <FormField v-if="hasNfts">
                        <label>NFT Collection </label>
                        <q-input :model-value="nftCollectionType" disable outlined>
                            <template v-slot:append>
                                <q-btn v-if="showMint" icon="mdi-pickaxe" color="primary" @click="mintNft" no-wrap>
                                    <span v-if="$q.screen.gt.sm" class="gt-xs q-ml-xs">Mint</span>
                                </q-btn>
                            </template>
                        </q-input>
                    </FormField>

                    <FormField v-if="showReleaseReserves && activeAuthhead" class="rounded-borders">
                        <label>Fungible Reserves</label>
                        <q-input :model-value="fungibleReserves" disable outlined bottom-slots>
                            <template v-slot:hint>
                                <div v-if="showDecimals" class="flex items-center q-gutter-x-md">
                                    <label>Decimals</label>
                                    <q-badge outline color="grey-7" class="text-weight-bold text-grey-4" size="lg">
                                        {{ localSnapshot.token!.decimals === undefined ? '?' :
                                            localSnapshot.token!.decimals }}
                                    </q-badge>
                                </div>
                            </template>
                            <template v-slot:prepend>

                            </template>
                            <template v-slot:append>
                                <div class="flex no-wrap q-gutter-sm">
                                    <q-btn no-wrap icon="mdi-fire" color="orange" text-color="dark"
                                        @click="() => releaseReserves('burn')">
                                        <span v-if="$q.screen.gt.sm" class="gt-xs q-ml-xs">Burn</span>
                                    </q-btn>
                                    <q-btn no-wrap icon="mdi-send-circle-outline" color="primary"
                                        @click="() => releaseReserves('issuance')">
                                        <span v-if="$q.screen.gt.sm" class="gt-xs q-ml-xs">Release</span>
                                    </q-btn>
                                </div>

                            </template>
                        </q-input>

                    </FormField>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, triggerRef, inject, defineComponent } from 'vue'
import { useRouter, onBeforeRouteLeave, useRoute } from 'vue-router'
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
import { timeStamp } from 'console'
import { useRegistryStore } from 'src/stores/registry'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const authguardStore = useAuthguardStore()
const { loadAuthkeys, updateActiveAuthhead, authheadLoading } = authguardStore
const { setActiveIdentitySnapshot } = useRegistryStore()
const appStore = useAppStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const wizardConnectWallet = inject('wizardConnectWallet') as any
const { wallet, manager } = wizardConnectWallet


const category = computed(() => activeAuthhead.value?.token?.category || '')
const fungibleReserves = computed(() => {
    return formatTokenAmount(
        activeAuthhead.value?.token?.amount ?? 0,
        localSnapshot.value?.token!.symbol || '?',
        localSnapshot.value?.token!.decimals,
        'none'
    )
})

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


const hasNfts = computed(() => !!localSnapshot.value?.token?.nfts)

const nftCollectionType = computed(() => {
    const bytecode = (localSnapshot.value?.token?.nfts?.parse as ParsableNftCollection)?.bytecode
    return bytecode && bytecode.length > 2 ? 'Parsable Collection' : 'Sequential Collection'
})


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



            await db.saveActivity({
                event: `Released ${activeAuthhead.value!.identitySnapshot?.token!.symbol || activeAuthhead.value?.token?.category} Tokens from reserves`,
                txid: broadcastResult.txid,
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
                    statusText: `Released ${activeAuthhead.value!.identitySnapshot?.token!.symbol || activeAuthhead.value?.token?.category} Tokens from reserves`,
                    txid: broadcastResult.txid
                }
            }).onOk(() => {
                // router.push('/dashboard#collected')
            })

        } catch (error: any) {
            $q.notify({
                type: 'Error',
                message: error.message
            })
        } finally {
            loadingGroup()
        }
    })
}

watch(() => activeAuthhead.value, (v) => {
    if (v) {
        localSnapshot.value = cloneSnapshot(v.identitySnapshot)
        originalSnapshotJson.value = JSON.stringify(localSnapshot.value)
    }
}, { immediate: true })

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
