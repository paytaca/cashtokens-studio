<template>
    <q-page class="bg-dark-page text-grey-2">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-11 col-md-9 q-my-lg q-pa-md">
                <img src="/images/cauldron-header-logo.png" alt="" class="cauldron-header-logo q-mb-md" />

                <div class="row items-center justify-between q-gutter-md q-mb-lg">
                    <div class="col-12 col-sm">
                        <div class="row items-center q-gutter-xs">
                            <div class="text-h6 text-weight-bold">{{ $t('liquidityPoolsPage.title') }}</div>
                            <ReleaseTagBadge :tag="settings.cauldron.releaseTag" />
                        </div>
                        <div class="text-caption text-grey-5">{{ $t('liquidityPoolsPage.caption') }}</div>
                    </div>
                    <div class="col-auto row items-center q-gutter-sm">
                        <div class="column items-end">
                            <q-toggle v-model="myPoolsOnly" color="primary" :label="$t('liquidityPoolsPage.myPools')"
                                :disable="!canFilterMyPools" />
                            <span v-if="!canFilterMyPools" class="text-caption text-grey-6">
                                {{ $t('liquidityPoolsPage.myPoolsHint') }}
                            </span>
                        </div>
                        <q-btn round flat dense icon="refresh" color="grey-4" :loading="loading"
                            :aria-label="$t('liquidityPoolsPage.refresh')" @click="loadPools" />
                    </div>
                </div>

                <q-banner v-if="indexerUnavailable" dense class="bg-orange-10 text-white q-mb-lg rounded-borders">
                    <template v-slot:avatar>
                        <q-icon name="warning" />
                    </template>
                    {{ $t('liquidityPoolsPage.indexerUnavailable') }}
                </q-banner>

                <q-card v-if="firstLoadPending" flat class="bg-dark q-pa-md q-mb-lg rounded-borders">
                    <div class="token-pool-strip row no-wrap q-gutter-md">
                        <q-skeleton v-for="i in 4" :key="i" type="rect" width="132px" height="132px"
                            class="rounded-borders" />
                    </div>
                </q-card>

                <q-card v-else-if="cards.length === 0" flat class="bg-dark q-pa-lg rounded-borders">
                    <div class="text-grey-5">{{ $t('liquidityPoolsPage.noTokens') }}</div>
                </q-card>

                <template v-else>
                    <q-card flat class="bg-dark q-pa-md q-mb-md rounded-borders">
                        <div class="token-pool-strip row no-wrap q-gutter-md">
                            <q-card v-for="card in cards" :key="card.category" flat
                                class="token-pool-card bg-dark-2 rounded-borders q-pa-sm"
                                :class="{ 'token-pool-card--selected': card.category === selectedCategory }"
                                @click="selectedCategory = card.category">
                                <div class="column items-center justify-center full-height q-gutter-y-xs">
                                    <q-avatar size="40px" class="bg-grey-9 rounded-borders">
                                        <q-img v-if="card.iconUrl" :src="card.iconUrl" fit="cover" />
                                        <q-img v-else :src="identicon(card.category)" fit="cover" />
                                    </q-avatar>
                                    <div class="text-subtitle2 text-weight-bold ellipsis full-width text-center">
                                        {{ card.symbol }}
                                    </div>
                                    <div class="text-caption text-grey-5 text-mono">
                                        {{ shortenTokenId(card.category) }}
                                    </div>
                                    <q-badge color="primary" text-color="dark">
                                        {{ $t('liquidityPoolsPage.poolCount', { count: card.pools.length }) }}
                                    </q-badge>
                                </div>
                            </q-card>
                        </div>
                    </q-card>

                    <!-- Sits between the selector and the pool table, aligned with the table's top-right. -->
                    <div class="row justify-end q-my-lg">
                        <q-btn color="secondary" no-caps icon="add" :label="$t('liquidityPoolsPage.addPosition')"
                            :disable="!selectedCategory" @click="goToAddPosition" flat />
                    </div>

                    <q-card flat class="bg-dark rounded-borders" :class="$q.screen.lt.sm ? 'q-pa-md' : 'q-pa-lg'">
                        <div class="row items-center q-gutter-x-sm q-mb-md">
                            <span class="text-subtitle1 text-weight-bold">
                                {{ selectedCard?.symbol }}
                            </span>
                            <span class="text-caption text-grey-5 text-mono">
                                {{ shortenTokenId(selectedCategory) }}
                            </span>
                            <CopyText v-if="selectedCategory" :text="selectedCategory" />
                        </div>

                        <q-table v-if="selectedPools.length > 0" :rows="selectedPools" :columns="columns"
                            :row-key="rowKey" flat dark hide-pagination :rows-per-page-options="[0]"
                            :grid="$q.screen.lt.sm" class="bg-dark">
                            <template v-slot:body-cell-pool="props">
                                <q-td :props="props">
                                    <span class="text-mono text-caption">
                                        {{ shortenTokenId(`${props.row.txid}:${props.row.tx_pos}`) }}
                                    </span>
                                    <CopyText :text="`${props.row.txid}:${props.row.tx_pos}`" />
                                </q-td>
                            </template>

                            <template v-slot:body-cell-bch="props">
                                <q-td :props="props">
                                    <span class="row items-center justify-end no-wrap text-mono">
                                        {{ formatBch(props.row.sats) }}
                                        <q-icon name="img:/images/bitcoin-cash-circle.svg" size="16px"
                                            class="q-ml-xs" />
                                    </span>
                                </q-td>
                            </template>

                            <template v-slot:body-cell-tokens="props">
                                <q-td :props="props" class="text-mono">{{ formatTokens(props.row) }}</q-td>
                            </template>

                            <template v-slot:body-cell-position="props">
                                <q-td :props="props">
                                    <span class="row items-center justify-end no-wrap text-mono">
                                        {{ formatPosition(props.row) }}
                                        <q-icon name="img:/images/bitcoin-cash-circle.svg" size="16px"
                                            class="q-ml-xs" />
                                    </span>
                                </q-td>
                            </template>

                            <template v-slot:body-cell-owner="props">
                                <q-td :props="props">
                                    <span class="text-mono text-caption">
                                        {{ shortenCashAddress(ownerAddress(props.row.owner_p2pkh_addr)) }}
                                    </span>
                                    <CopyText :text="ownerAddress(props.row.owner_p2pkh_addr)" />
                                </q-td>
                            </template>

                            <template v-slot:item="props">
                                <div class="q-pa-xs col-12">
                                    <div flat class="bg-dark-2 q-pa-md">
                                        <div class="row items-center justify-between q-gutter-sm">
                                            <span class="text-caption text-grey-5 text-uppercase">
                                                {{ $t('liquidityPoolsPage.columns.pool') }}
                                            </span>
                                            <span class="row items-center no-wrap text-mono text-caption">
                                                {{ shortenTokenId(`${props.row.txid}:${props.row.tx_pos}`) }}
                                                <CopyText :text="`${props.row.txid}:${props.row.tx_pos}`" />
                                            </span>
                                        </div>
                                        <div class="row items-center justify-between q-gutter-sm q-mt-xs">
                                            <span class="text-caption text-grey-5 text-uppercase">
                                                {{ $t('liquidityPoolsPage.columns.bch') }}
                                            </span>
                                            <span class="row items-center no-wrap text-mono">
                                                {{ formatBch(props.row.sats) }}
                                                <q-icon name="img:/images/bitcoin-cash-circle.svg" size="16px"
                                                    class="q-ml-xs" />
                                            </span>
                                        </div>
                                        <div class="row items-center justify-between q-gutter-sm q-mt-xs">
                                            <span class="text-caption text-grey-5 text-uppercase">
                                                {{ $t('liquidityPoolsPage.columns.tokens') }}
                                            </span>
                                            <span class="text-mono text-right">{{ formatTokens(props.row) }}</span>
                                        </div>
                                        <div class="row items-center justify-between q-gutter-sm q-mt-xs">
                                            <span class="text-caption text-grey-5 text-uppercase">
                                                {{ $t('liquidityPoolsPage.columns.position') }}
                                            </span>
                                            <span class="row items-center no-wrap text-mono">
                                                {{ formatPosition(props.row) }}
                                                <q-icon name="img:/images/bitcoin-cash-circle.svg" size="16px"
                                                    class="q-ml-xs" />
                                            </span>
                                        </div>
                                        <div class="row items-center justify-between q-gutter-sm q-mt-xs">
                                            <span class="text-caption text-grey-5 text-uppercase">
                                                {{ $t('liquidityPoolsPage.columns.owner') }}
                                            </span>
                                            <span class="row items-center no-wrap text-mono text-caption">
                                                {{ shortenCashAddress(ownerAddress(props.row.owner_p2pkh_addr)) }}
                                                <CopyText :text="ownerAddress(props.row.owner_p2pkh_addr)" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </q-table>
                        <div v-else class="text-grey-5">
                            {{ myPoolsOnly ? $t('liquidityPoolsPage.noMyPools') : $t('liquidityPoolsPage.noPools') }}
                        </div>
                    </q-card>
                </template>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useQuasar, type QTableColumn } from 'quasar'
