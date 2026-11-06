<template>
    <q-page class="bg-dark-page text-grey-2">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg q-pa-md">
                <div class="q-mb-md">
                    <q-btn flat dense icon="arrow_back" :label="$t('addLiquidityPage.back')" color="grey-4"
                        @click="goBack" />
                </div>

                <div class="row items-center q-gutter-sm q-mb-md">
                    <img src="/images/cauldron-header-logo.png" alt="" class="cauldron-header-logo" />
                    <ReleaseTagBadge :tag="settings.cauldron.releaseTag" />
                </div>

                <q-card flat class="bg-dark q-pa-md q-mb-lg rounded-borders">
                    <TokenIdentityBanner v-if="identitySnapshot" :identity-snapshot="identitySnapshot"
                        :category="category" />
                    <div v-else class="text-body2 text-grey-5">
                        {{ $t('addLiquidityPage.noAuthhead') }}
                    </div>
                </q-card>

                <q-card v-if="authhead" flat class="bg-dark q-pa-lg rounded-borders">
                    <!-- 1. Market price and the toggle that decides whether it is used for the amounts. -->
                    <div>
                        <div class="text-h6 text-uppercase q-mb-lg">
                            {{ $t('addLiquidityPage.price') }}
                        </div>
                        <div v-if="marketPriceLoading" class="text-body2 text-grey-5">
                            {{ $t('addLiquidityPage.priceLoading') }}
                        </div>
                        <div v-else-if="hasMarketPrice" class="text-h6 row items-center q-gutter-xs">
                            <span>{{ $t('addLiquidityPage.pricePerToken', { price: marketPriceRounded, symbol })
                                }}</span>
                            <q-icon name="img:/images/bitcoin-cash-circle.svg" size="24px" />
                        </div>
                        <div v-else class="text-body2 text-orange-4">
                            {{ $t('addLiquidityPage.marketPriceUnavailable') }}
                        </div>

                        <div class="row items-center q-gutter-sm q-mt-sm">
                            <q-toggle v-model="useMarketPrice" color="primary"
                                :label="$t('addLiquidityPage.useCurrentMarketPrice')" :disable="!hasMarketPrice" />
                            <q-btn v-if="hasMarketPrice" flat dense no-caps color="secondary"
                                :label="showPriceDetails ? $t('addLiquidityPage.hideDetails') : $t('addLiquidityPage.showDetails')"
                                @click="showPriceDetails = !showPriceDetails" />
                        </div>

                        <!-- Where the market price comes from: the largest pool for this category. -->
                        <q-card v-if="showPriceDetails && hasMarketPrice && marketPriceSource" flat
                            class="bg-dark-2 q-pa-md q-mt-sm rounded-borders">
                            <div class="text-body2 text-grey-4">
                                {{ $t('addLiquidityPage.priceSource', {
                                    output: marketPriceSource.tx_pos,
                                    txid: shortenTokenId(marketPriceSource.txid || ''),
                                }) }}
                            </div>
                            <div class="text-body2 text-grey-4 q-mt-xs">
                                {{ $t('addLiquidityPage.priceSourceLiquidity', {
                                    bch: poolBchLabel,
                                    tokens: poolTokensLabel,
                                }) }}
                            </div>
                        </q-card>
                    </div>

                    <!-- 2. Manual price, only while the market price is not in use. -->
                    <q-input v-if="!marketPriceActive" :model-value="customPrice" @update:model-value="onCustomPrice"
                        :label="$t('addLiquidityPage.setPrice')" outlined dark bg-color="dark-2" inputmode="decimal"
                        class="q-mt-md"
                        :rules="[(v: string) => Number(v) > 0 || $t('addLiquidityPage.invalidAmount')]" />

                    <q-banner v-if="!marketPriceActive" dense class="bg-orange-10 text-white q-mt-md rounded-borders">
                        <template v-slot:avatar>
                            <q-icon name="warning" />
                        </template>
                        {{ $t('addLiquidityPage.priceWarning') }}
                    </q-banner>

                    <h6 class="text-bold">Deposit Amount</h6>
                    <!-- 3. Amounts, each derived from the other through the price in force. -->
                    <FormField>
                        <label>{{ $t('addLiquidityPage.tokenAmount') }}</label>
                        <q-input :model-value="tokenAmountInput" @update:model-value="onTokenAmount" :label="symbol"
                            outlined dark bg-color="dark-2" inputmode="decimal" input-class="text-h6 text-weight-bold"
                            :rules="tokenAmountRules">
                            <template v-slot:prepend>
                                <q-avatar size="32px">
                                    <q-img v-if="iconUrl" :src="iconUrl" fit="cover" />
                                    <q-icon v-else name="token" />
                                </q-avatar>
                            </template>
                        </q-input>
                        <div class="row items-center q-gutter-x-sm text-caption text-grey-5">
                            <span>{{ $t('addLiquidityPage.availableReserves', { amount: reserveLabel }) }}</span>
                            <span>·</span>
                            <span>{{ $t('addLiquidityPage.decimals') }}</span>
                            <q-badge outline color="grey-7" class="text-weight-bold text-grey-4">
                                {{ decimals }}
                            </q-badge>
                        </div>
                    </FormField>

                    <FormField>
                        <label>{{ $t('addLiquidityPage.bchAmount') }}</label>
                        <q-input :model-value="bchAmountInput" @update:model-value="onBchAmount" label="BCH" outlined
                            dark bg-color="dark-2" inputmode="decimal" input-class="text-h6 text-weight-bold"
                            :rules="bchAmountRules">
                            <template v-slot:prepend>
                                <q-icon name="img:/images/bitcoin-cash-circle.svg" size="32px" />
                            </template>
                        </q-input>
                    </FormField>

                    <!-- 4. What the deposit is worth at the price in force. -->
                    <div class="row items-center justify-between q-mt-md q-pa-md bg-dark-2 rounded-borders">
                        <span class="text-caption text-grey-6 text-uppercase">
                            {{ $t('addLiquidityPage.positionValue') }}
                        </span>
                        <span class="text-h6">{{ positionValueLabel }} ({{ positionValueUsd }} USD)</span>
                    </div>

                    <!-- 5. Submit through the same wallet-signing pipeline the registry pages use. -->
                    <div class="row justify-end q-mt-lg">
                        <q-btn color="primary" size="lg" no-caps icon="img:/images/cauldron-logo.png"
                            :label="$t('addLiquidityPage.addLiquidity')" :loading="submitting" :disable="!canSubmit"
                            @click="addLiquidity" />
                    </div>
                </q-card>

                <q-card v-else flat class="bg-dark q-pa-lg rounded-borders">
                    <div class="text-body1 q-mb-md">{{ $t('addLiquidityPage.noAuthhead') }}</div>
                    <q-btn color="primary" no-caps :label="$t('addLiquidityPage.goToManagedTokens')"
                        @click="router.push({ name: 'managed-tokens' })" />
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, triggerRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { Network } from 'cashscript'
import { BaseWallet, NetworkType } from 'mainnet-js'
import FormField from 'components/FormField.vue'
import TokenIdentityBanner from 'src/components/TokenIdentityBanner.vue'
import ReleaseTagBadge from 'src/components/ReleaseTagBadge.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { normalizeTokenDecimals } from 'src/core/bcmr'
import { DEFAULT_TOKEN_VALUE } from 'src/core/constants'
import { db } from 'src/core/client-db'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import type { DecoratedUtxo, UtxoWithPath } from 'src/core/types'
import { bigIntToDecimal, decimalToBigInt, formatTokenAmount, shortenTokenId } from 'src/core/utils'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { useAuthguardStore } from 'src/stores/authguard'
import { broadcastTransaction } from 'src/services/transaction'
import { createPoolFromFungibleReserves, getTokenMarketPrice } from 'src/services/cauldron'
import { settings } from 'src/settings'
import {
    TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS,
    TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel,
} from 'src/utils'
import { getAssetPrices, WatchtowerAssetPrice } from 'src/services/watchtower'

