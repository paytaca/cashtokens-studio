<template>
    <q-table :rows="rows" :columns="columns" flat dark :loading="loading" v-model:pagination="pagination"
        :rows-per-page-options="[ROWS_PER_PAGE]" @request="onRequest" class="on-chain-tokens-table">
        <template v-slot:body-cell-nft="props">
            <q-td :props="props">
                <div class="flex items-center no-wrap q-gutter-x-md">
                    <div class="flex column items-center">
                        <div class="nft-avatar">
                            <q-icon name="token" size="14px" class="text-grey-5" />
                            <img v-if="iconUrl(props.row)" :src="iconUrl(props.row)!" alt="" class="nft-avatar-img"
                                :class="{ 'nft-avatar-loaded': loadedIcons.has(props.row.commitment) }"
                                @load="onIconLoad(props.row.commitment)" @error="onIconError(props.row.commitment)" />
                            <img v-else :src="identiconUrl(props.row)" alt=""
                                class="nft-avatar-img nft-avatar-placeholder" />
                        </div>
                        <span v-if="!nftTypeOf(props.row)?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                            style="line-height: 1;">{{ t('onChainTokens.noIcon') }}</span>
                        <span v-else class="text-grey-6 font-8 q-mt-xs" style="line-height: 1;"></span>
                    </div>
                    <div class="nft-cell">
                        <span class="text-bold">{{ nftName(props.row) }}</span>
                        <div class="icon-badge-hex text-grey-8 word-break-all">
                            <span v-if="props.row.commitment">&lt;{{ props.row.commitment }}&gt;</span>
                            <span v-else>—</span>
                        </div>
                        <div class="flex items-center q-gutter-x-sm">
                            <div class="text-grey-5">NFT Capability:</div>

                            <q-badge v-if="props.row.capability === 'minting'" color="dark" text-color="purple-4"
                                class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                                {{ $t('dashboard.managed.badgeMinting') }}
                            </q-badge>
                            <q-badge v-else-if="props.row.capability === 'mutable'" color="dark" text-color="teal-8"
                                class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                                <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                                {{ $t('dashboard.managed.badgeMutable') }}
                            </q-badge>
                            <q-badge v-else-if="props.row.capability === 'none'" color="dark" text-color="grey-6"
                                class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                                <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                                {{ $t('dashboard.managed.badgeImmutable') }}
                            </q-badge>
                        </div>
                        <div v-if="props.row.amount > 0" class="text-caption text-grey-5">
                            {{ t('onChainTokens.fungibleAmount') }} {{ formatAmount(props.row.amount) }}
                        </div>
                    </div>
                </div>
            </q-td>
        </template>

        <template v-slot:body-cell-amount="props">
            <q-td :props="props" class="text-mono text-right">
                {{ formatAmount(props.row.amount) }}
            </q-td>
        </template>

        <template v-slot:no-data>
            <div class="text-grey-5 text-center q-pa-md">{{ t('onChainTokens.noData') }}</div>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QTableColumn } from 'quasar'
import { normalizeTokenDecimals, type CashtokenOutput } from 'src/core/bcmr'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { formatTokenAmount } from 'src/core/utils'

/** The indexer's page size is fixed at 10; keep the table in lock-step with it. */
const ROWS_PER_PAGE = 10

const EMPTY_NFT_TYPES = new Map<string, NftType>()

const props = defineProps<{
    rows: CashtokenOutput[]
    nftTypes?: Map<string, NftType>
    loading: boolean
    total: number
    decimals: number
}>()

const emit = defineEmits<{
    (e: 'request', pagination: { page: number, rowsPerPage: number }): void
}>()

const { t } = useI18n()

const columns = computed((): QTableColumn[] => [
    { name: 'nft', label: t('onChainTokens.nft'), field: 'commitment', align: 'left' },
    // { name: 'amount', label: t('onChainTokens.amount'), field: 'amount', align: 'right' },
])

const pagination = ref({
    page: 1,
    rowsPerPage: ROWS_PER_PAGE,
    rowsNumber: 0,
})

watch(() => props.total, (total) => {
    pagination.value.rowsNumber = total
})

const decimals = computed(() => normalizeTokenDecimals(props.decimals))

const nftTypeOf = (row: CashtokenOutput) => (props.nftTypes ?? EMPTY_NFT_TYPES).get(row.commitment)

const nftName = (row: CashtokenOutput) => nftTypeOf(row)?.name || t('onChainTokens.noMetadata')

const iconUrl = (row: CashtokenOutput) => {
    const icon = nftTypeOf(row)?.uris?.icon
    return icon ? ipfsToGatewayUrl(icon) : undefined
}

/** Generated identicon placeholder for tokens without registry icon metadata. */
const identiconUrl = (row: CashtokenOutput) =>
    `https://api.dicebear.com/10.x/identicon/svg?seed=${encodeURIComponent(row.commitment || row.capability)}`

/**
 * The registry icon is layered over the placeholder and only revealed once it has actually
 * loaded, so a slow proxy can never hold the row display hostage.
 */
const loadedIcons = ref(new Set<string>())

watch(() => props.rows, () => {
    loadedIcons.value = new Set()
})

const onIconLoad = (commitment: string) => {
    loadedIcons.value.add(commitment)
}

const onIconError = (commitment: string) => {
    loadedIcons.value.delete(commitment)
}

const formatAmount = (amount: number) => formatTokenAmount(amount, '', decimals.value, 'none')

const onRequest = (requestProps: { pagination: { page: number } }) => {
    pagination.value.page = requestProps.pagination.page
    pagination.value.rowsPerPage = ROWS_PER_PAGE
    emit('request', pagination.value)
}
</script>

<style scoped lang="scss">
.on-chain-tokens-table {
    border-radius: 12px;
}

.nft-avatar {
    position: relative;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.nft-avatar-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;

    &.nft-avatar-loaded {
        opacity: 1;
    }

    &.nft-avatar-placeholder {
        opacity: 1;
    }
}

.nft-cell {
    min-width: 0;
}

.icon-badge-hex {
    font-family: 'Courier New', Courier, monospace;
}

.border-radius-4 {
    border-radius: 4px;
}

.word-break-all {
    word-break: break-all;
}
</style>