import { binToHex, decodeCashAddress, encodeCashAddress } from 'bitauth-libauth-v3'
import CopyText from 'src/components/CopyText.vue'
import ReleaseTagBadge from 'src/components/ReleaseTagBadge.vue'
import { normalizeTokenDecimals } from 'src/core/bcmr'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import type { DecoratedUtxo } from 'src/core/types'
import { bigIntToDecimal, formatTokenAmount, shortenCashAddress, shortenTokenId } from 'src/core/utils'
import { useWalletSigner } from 'src/composables/useWalletSigner'
import { useAuthguardStore } from 'src/stores/authguard'
import { getTokenLiquidityPools, type CauldronActivePool } from 'src/services/cauldron'
import { settings } from 'src/settings'

defineOptions({ name: 'LiquidityPoolsPage' })

const { t } = useI18n()
const $q = useQuasar()
const router = useRouter()
const { wallet, walletIsReady } = useWalletSigner()
const authguardStore = useAuthguardStore()
const { loadAuthkeys, setActiveAuthhead } = authguardStore
const { authheads, authkeysLoading, authheadsLoading, authheadsLastSync } = storeToRefs(authguardStore)

type PoolRow = CauldronActivePool & { pool_id?: string }

type TokenCard = {
    category: string
    symbol: string
    decimals: number
    iconUrl?: string
    pools: PoolRow[]
}


