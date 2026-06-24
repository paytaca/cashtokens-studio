<template>
    <q-page class="bg-dark-page text-grey-2">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-btn flat icon="arrow_back" label="Back" color="grey-4" @click="router.back()" class="q-mb-md" />
                <q-card class="bg-dark q-pa-lg rounded borders">
                    <q-card-title class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm q-mb-lg">
                        <span>Token Identity </span>
                        <q-icon name="mdi-information-variant" size="lg" />

                    </q-card-title>
                    <div class="row items-center no-wrap q-gutter-x-md q-mb-lg">
                        <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="localSnapshot.uris?.icon" :src="ipfsToGatewayUrl(localSnapshot.uris.icon)!"
                                fit="cover" />
                            <q-icon v-else name="token" color="primary" size="32px" />
                        </q-avatar>
                        <div class="col">
                            <div class="flex items-center q-gutter-x-xs q-mb-xs">
                                <span class="text-h6 text-weight-medium text-grey-2">{{ localSnapshot.token?.symbol ||
                                    '?' }}</span>
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
                                    <q-item v-if="showReleaseReserves" clickable @click="releaseReserves">
                                        <q-item-section style="white-space: nowrap;">Release FT
                                            Reserves</q-item-section>
                                    </q-item>
                                </q-list>
                            </q-menu>
                        </q-btn>
                    </div>
                    <FormField v-if="showReleaseReserves">
                        <label>Reserved Supply</label>
                        <div class="q-field__inner bg-dark rounded-borders q-px-md"
                            style="min-height: 56px; display: flex; align-items: center;">
                            <span class="tabular-nums text-grey-5">{{ reservedSupply }}</span>
                            <q-space />
                            <q-btn flat dense no-wrap icon="mdi-send-circle-outline" color="primary" size="md"
                                @click="releaseReserves">
                                <span class="gt-xs q-ml-xs">Release</span>
                            </q-btn>
                        </div>
                    </FormField>

                    <FormField v-if="hasNfts">
                        <label>NFT Collection</label>
                        <div class="q-field__inner bg-dark rounded-borders"
                            style="min-height: 3em; display: flex; align-items: center;">
                            <q-chip v-if="nftCollectionType === 'Sequential'" dark outline icon="mdi-counter"
                                label="Sequential NFT Collection" />
                            <q-chip v-else dark outline icon="mdi-hexadecimal" label="Parsable NFT Collection" />
                            <q-space />
                            <q-btn v-if="showMint" dense no-wrap icon="mdi-pickaxe" text-color="primary" size="md"
                                @click="mintNft">
                                <span class="gt-xs q-ml-xs">Mint</span>
                            </q-btn>
                        </div>
                    </FormField>

                    <FormField>
                        <label>Category</label>
                        <q-input v-model="localSnapshot.token!.category" dark outlined readonly>
                            <template v-slot:append>
                                <q-btn flat dense round icon="content_copy" color="grey-5" size="sm"
                                    @click="copyCategory" />
                            </template>
                        </q-input>
                    </FormField>
                    <FormField>
                        <label>Name</label>
                        <q-input v-model="localSnapshot.name" dark outlined />
                    </FormField>
                    <FormField>
                        <label>Description</label>
                        <q-input v-model="localSnapshot.description" dark outlined type="textarea" autogrow />
                    </FormField>
                    <FormField>
                        <label>Symbol</label>
                        <q-input v-model="localSnapshot.token!.symbol" dark outlined />
                    </FormField>

                    <FormField v-if="showDecimals">
                        <label>Decimals</label>
                        <q-input v-model.number="localSnapshot.token!.decimals" dark outlined type="number" min="0"
                            max="18" />
                    </FormField>
                    <template v-if="hasNfts">
                        <q-separator dark class="q-my-md" />
                        <div class="flex justify-start">
                            <q-btn flat no-caps color="primary" icon="token" label="View NFTs" @click="viewNfts" />
                        </div>
                    </template>


                </q-card>

                <div v-if="snapshotModified" class="flex flex-wrap q-gutter-sm justify-end q-mt-md">
                    <q-btn color="positive" icon="save" label="Save" @click="saveSnapshot" />
                    <q-btn color="primary" icon="cloud_upload" label="Publish" @click="publishSnapshot" />
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthguardStore } from 'src/stores/authguard'
import { useAppStore } from 'src/stores/app'
import type { IdentitySnapshot, ParsableNftCollection } from 'src/core/bcmr/bcmr-v2.schema'
import type { DecoratedUtxo } from 'src/core/types'
import { shortenTokenId, getTokenType } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import FormField from 'components/FormField.vue'

const router = useRouter()
const authguardStore = useAuthguardStore()
const appStore = useAppStore()
const { activeAuthhead } = storeToRefs(authguardStore)

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
    const amount = activeAuthhead.value?.token?.amount
    if (amount == null) return null
    try {
        return BigInt(amount).toLocaleString()
    } catch {
        return String(amount)
    }
})

const hasNfts = computed(() => !!localSnapshot.value?.token?.nfts)

const nftCollectionType = computed(() => {
    const bytecode = (localSnapshot.value?.token?.nfts?.parse as ParsableNftCollection)?.bytecode
    return bytecode && bytecode.length > 2 ? 'Parsable' : 'Sequential'
})

const viewNfts = () => {
    const category = activeAuthhead?.value?.identitySnapshot?.token?.category || activeAuthhead.value?.token?.category
    if (category) {
        router.push(`/token/${category}/nfts`)
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
    router.push({ name: 'nft-collection-mint', params: { category: category.value } })
}

const releaseReserves = () => {
    // placeholder
}

const saveSnapshot = () => {
    // placeholder
}

const publishSnapshot = () => {
    // placeholder
}

const copyCategory = () => {
    const text = localSnapshot.value.token?.category || activeAuthhead.value?.token?.category || ''
    if (text) {
        navigator.clipboard.writeText(text)
    }
}

onMounted(() => {
    if (!activeAuthhead.value) {
        router.back()
        return
    }
    localSnapshot.value = cloneSnapshot(activeAuthhead.value.identitySnapshot)
    originalSnapshotJson.value = JSON.stringify(localSnapshot.value)
})

onBeforeRouteLeave(() => {
    authguardStore.setActiveAuthhead(null as any)
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
