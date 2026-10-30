<template>
    <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
        <div class="q-px-md q-px-md-xl content-container q-mt-xl q-gutter-y-lg">
            <ExplainerBanner class="q-my-md" icon="mdi-parachute" :title="$t('airdropIssuePage.pageTitle')"
                :description="$t('airdropIssuePage.pageSubtitle')" />

            <q-card v-if="!completedAirdrop" class="q-pa-lg rounded-borders airdrop-card q-gutter-y-lg">
                <!-- The token the airdrop is issued from -->
                <div class="row items-center no-wrap q-gutter-x-md">
                    <q-avatar size="44px" class="bg-grey-9 border-radius-8 shadow-1">
                        <q-img v-if="activeAuthhead?.identitySnapshot?.uris?.icon"
                            :src="ipfsToGatewayUrl(activeAuthhead?.identitySnapshot?.uris?.icon)!" fit="cover" />
                        <q-img v-else
                            :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${activeAuthhead?.token?.category || 'airdrop'}`"
                            fit="cover" />
                    </q-avatar>
                    <div class="col">
                        <div class="text-caption text-grey-5">
                            {{ $t('airdropIssuePage.tokenCaption') }}
                        </div>
                        <div class="text-subtitle1 text-weight-bold text-white">
                            {{ activeAuthhead?.identitySnapshot?.token?.symbol || activeAuthhead?.identitySnapshot?.name
                            }}
                        </div>

                    </div>
                    <div class="text-right">
                        <div class="text-subtitle1 text-weight-bold text-mono text-white">
                            {{ reservesFormatted }}
                        </div>
                        <div class="text-caption text-grey-5">
                            {{ $t('airdropIssuePage.reservesLabel') }}
                        </div>
                    </div>
                </div>

                <q-separator dark inset />

                <!-- 1. Recipient source -->
                <FormField>
                    <label>{{ $t('airdropIssuePage.recipientSource') }}</label>
                    <q-select v-model="recipientSource" :options="sourceOptions" dark outlined emit-value map-options />
                </FormField>

                <FormField v-if="recipientSource === 'list'">
                    <label>{{ $t('airdropIssuePage.addressesLabel') }}</label>
                    <q-input v-model="addressesInput" type="textarea" :autogrow="$q.screen.lt.sm" dark outlined
                        :placeholder="$t('airdropIssuePage.addressesPlaceholder')" />
                    <div class="flex justify-end">
                        <q-btn flat no-caps dense text-color="secondary" icon="upload_file"
                            :label="$t('airdropIssuePage.loadCsv')" @click="csvInput?.click()" />
                        <input ref="csvInput" type="file" accept=".csv,.txt" class="hidden"
                            @change="onCsvInputChanged" />
                    </div>
                </FormField>

                <FormField v-else-if="recipientSource === 'beacon-holders'">
                    <q-banner v-if="beaconHoldersError" class="bg-dark-2 rounded-borders">
                        <template #avatar>
                            <q-icon name="error_outline" color="warning" />
                        </template>
                        <span class="text-grey-4">{{ $t('airdropIssuePage.beaconHoldersError') }}</span>
                    </q-banner>
                    <template v-else-if="beaconHoldersLoading">
                        <div class="flex items-center q-gutter-x-sm">
                            <span class="text-grey-5 text-caption">{{ $t('airdropIssuePage.beaconHoldersLoading')
                                }}</span>
                            <q-spinner-dots color="grey-5" size="sm" />
                        </div>
                    </template>
                    <template v-else-if="beaconHolders.length === 0">
                        <span class="text-grey-5 text-caption">{{ $t('airdropIssuePage.beaconHoldersEmpty') }}</span>
                    </template>
                    <template v-else>
                        <q-input :model-value="beaconHolders.join(', ')" type="textarea" dark outlined readonly />
                        <div class="text-caption text-grey-5 q-mt-xs">
                            {{ $t('airdropIssuePage.beaconHoldersLoaded', { count: beaconHolders.length }) }}
                        </div>
                    </template>
                </FormField>

                <!-- Excluded addresses (duplicates, invalid, beyond the limit) -->
                <FormField v-if="excludedAddresses.length > 0">
                    <label>{{ $t('airdropIssuePage.excludedAddresses') }}</label>
                    <q-input :model-value="excludedAddresses.join(', ')" type="textarea" dark outlined readonly
                        :hint="$t('airdropIssuePage.excludedAddressesHint', { max: MAX_AIRDROP_RECIPIENTS })" />
                </FormField>

                <!-- 2. Amount per address -->
                <FormField>
                    <label>{{ $t('airdropIssuePage.amountPerAddress') }}</label>
                    <q-input v-model="amountPerAddress" dark outlined :rules="amountRules" hide-bottom-space
                        placeholder="0.0" />
                    <div v-if="recipientCount > 0 && amountPerAddress" class="text-caption text-grey-5 q-mt-xs">
                        {{ $t('airdropIssuePage.recipientsSummary', {
                            count: recipientCount,
                            total: totalAmountDecimal
                        }) }}
                    </div>
                </FormField>

                <!-- 3. Submit -->
                <div class="flex justify-end">
                    <q-btn color="primary" icon="mdi-parachute" :label="$t('airdropIssuePage.send')" no-caps
                        :disable="!walletIsReady || !canSubmit" @click="onSubmit" />
                </div>
            </q-card>

            <!-- Post-airdrop summary: replaces the form until the user starts another airdrop. -->
            <q-card v-if="completedAirdrop" class="q-pa-lg rounded-borders airdrop-card q-gutter-y-lg">
                <div class="row items-center no-wrap q-gutter-x-md">
                    <q-avatar size="44px" class="bg-secondary">
                        <q-icon name="mdi-parachute" size="28px" />
                    </q-avatar>
                    <div class="col">
                        <div class="text-subtitle1 text-weight-bold text-white">
                            {{ $t('airdropIssuePage.summaryTitle') }}
                        </div>
                        <div class="text-caption text-grey-5">
                            {{ $t('airdropIssuePage.summarySubtitle', {
                                count: completedAirdrop.recipients.length,
                                total: completedTotal
                            }) }}
                        </div>
                    </div>
                </div>

                <q-table flat dark :rows="summaryRows" :columns="summaryColumns" row-key="address"
                    :pagination="{ rowsPerPage: 0 }" hide-pagination class="border-radius-8">
                    <template v-slot:body-cell-address="props">
                        <q-td :props="props" class="text-mono" style="word-break: break-all">
                            {{ props.row.address }}
                        </q-td>
                    </template>
                </q-table>

                <div class="flex justify-end">
                    <q-btn color="primary" icon="replay" :label="$t('airdropIssuePage.doAnotherAirdrop')" no-caps
                        @click="doAnotherAirdrop" />
                </div>
            </q-card>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import { CashAddressType, decodeCashAddress } from 'bitauth-libauth-v3'
import { Network } from 'cashscript'
import { useAuthguardStore } from 'src/stores/authguard'
import { useWalletSigner } from 'src/composables/useWalletSigner'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import {
    airdropFungibleReserves,
    AIRDROP_MAX_RECIPIENTS,
    jsonFormSafeUtxoReviver,
    jsonReplacer
} from 'src/core/transaction'
import { getTokenHolders } from 'src/core/chaingraph'
import { getBeaconNftTokenCategory, MAX_AIRDROP_RECIPIENTS } from 'src/core/airdrop'
import { formatTokenAmount } from 'src/core/utils'
import { normalizeTokenDecimals } from 'src/core/bcmr'
import type { UtxoWithPath, UtxoWithAuthKey } from 'src/core/types'
import { db } from 'src/core/client-db'
import { broadcastTransaction } from 'src/services/transaction'
import {
    TASK_BROADCASTING,
    TASK_INPUTS_CHECK,
    TASK_PREPARE_TX,
    TASK_REFRESH_UTXOS,
    TASK_WAIT_FOR_SIG,
    TASK_WAITING_PROPAGATION,
    txTaskList,
    updateTxTaskLabel
} from 'src/utils'
import FormField from 'src/components/FormField.vue'
import ExplainerBanner from 'src/components/ExplainerBanner.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { ipfsToGatewayUrl } from 'src/core/ipfs'

const { t } = useI18n()
const $q = useQuasar()
const router = useRouter()
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog()
const { wallet, walletIsReady, signTransaction } = useWalletSigner()

const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { loadAuthkeys } = authguardStore

const recipientSource = ref<'list' | 'beacon-holders'>('list')
const addressesInput = ref('')
const csvInput = ref<HTMLInputElement | null>(null)
const amountPerAddress = ref('')
const beaconHolders = ref<string[]>([])
const beaconHoldersLoading = ref(false)
const beaconHoldersError = ref(false)

const sourceOptions = [
    { value: 'list', label: t('airdropIssuePage.sourceList') },
    { value: 'beacon-holders', label: t('airdropIssuePage.sourceBeaconHolders') },
]

const reserves = computed(() => BigInt(activeAuthhead.value?.token?.amount ?? 0))

const tokenDecimals = computed(() =>
    normalizeTokenDecimals(activeAuthhead.value?.identitySnapshot?.token?.decimals)
)

const reservesFormatted = computed(() => formatTokenAmount(
    reserves.value,
    activeAuthhead.value?.identitySnapshot?.token?.symbol || '',
    tokenDecimals.value,
    'none'
))

/** The raw comma separated list, whatever its origin (paste box, CSV, beacon holders). */
const rawAddresses = computed(() => {
    if (recipientSource.value === 'beacon-holders') return beaconHolders.value.join(', ')
    return addressesInput.value
})

/**
 * The pasted list is comma separated; newlines pasted around entries are treated as separators.
 * Only P2PKH token addresses are valid; duplicates, invalid entries, P2SH addresses and anything
 * beyond the recipient limit all land in the excluded list (P2SH additionally gets flagged).
 */
const parsedRecipients = computed(() => {
    const seen = new Set<string>()
    const valid: string[] = []
    const excluded: string[] = []
    const p2sh: string[] = []
    for (const candidate of rawAddresses.value.replace(/\r?\n/g, ',').split(',')) {
        const address = candidate.trim()
        if (!address) continue
        if (seen.has(address)) {
            excluded.push(address)
            continue
        }
        seen.add(address)
        const verdict = classifyAddress(address)
        if (verdict === 'p2sh') {
            p2sh.push(address)
            excluded.push(address)
            continue
        }
        if (verdict === 'invalid' || valid.length >= AIRDROP_MAX_RECIPIENTS) {
            excluded.push(address)
            continue
        }
        valid.push(address)
    }
    return { valid, excluded, p2sh }
})

const validAddresses = computed(() => parsedRecipients.value.valid)
const excludedAddresses = computed(() => parsedRecipients.value.excluded)
const p2shAddresses = computed(() => parsedRecipients.value.p2sh)

const recipientCount = computed(() => validAddresses.value.length)

const amountPerAddressRaw = computed(() => parseTokenAmount(amountPerAddress.value, tokenDecimals.value))

const totalAmount = computed(() =>
    BigInt(validAddresses.value.length) * amountPerAddressRaw.value
)

const totalAmountDecimal = computed(() => bigIntToDecimal(totalAmount.value, tokenDecimals.value))

const canSubmit = computed(() =>
    recipientCount.value > 0 &&
    amountPerAddressRaw.value > 0n &&
    totalAmount.value <= reserves.value
)

/** Snapshot of the last successful airdrop; non-null while the summary card is showing. */
const completedAirdrop = ref<{ recipients: string[]; amountPerRecipient: bigint; txid: string } | null>(null)

const completedTotal = computed(() => {
    const snapshot = completedAirdrop.value
    if (!snapshot) return ''
    return bigIntToDecimal(
        snapshot.amountPerRecipient * BigInt(snapshot.recipients.length),
        tokenDecimals.value
    )
})

const summaryRows = computed(() => {
    const snapshot = completedAirdrop.value
    if (!snapshot) return []
    const amount = formatTokenAmount(
        snapshot.amountPerRecipient,
        activeAuthhead.value?.identitySnapshot?.token?.symbol || '',
        tokenDecimals.value,
        'none'
    )
    return snapshot.recipients.map((address) => ({ address, amount }))
})

const summaryColumns: QTableColumn[] = [
    { name: 'address', label: t('airdropIssuePage.summaryAddressColumn'), field: 'address', align: 'left' },
    { name: 'amount', label: t('airdropIssuePage.summaryAmountColumn'), field: 'amount', align: 'right' },
]

/** Back to a fresh form; the beacon-holder cache is kept so re-selecting it won't refetch. */
const doAnotherAirdrop = () => {
    completedAirdrop.value = null
    addressesInput.value = ''
    amountPerAddress.value = ''
    recipientSource.value = 'list'
}

const amountRules = [
    (v: string) => parseTokenAmount(v, tokenDecimals.value) > 0n || t('airdropIssuePage.invalidAmount'),
    (v: string) => {
        const total = BigInt(validAddresses.value.length) * parseTokenAmount(v, tokenDecimals.value)
        return total <= reserves.value ||
            t('airdropIssuePage.insufficientReserves', { count: validAddresses.value.length })
    },
]

/** Only opted-in P2PKH token addresses may receive airdrops; P2SH is flagged separately. */
function classifyAddress(address: string): 'valid' | 'p2sh' | 'invalid' {
    const decoded = decodeCashAddress(address)
    if (typeof decoded === 'string') return 'invalid'
    if (decoded.type === CashAddressType.p2sh || decoded.type === CashAddressType.p2shWithTokens) return 'p2sh'
    return decoded.type === CashAddressType.p2pkhWithTokens ? 'valid' : 'invalid'
}

function parseTokenAmount(value: string, decimals: number): bigint {
    const parts = (value || '').trim().split('.')
    const whole = parts[0] || '0'
    if (!/^\d*$/.test(whole) || (parts[1] !== undefined && !/^\d*$/.test(parts[1]))) return 0n
    const fraction = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals)
    try {
        return BigInt(whole + fraction)
    } catch {
        return 0n
    }
}

function bigIntToDecimal(value: bigint, decimals: number): string {
    if (decimals === 0) return value.toString()
    const s = value.toString()
    if (s.length <= decimals) return '0.' + s.padStart(decimals, '0')
    return s.slice(0, -decimals) + '.' + s.slice(-decimals)
}

const onCsvFileSelected = async (file: File | null) => {
    if (!file) return
    addressesInput.value = await file.text()
}

/** Native input bridge: forwards the picked file and clears the input so
    picking the same file again still fires a change event. */
const onCsvInputChanged = async (event: Event) => {
    const input = event.target as HTMLInputElement
    await onCsvFileSelected(input.files?.[0] ?? null)
    input.value = ''
}

const loadBeaconHolders = async () => {
    beaconHoldersLoading.value = true
    beaconHoldersError.value = false
    try {
        const holders = await getTokenHolders({ category: getBeaconNftTokenCategory(), network: import.meta.env.VITE_BCH_NETWORK })
        beaconHolders.value = holders.filter((address) => classifyAddress(address) === 'valid')
    } catch {
        beaconHolders.value = []
        beaconHoldersError.value = true
    } finally {
        beaconHoldersLoading.value = false
    }
}

watch(recipientSource, (source) => {
    if (source === 'beacon-holders' && beaconHolders.value.length === 0 && !beaconHoldersError.value) {
        loadBeaconHolders()
    }
})

/** Guard for direct visits without a token picked from the managed tokens table. */
watch(() => activeAuthhead.value, (value) => {
    if (!value) {
        $q.notify({ type: 'warning', message: t('airdropIssuePage.noActiveAuthhead') })
        router.replace({ name: 'managed-tokens' })
    }
}, { immediate: true })

const onSubmit = async () => {
    if (!walletIsReady.value || !canSubmit.value) return

    if (p2shAddresses.value.length > 0) {
        $q.dialog({
            title: t('airdropIssuePage.p2shTitle'),
            message: t('airdropIssuePage.p2shMessage')
        })
        return
    }

    const authhead = activeAuthhead.value as UtxoWithAuthKey
    const recipients = validAddresses.value
    const airdropAmount = amountPerAddressRaw.value

    startLoader(txTaskList, () => {
        $q.notify({ type: 'warning', message: t('airdropIssuePage.cancelText') })
    })

    updateStep(TASK_INPUTS_CHECK, 'done')
    updateStep(TASK_PREPARE_TX, 'running')

    try {
        const issuerTokenUtxo = JSON.parse(
            JSON.stringify(authhead, jsonReplacer),
            jsonFormSafeUtxoReviver
        ) as UtxoWithAuthKey

        const signRequest = airdropFungibleReserves({
            issuerTokenUtxo,
            airdropTokenAmount: amountPerAddressRaw.value,
            recipientAddresses: recipients,
            authkeyUtxo: issuerTokenUtxo.authkey as UtxoWithPath,
            funderUtxos: (wallet.value?.utxos || []) as UtxoWithPath[],
            network: import.meta.env.VITE_BCH_NETWORK as Network,
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
                const newLabel = updateTxTaskLabel({
                    txTaskList: txTaskList,
                    taskId: TASK_BROADCASTING,
                    newTaskLabel: progress
                })
                updateStep(TASK_BROADCASTING, 'running', newLabel)
            },
        })

        if (broadcastError) {
            updateStep(TASK_BROADCASTING, 'failed')
            throw broadcastError
        }

        updateStep(TASK_BROADCASTING, 'done')
        updateStep(TASK_WAITING_PROPAGATION, 'running')

        await db.saveActivity({
            event: t('airdropIssuePage.activityEvent', { token: activeAuthhead.value?.identitySnapshot?.token?.symbol || activeAuthhead.value?.identitySnapshot?.name || activeAuthhead.value?.token?.category }),
            txid,
            status: 'success'
        })

        updateStep(TASK_WAITING_PROPAGATION, 'done')
        updateStep(TASK_REFRESH_UTXOS, 'running')

        await loadAuthkeys(wallet.value, true, true)

        updateStep(TASK_REFRESH_UTXOS, 'done')
        stopLoader(1000)

        amountPerAddress.value = ''
        completedAirdrop.value = { recipients: [...recipients], amountPerRecipient: airdropAmount, txid }

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: t('airdropIssuePage.successText', { count: recipients.length }),
                txid
            }
        })
    } catch (error: any) {
        stopLoader(3000)
        if (error?.name === 'AbortError') return
        $q.notify({
            type: 'Error',
            message: error?.message
        })
    }
}
</script>

<style scoped>
.page-root {
    max-width: 100vw;
    overflow-x: hidden;
}

.content-container {
    max-width: 80rem;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
    box-sizing: border-box;
}

.airdrop-card {
    border: 1px solid rgba(77, 182, 172, 0.35);
    background: linear-gradient(135deg,
            rgba(0, 137, 123, 0.12) 0%,
            rgba(30, 34, 43, 0.98) 55%);
}

.border-radius-8 {
    border-radius: 8px;
}

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}
</style>