const firstLoadPending = computed(
    () =>
        (authheads.value.length === 0 &&
            (Boolean(authkeysLoading.value) || Boolean(authheadsLoading.value))) ||
        (!authheadsLastSync.value &&
            (walletIsReady.value || Boolean(wallet.value?.initializing)))
)

const tokenAuthheads = computed(() => {
    const byCategory = new Map<string, DecoratedUtxo>()
    for (const authhead of authheads.value) {
        const category = authhead.token?.category
        if (!category) continue

        const key = String(category).toLowerCase()
        if (!byCategory.has(key)) byCategory.set(key, authhead)
    }
    return [...byCategory.values()]
})

const categories = computed(() =>
    tokenAuthheads.value.map((authhead) => String(authhead.token!.category).toLowerCase())
)

const poolsByCategory = ref<Record<string, PoolRow[]>>({})
const loading = ref(false)
const indexerUnavailable = ref(false)

const loadPools = async () => {
    const list = categories.value
    if (list.length === 0) {
        poolsByCategory.value = {}
        return
    }

    const indexerUrl = import.meta.env.VITE_CAULDRON_INDEXER
    if (!indexerUrl) {
        indexerUnavailable.value = true
        return
    }

    indexerUnavailable.value = false
    loading.value = true
    try {
        const results = await Promise.allSettled(
            list.map((category) => getTokenLiquidityPools({ category, cauldronIndexerUrl: indexerUrl }))
        )

        const next: Record<string, PoolRow[]> = {}
        results.forEach((result, index) => {
            const category = list[index] as string
            if (result.status === 'fulfilled') next[category] = (result.value ?? []) as PoolRow[]
        })
        poolsByCategory.value = next
    } finally {
        loading.value = false
    }
}