defineOptions({ name: 'AddLiquidityPage' })

const props = defineProps<{ category: string }>()

const $q = useQuasar()
const { t } = useI18n()
const router = useRouter()
const authguardStore = useAuthguardStore()
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const { activeAuthhead } = storeToRefs(authguardStore)
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog()
const { wallet, signTransaction } = inject('walletSigner') as any

const category = computed(() => props.category.trim().toLowerCase())

/** Only the authhead selected for this very category can supply the reserve output and authkey. */
const authhead = computed<DecoratedUtxo | undefined>(() => {
    const value = activeAuthhead.value
    if (!value?.token || !value.authkey) return undefined
    return String(value.token.category).toLowerCase() === category.value ? value : undefined
})

const identitySnapshot = computed(() => authhead.value?.identitySnapshot)
const decimals = computed(() => normalizeTokenDecimals(identitySnapshot.value?.token?.decimals))
const symbol = computed(() => identitySnapshot.value?.token?.symbol || t('tokenProfile.unknownSymbol'))
const iconUrl = computed(() => {
    const icon = identitySnapshot.value?.uris?.icon
    return icon ? ipfsToGatewayUrl(icon) : undefined
})
const reserveAmount = computed(() => BigInt(authhead.value?.token?.amount ?? 0))
const reserveLabel = computed(() =>
    formatTokenAmount(reserveAmount.value, symbol.value, decimals.value, 'suffix')
)

