<template>
    <div class="token-profile">
        <div class="row q-col-gutter-lg">
            <div class="col-12">
                <q-card flat class="bg-dark text-grey-1 rounded-borders full-height">
                    <q-card-section>
                        <div v-if="loading && !profile" class="flex flex-center q-py-xl">
                            <q-spinner color="primary" size="40px" />
                        </div>

                        <q-banner v-else-if="error && !profile" class="bg-warning text-dark rounded-borders">
                            <template v-slot:avatar>
                                <q-icon name="warning" />
                            </template>
                            {{ $t('tokenProfile.loadError') }}
                        </q-banner>

                        <template v-else-if="profile">
                            <div class="row items-center q-gutter-x-md">
                                <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1" flat>
                                    <q-img v-if="profile.iconUrl" :src="profile.iconUrl" fit="cover" />
                                    <q-icon v-else name="token" color="primary" size="32px" />
                                </q-avatar>

                                <div class="col">
                                    <div class="text-h5 text-weight-bold">
                                        {{ profile.symbol || $t('tokenProfile.unknownSymbol') }}
                                    </div>
                                    <div class="text-caption text-grey-5">
                                        {{ profile.name || $t('tokenProfile.unknownName') }}
                                    </div>
                                    <div class="q-mt-xs">
                                        <TokenCategory :tokenId="profile.category" />
                                    </div>
                                </div>

                                <slot name="actions">
                                    <q-spinner v-if="loading" color="primary" size="20px" />
                                </slot>
                            </div>

                            <div v-if="profile.description" class="q-mt-lg">
                                <div class="token-profile-label q-mb-xs">
                                    {{ $t('tokenProfile.description') }}
                                </div>
                                <div class="text-body2 text-grey-3">{{ profile.description }}</div>
                            </div>

                            <div v-if="profile.links.length" class="q-mt-lg">
                                <div class="token-profile-label q-mb-xs">
                                    {{ $t('tokenProfile.links') }}
                                </div>
                                <div class="row q-gutter-sm">
                                    <q-btn v-for="link in profile.links" :key="link.id" flat dense no-caps
                                        color="primary" class="text-capitalize" :icon="linkIcon(link.id)"
                                        :label="link.id" :href="link.uri" target="_blank" rel="noopener noreferrer" />
                                </div>
                            </div>
                        </template>
                    </q-card-section>

                    <slot />
                </q-card>
            </div>
            <div v-if="profile" class="col-12 column q-gutter-y-lg">
                <q-card v-if="profile.marketPrice" flat class="bg-grey-10 rounded-borders">
                    <q-card-section>
                        <div class="text-h6 text-weight-medium q-mb-md flex items-center">
                            <q-icon name="img:/images/cauldron-logo.png" size="lg" />
                            {{ $t('tokenProfile.marketPrice') }}
                        </div>
                        <div class="row q-col-gutter-md">
                            <span class="text-h6">1 {{ profile.symbol || shortenTokenId(profile.category) }} = {{
                                profile.marketPrice }} <q-icon name="img:/images/bitcoin-cash-circle.svg"></q-icon>
                            </span>
                        </div>
                    </q-card-section>
                </q-card>
                <q-card flat class="bg-grey-10 rounded-borders">
                    <q-card-section>
                        <div class="text-h6 text-weight-medium q-mb-md flex items-center">
                            <q-icon name="insights" color="primary" class="q-mr-sm" />
                            {{ $t('tokenProfile.supply.title') }}
                        </div>
                        <div class="row q-col-gutter-md">
                            <div v-for="stat in supplyStats" :key="stat.label" class="col-12 col-sm-6">
                                <div class="bg-dark q-pa-md rounded-borders full-height">
                                    <div class="token-profile-label flex items-center">
                                        <span>{{ stat.label }}</span>
                                        <q-icon v-if="stat.hint" name="info_outline" size="13px"
                                            class="q-ml-xs text-grey-6">
                                            <q-tooltip class="bg-grey-9 text-caption text-grey-4" max-width="260px">
                                                {{ stat.hint }}
                                            </q-tooltip>
                                        </q-icon>
                                    </div>
                                    <div class="text-h6 text-mono q-mt-xs supply-value">{{ stat.value }}</div>
                                </div>
                            </div>
                        </div>
                    </q-card-section>
                </q-card>

                <q-card v-if="profile.authchain" flat class="bg-grey-10 rounded-borders">
                    <q-card-section>
                        <div class="text-h6 text-weight-medium q-mb-md flex items-center">
                            <q-icon name="mdi-link-variant" color="primary" class="q-mr-sm" />
                            {{ $t('tokenProfile.authchain.title') }}
                        </div>

                        <div v-if="!profile.authchain.length" class="text-caption text-grey-5">
                            {{ $t('tokenProfile.authchain.empty') }}
                        </div>

                        <div v-else class="column q-gutter-y-sm">
                            <div v-for="entry in profile.authchain" :key="entry.txid"
                                class="authchain-entry bg-dark q-pa-md rounded-borders">
                                <div class="authchain-entry-lines">
                                    <div class="flex flex-wrap items-center q-gutter-x-xs">
                                        <q-badge :color="entry.isAuthhead ? 'primary' : 'grey-8'" text-color="dark"
                                            class="text-mono">
                                            #{{ entry.index }}
                                        </q-badge>
                                        <span class="text-caption text-uppercase text-grey-4 authchain-role">
                                            {{ roleLabel(entry) }}
                                        </span>
                                        <q-space />
                                        <span class="text-caption text-grey-5 authchain-time">
                                            {{ formatTimestamp(entry.timestamp) }}
                                        </span>
                                    </div>

                                    <div class="authchain-txid">
                                        <span class="text-caption text-mono text-grey-3 ellipsis">
                                            {{ shortenTokenId(entry.txid) }}
                                        </span>
                                        <CopyText :text="entry.txid" />
                                    </div>
                                </div>

                                <div v-if="entry.publication" class="q-mt-sm">
                                    <div v-if="entry.publication.contentHash"
                                        class="flex items-center text-caption text-grey-5 authchain-hash">
                                        <span class="q-mr-xs">{{ $t('tokenProfile.authchain.contentHash') }}:</span>
                                        <span class="text-mono text-grey-3 ellipsis">
                                            {{ shortenTokenId(entry.publication.contentHash) }}
                                        </span>
                                        <CopyText :text="entry.publication.contentHash" />
                                    </div>

                                    <div v-if="entry.publication.uris.length" class="row q-gutter-xs q-mt-xs">
                                        <div v-for="uri in entry.publication.uris" :key="uri"
                                            class="authchain-uri flex items-center no-wrap">
                                            <q-btn dense no-caps flat color="blue-4" :href="uriHref(uri)"
                                                target="_blank" rel="noopener noreferrer">
                                                <q-icon name="mdi-open-in-new" size="12px" class="q-mr-xs" />
                                                <span>{{ shortenUri(uri) }}</span>
                                                <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ uri }}
                                                </q-tooltip>
                                            </q-btn>
                                            <CopyText :text="uri" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </q-card-section>
                </q-card>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TokenCategory from 'src/components/TokenCategory.vue'