watch(() => categories.value.join(','), loadPools, { immediate: true })

const myPkhs = computed(() => {
    const addresses = new Set<string>()

    for (const utxo of (wallet.value?.utxos ?? []) as { address?: string }[]) {
        if (utxo.address) addresses.add(utxo.address)
    }

    try {
        for (let index = 0; index < 5; index++) {
            const address = wallet.value?.getTokenDepositAddress?.(index)
            if (address) addresses.add(address)
        }
    } catch {
        // A wallet without deposit addresses simply yields fewer owner matches.
    }

    const pkhs = new Set<string>()
    for (const address of addresses) {
        try {
            const decoded = decodeCashAddress(address)
            if (typeof decoded !== 'string') pkhs.add(binToHex(decoded.payload))
        } catch {
            // An address that does not decode cannot match a pool owner either.
        }
    }
    return pkhs
})

const myPoolsOnly = ref(false)
const canFilterMyPools = computed(() => walletIsReady.value && myPkhs.value.size > 0)

watch(canFilterMyPools, (canFilter) => {
    if (!canFilter) myPoolsOnly.value = false
})

const cards = computed<TokenCard[]>(() =>
    tokenAuthheads.value
        .map((authhead) => {
            const category = String(authhead.token!.category).toLowerCase()
            const allPools = poolsByCategory.value[category] ?? []
            const pools = myPoolsOnly.value
                ? allPools.filter((pool) => myPkhs.value.has(pool.owner_pkh))
                : allPools

            const icon = authhead.identitySnapshot?.uris?.icon

            return {
                category,
                symbol: authhead.identitySnapshot?.token?.symbol || t('tokenProfile.unknownSymbol'),
                decimals: normalizeTokenDecimals(authhead.identitySnapshot?.token?.decimals),
                iconUrl: icon ? ipfsToGatewayUrl(icon) : undefined,
                pools,
            }
        })
        .sort((a, b) => b.pools.length - a.pools.length || a.symbol.localeCompare(b.symbol))
)

const selectedCategory = ref('')
const selectedCard = computed(() => cards.value.find((card) => card.category === selectedCategory.value))
const selectedPools = computed(() => selectedCard.value?.pools ?? [])

watch(cards, (list) => {
    if (!list.some((card) => card.category === selectedCategory.value)) {
        selectedCategory.value = list[0]?.category ?? ''
    }
}, { immediate: true })

/**
 * The add-liquidity page builds its pool from the authhead the store has selected, so the authhead
 * behind the chosen thumbnail has to be made active before navigating.
 */
const goToAddPosition = () => {
    const card = selectedCard.value
    if (!card) return

    const authhead = tokenAuthheads.value.find(
        (candidate) => String(candidate.token?.category).toLowerCase() === card.category
    )
    if (!authhead) return

    setActiveAuthhead(authhead)
    router.push({ name: 'cauldron-add-liquidity', params: { category: card.category } })
}

const identicon = (seed: string) => `https://api.dicebear.com/10.x/identicon/svg?seed=${seed}`

const NETWORK_PREFIX = (import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? 'bchtest' : 'bitcoincash') as
    'bitcoincash' | 'bchtest'

/**
 * The Cauldron indexer reports pool owners with the mainnet prefix regardless of the network, so
 * decode and re-encode them for the network this build runs against.
 */
const ownerAddress = (address: string) => {
    try {
        const decoded = decodeCashAddress(address)
        if (typeof decoded === 'string') return address
        return encodeCashAddress({
            payload: decoded.payload,
            prefix: NETWORK_PREFIX,
            type: decoded.type,
        }).address
    } catch {
        return address
    }
}