const currentBchUsdPrice = ref<WatchtowerAssetPrice>()

const BCH_DECIMALS = 8

// --- Market price ---------------------------------------------------------------------------

const marketPriceNumber = ref<number>()
const marketPriceRounded = ref<string>()
const marketPriceLoading = ref(true)
const useMarketPrice = ref(true)
const showPriceDetails = ref(false)
const marketPriceSource = ref<{ txid?: string, tx_pos?: number, sats?: number, tokens?: number }>()

const hasMarketPrice = computed(() => !!marketPriceNumber.value && marketPriceNumber.value > 0)
const marketPriceActive = computed(() => useMarketPrice.value && hasMarketPrice.value)

/**
 * Cauldron's price for the token: BCH per whole token, read from the largest active pool.
 * `price` is a localized string, so the pool's raw sats/tokens are used for the arithmetic.
 */
const loadMarketPrice = async () => {
    const indexerUrl = import.meta.env.VITE_CAULDRON_INDEXER
    if (!indexerUrl || !category.value) {
        marketPriceLoading.value = false
        return
    }

    marketPriceLoading.value = true
    try {
        const { price, priceRounded, sourcePool } = await getTokenMarketPrice({
            category: category.value,
            tokenDecimals: decimals.value,
            cauldronIndexerUrl: indexerUrl,
        })
        const pool = sourcePool as { sats?: number, tokens?: number } | undefined
        const fromPool = pool?.sats && pool?.tokens
            ? (Number(pool.sats) / 1e8) / (Number(pool.tokens) / 10 ** decimals.value)
            : Number(String(price).replace(/,/g, ''))

        if (Number.isFinite(fromPool) && fromPool > 0) {
            marketPriceNumber.value = fromPool
            marketPriceRounded.value = priceRounded
            marketPriceSource.value = pool
        }
    } catch {
        // A missing indexer or an empty pool list leaves the market price unavailable; the page
        // falls back to a manually entered price.
    } finally {
        marketPriceLoading.value = false
    }
}

// --- Price in force -------------------------------------------------------------------------

const customPrice = ref('')

const effectivePrice = computed(() => {
    if (marketPriceActive.value) return marketPriceNumber.value ?? 0
    const value = Number(customPrice.value)
    return Number.isFinite(value) && value > 0 ? value : 0
})

/** Decimal form without exponent notation, used to seed the manual price from the market one. */
const toPlainDecimal = (value: number) => {
    const fixed = value.toFixed(18)
    return fixed.replace(/0+$/, '').replace(/\.$/, '')
}

watch(hasMarketPrice, (available) => {
    // The toggle starts checked; it only flips when availability changes, so a user who unchecks
    // it keeps their manual price while the market price stays loaded.
    useMarketPrice.value = available
}, { immediate: true })

watch(useMarketPrice, (enabled) => {
    if (!enabled && !customPrice.value && marketPriceNumber.value) {
        customPrice.value = toPlainDecimal(marketPriceNumber.value)
    }
})

const onCustomPrice = (value: unknown) => {
    setSanitizedInput(customPrice, value, sanitizeDecimal(value, 18))
}

// --- Amounts --------------------------------------------------------------------------------

const tokenAmountInput = ref('')
const bchAmountInput = ref('')
const lastEdited = ref<'token' | 'bch'>('token')