import CopyText from 'src/components/CopyText.vue'
import type { AuthchainEntry } from 'src/core/chaingraph'
import { inbrowserGatewayUrl, parseIpfsUrl } from 'src/core/ipfs'
import { shortenTokenId } from 'src/core/utils'
import type { TokenProfile } from 'src/composables/useTokenProfile'

defineOptions({ name: 'TokenProfile' })

const props = defineProps<{
    profile?: TokenProfile,
    loading?: boolean,
    error?: string,
}>()

const { t } = useI18n()

/** Standard BCMR URI identifiers worth giving a dedicated glyph; everything else gets a link icon. */
const LINK_ICONS: Record<string, string> = {
    web: 'language',
    blog: 'rss_feed',
    chat: 'chat',
    forum: 'forum',
    support: 'help',
    twitter: 'tag',
    facebook: 'facebook',
    github: 'code',
    git: 'code',
    instagram: 'photo_camera',
    linkedin: 'work',
    matrix: 'chat',
    reddit: 'forum',
    telegram: 'send',
    youtube: 'play_circle',
}

const linkIcon = (id: string) => LINK_ICONS[id] ?? 'link'

const roleLabel = (entry: AuthchainEntry) => {
    if (entry.index === 0) return t('tokenProfile.authchain.genesis')
    if (entry.isAuthhead) return t('tokenProfile.authchain.authhead')
    if (!entry.publication) return t('tokenProfile.authchain.identityOutputTransfer')
    return t('tokenProfile.authchain.metadataPublication')
}