const trimDecimal = (value: string) =>
    value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value

const formatBch = (sats: number) =>
    trimDecimal(bigIntToDecimal(BigInt(Math.round(sats)), 8))

/**
 * BCH per whole token for each category, read from its largest pool — the same derivation the
 * market-price service uses, so a pool's position matches the value shown when adding liquidity.
 */
const priceByCategory = computed<Record<string, number>>(() => {
    const decimalsByCategory = new Map<string, number>()
    for (const authhead of tokenAuthheads.value) {
        const category = String(authhead.token?.category).toLowerCase()
        decimalsByCategory.set(category, normalizeTokenDecimals(authhead.identitySnapshot?.token?.decimals))
    }

    const prices: Record<string, number> = {}
    for (const [category, pools] of Object.entries(poolsByCategory.value)) {
        const largest = pools.reduce<PoolRow | undefined>(
            (acc, pool) => (!acc || pool.sats > acc.sats ? pool : acc),
            undefined
        )
        const decimals = decimalsByCategory.get(category) ?? 0
        if (!largest || !largest.tokens) continue

        const price = (largest.sats / 1e8) / (largest.tokens / 10 ** decimals)
        if (Number.isFinite(price) && price > 0) prices[category] = price
    }
    return prices
})

/** BCH value of the whole pool position: its BCH side plus its tokens at the category price. */
const positionSats = (pool: PoolRow) => {
    const price = priceByCategory.value[selectedCategory.value] ?? 0
    const decimals = selectedCard.value?.decimals ?? 0
    if (price <= 0) return pool.sats

    const tokenValueSats = (Number(pool.tokens) / 10 ** decimals) * price * 1e8
    return pool.sats + Math.round(tokenValueSats)
}

const formatPosition = (pool: PoolRow) =>
    trimDecimal(bigIntToDecimal(BigInt(positionSats(pool)), 8))

const formatTokens = (pool: PoolRow) =>
    formatTokenAmount(
        BigInt(pool.tokens),
        selectedCard.value?.symbol ?? '',
        selectedCard.value?.decimals ?? 0,
        'suffix'
    )

const rowKey = (row: PoolRow) => row.pool_id ?? `${row.txid}:${row.tx_pos}`

const columns = computed(() => [
    {
        name: 'pool',
        label: t('liquidityPoolsPage.columns.pool'),
        field: (row: PoolRow) => `${row.txid}:${row.tx_pos}`,
        align: 'left',
    },
    {
        name: 'bch',
        label: t('liquidityPoolsPage.columns.bch'),
        field: (row: PoolRow) => row.sats,
        align: 'right',
        sortable: true,
    },
    {
        name: 'tokens',
        label: t('liquidityPoolsPage.columns.tokens'),
        field: (row: PoolRow) => row.tokens,
        align: 'right',
        sortable: true,
    },
    {
        name: 'position',
        label: t('liquidityPoolsPage.columns.position'),
        field: (row: PoolRow) => positionSats(row),
        align: 'right',
        sortable: true,
    },
    {
        name: 'owner',
        label: t('liquidityPoolsPage.columns.owner'),
        field: (row: PoolRow) => row.owner_p2pkh_addr,
        align: 'left',
    },
] as QTableColumn[])

watch(() => walletIsReady.value, (isReady, wasReady) => {
    if (isReady && !wasReady) loadAuthkeys(wallet.value)
}, { immediate: true })
</script>

<style scoped>
.cauldron-header-logo {
    display: block;
    width: 100%;
    max-width: 260px;
    height: auto;
}

.token-pool-strip {
    overflow-x: auto;
}

.token-pool-strip>* {
    flex: none;
}

.token-pool-card {
    flex: none;
    width: 132px;
    height: 132px;
    cursor: pointer;
}

.token-pool-card--selected {
    outline: 2px solid var(--q-primary);
    outline-offset: -2px;
}
</style>