/** Keeps only digits and a single decimal point, with at most `maxDecimals` fraction digits. */
function sanitizeDecimal(value: unknown, maxDecimals: number): string {
    const raw = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
    const [whole = '', ...rest] = raw.split('.')
    const fraction = rest.join('').slice(0, maxDecimals)
    const integer = whole.replace(/^0+(?=\d)/, '')
    return raw.includes('.') ? `${integer || '0'}.${fraction}` : integer
}

const trimDecimal = (value: string) =>
    value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value

/** BCH side of the pool the market price is read from. */
const poolBchLabel = computed(() => {
    const sats = marketPriceSource.value?.sats
    return sats ? trimDecimal(bigIntToDecimal(BigInt(Math.round(sats)), 8)) : '—'
})

/** Token side of that pool, formatted with the token's own symbol and decimals. */
const poolTokensLabel = computed(() => {
    const tokens = marketPriceSource.value?.tokens
    if (!tokens) return '—'
    return formatTokenAmount(BigInt(tokens), symbol.value, decimals.value, 'suffix')
})

const tokenAmountBase = computed(() =>
    decimalToBigInt(tokenAmountInput.value || '0', decimals.value)
)
const bchAmountSats = computed(() => decimalToBigInt(bchAmountInput.value || '0', BCH_DECIMALS))

const tokenBaseToSats = (base: bigint): bigint => {
    const price = effectivePrice.value
    if (price <= 0) return 0n
    const wholeTokens = Number(base) / 10 ** decimals.value
    return BigInt(Math.round(wholeTokens * price * 1e8))
}

const satsToTokenBase = (sats: bigint): bigint => {
    const price = effectivePrice.value
    if (price <= 0) return 0n
    const wholeTokens = (Number(sats) / 1e8) / price
    return BigInt(Math.round(wholeTokens * 10 ** decimals.value))
}

/**
 * QInput keeps the raw text while the bound value is sanitized, so the visible input would still
 * accept digits past the token's precision. Re-setting through an empty value forces the field to
 * adopt the cleaned text.
 */
const setSanitizedInput = (target: Ref<string>, raw: unknown, cleaned: string) => {
    if (cleaned === String(raw ?? '')) {
        target.value = cleaned
        return
    }

    target.value = ''
    nextTick(() => {
        target.value = cleaned
    })
}

const onTokenAmount = (value: unknown) => {
    const cleaned = sanitizeDecimal(value, decimals.value)
    lastEdited.value = 'token'
    setSanitizedInput(tokenAmountInput, value, cleaned)
    syncAmounts(cleaned)
}

const onBchAmount = (value: unknown) => {
    const cleaned = sanitizeDecimal(value, BCH_DECIMALS)
    lastEdited.value = 'bch'
    setSanitizedInput(bchAmountInput, value, cleaned)
    syncAmounts(undefined, cleaned)
}

/** Derives the side the user did not type into last from the price currently in force. */
const syncAmounts = (tokenOverride?: string, bchOverride?: string) => {
    if (lastEdited.value === 'token') {
        const base = decimalToBigInt((tokenOverride ?? tokenAmountInput.value) || '0', decimals.value)
        bchAmountInput.value = base > 0n && effectivePrice.value > 0
            ? trimDecimal(bigIntToDecimal(tokenBaseToSats(base), BCH_DECIMALS))
            : ''
        return
    }

    const sats = decimalToBigInt((bchOverride ?? bchAmountInput.value) || '0', BCH_DECIMALS)
    tokenAmountInput.value = sats > 0n && effectivePrice.value > 0
        ? trimDecimal(bigIntToDecimal(satsToTokenBase(sats), decimals.value))
        : ''
}

/** A price change re-derives the side the user did not type into last. */
watch([effectivePrice, decimals], () => syncAmounts())

const tokenAmountRules = computed(() => [
    (value: string) => {
        if (!value) return true
        return decimalToBigInt(value, decimals.value) <= reserveAmount.value
            || t('addLiquidityPage.insufficientReserves')
    },
])

// --- Position value and submission ----------------------------------------------------------

const positionValueSats = computed(() =>
    bchAmountSats.value + tokenBaseToSats(tokenAmountBase.value)
)

const positionValueLabel = computed(() =>
    `${trimDecimal(bigIntToDecimal(positionValueSats.value, BCH_DECIMALS))} BCH`
)