const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return t('tokenProfile.unknown')
    const date = new Date(Number(timestamp) * 1000)
    if (Number.isNaN(date.getTime())) return t('tokenProfile.unknown')
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** BCMR publications point at IPFS CIDs or HTTPS registries; open the browsable form. */
const uriHref = (uri: string): string => {
    if (uri.startsWith('ipfs://')) {
        try {
            const { id, path } = parseIpfsUrl(uri)
            return inbrowserGatewayUrl(id, path)
        } catch {
            return uri
        }
    }
    return /^https?:\/\//i.test(uri) ? uri : `https://${uri}`
}

/**
 * Keep publication rows narrow: the full URI is available in the tooltip and copy button, so
 * the row only needs the scheme plus the ends of the identifier.
 */
const shortenUri = (uri: string, maxLength = 34): string => {
    if (uri.length <= maxLength) return uri
    const scheme = uri.match(/^(ipfs:\/\/|ipns:\/\/|https?:\/\/)/i)?.[0] ?? ''
    const identifier = uri.slice(scheme.length)
    if (identifier.length <= maxLength - scheme.length) return uri
    return `${scheme}${identifier.slice(0, 10)}…${identifier.slice(-6)}`
}

const groupDigits = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** Renders a raw token amount with its decimals and thousands separators, BigInt-safe. */
const formatAmount = (amount?: bigint): string => {
    if (amount === undefined) return t('tokenProfile.unknown')

    const decimals = props.profile?.decimals ?? 0
    const divisor = 10n ** BigInt(decimals)
    const whole = groupDigits((amount / divisor).toString())
    if (decimals === 0) return whole

    const fraction = (amount % divisor).toString().padStart(decimals, '0').replace(/0+$/, '')
    return fraction ? `${whole}.${fraction}` : whole
}

type SupplyStat = { label: string, value: string, hint?: string }

const supplyStats = computed<SupplyStat[]>(() => [
    {
        label: t('tokenProfile.supply.genesis'),
        value: formatAmount(props.profile?.genesisSupply),
    },
    {
        label: t('tokenProfile.supply.circulating'),
        value: formatAmount(props.profile?.circulatingSupply),
    },
    {
        label: t('tokenProfile.supply.reserved'),
        value: formatAmount(props.profile?.reservedSupply),
    },
    // {
    //     label: t('tokenProfile.supply.burned'),
    //     value: formatAmount(props.profile?.burnedSupply),
    //     hint: t('tokenProfile.supply.burnedNote'),
    // },
    {
        label: t('tokenProfile.supply.holders'),
        value: props.profile?.holders?.toLocaleString('en-US') ?? t('tokenProfile.unknown'),
    },
])
</script>

<style scoped>
.token-profile-label {
    color: var(--q-grey-5, #9e9e9e);
    font-size: 0.75rem;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.border-radius-8 {
    border-radius: 8px;
}

.full-height {
    height: 100%;
}

.supply-value {
    line-height: 1.25;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.authchain-entry {
    border: 1px solid #2c2c2c;
}

.authchain-entry-lines {
    display: flex;
    flex-direction: column;
    row-gap: 4px;
}

.authchain-txid {
    display: flex;
    align-items: center;
    min-width: 0;
}

.authchain-txid .ellipsis,
.authchain-hash .ellipsis {
    min-width: 0;
}

.authchain-role {
    letter-spacing: 0.5px;
    min-width: 0;
    overflow-wrap: anywhere;
}

.authchain-hash {
    min-width: 0;
}

.authchain-time {
    white-space: nowrap;
}

.authchain-uri {
    max-width: 100%;
    min-width: 0;
}

.authchain-uri :deep(.q-btn__content) {
    min-width: 0;
}
</style>