const positionValueUsd = computed(() => {
    if (!currentBchUsdPrice.value?.price_value) return 0
    return Number(positionValueLabel.value.replace(' BCH', '')) * Number(currentBchUsdPrice.value.price_value)
})

const canSubmit = computed(() =>
    !!authhead.value
    && tokenAmountBase.value > 0n
    && tokenAmountBase.value <= reserveAmount.value
    && bchAmountSats.value >= DEFAULT_TOKEN_VALUE
    && effectivePrice.value > 0
    && !!wallet.value?.utxos?.length
)

const bchAmountRules = computed(() => [
    (value: string) => !value
        || decimalToBigInt(value, BCH_DECIMALS) >= DEFAULT_TOKEN_VALUE
        || t('addLiquidityPage.minimumBch', { sats: DEFAULT_TOKEN_VALUE.toString() }),
])

const submitting = ref(false)

const addLiquidity = async () => {
    if (!canSubmit.value || !authhead.value) return

    const reserveUtxo = authhead.value
    const poolTokenValue = tokenAmountBase.value
    const poolSatoshiValue = bchAmountSats.value

    startLoader(txTaskList, () => {
        $q.notify({ type: 'warning', message: t('addLiquidityPage.cancelled') })
    })

    updateStep(TASK_INPUTS_CHECK, 'done')
    updateStep(TASK_PREPARE_TX, 'running')
    submitting.value = true

    try {
        const signRequest = createPoolFromFungibleReserves({
            fungibleReserveUtxo: reserveUtxo,
            authkeyUtxo: reserveUtxo.authkey as DecoratedUtxo,
            poolSatoshiValue,
            poolTokenValue,
            poolOwnerAddress: wallet.value.getTokenDepositAddress(0),
            poolOwnerBchUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
            funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK as Network,
            feeRateSatsPerKb: BigInt(import.meta.env.VITE_TX_FEE_RATE_SATS_PER_KB),
            userPrompt: t('addLiquidityPage.signPrompt', { token: symbol.value }),
        })
        updateStep(TASK_PREPARE_TX, 'done')
        updateStep(TASK_WAIT_FOR_SIG, 'running')
        const response = await signTransaction(signRequest, { signal: getSignal() })

        updateStep(TASK_WAIT_FOR_SIG, 'done')
        updateStep(TASK_BROADCASTING, 'running')

        const [broadcastError, txid] = await broadcastTransaction({
            transactionHex: response.signedTransaction,
            network: import.meta.env.VITE_BCH_NETWORK,
            onProgress: (progress: string) => {
                const label = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
                updateStep(TASK_BROADCASTING, 'running', label)
            },
        })

        if (broadcastError) {
            updateStep(TASK_BROADCASTING, 'failed')
            throw broadcastError
        }

        updateStep(TASK_BROADCASTING, 'done')
        updateStep(TASK_WAITING_PROPAGATION, 'running')

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet'
            ? NetworkType.Testnet
            : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({ txHash: txid })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'running')

        await db.saveActivity({
            event: t('addLiquidityPage.activityEvent', { token: symbol.value }),
            txid,
            status: 'success',
        })

        await updateActiveAuthhead({ authheadTxid: txid, bumpedRegistry: false })

        loadAuthkeys(wallet.value, true).then(() => {
            triggerRef(wallet)
        })

        updateStep(TASK_REFRESH_UTXOS, 'done')
        stopLoader(1000)

        // The deposit is now part of the pool; clear the form so the remaining reserves are not
        // resubmitted by a stray click.
        tokenAmountInput.value = ''
        bchAmountInput.value = ''

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('addLiquidityPage.successText', { token: symbol.value }),
                txid,
            },
        })
    } catch (error: any) {
        stopLoader(3000)
        if (error?.name === 'AbortError') return
        $q.notify({ type: 'negative', message: error.message })
    } finally {
        submitting.value = false
    }
}

watch([category, decimals], loadMarketPrice)

const goBack = () => router.back()

onMounted(async () => {
    await loadMarketPrice()
    currentBchUsdPrice.value = await getAssetPrices('BCH', 'USD')
})

</script>

<style scoped>
.cauldron-header-logo {
    display: block;
    width: 100%;
    max-width: 260px;
    /* The logo shares its row with the release badge, so it must be able to shrink. */
    min-width: 0;
    height: auto;
}
</style>
