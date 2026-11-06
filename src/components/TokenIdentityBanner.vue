<template>
    <div class="row items-center no-wrap q-gutter-x-md">
        <q-avatar size="64px" class="token-identity-avatar bg-grey-9 rounded-borders overflow-hidden">
            <q-img v-if="iconUrl" :src="iconUrl" fit="cover" />
            <q-icon v-else name="token" color="primary" size="30px" />
        </q-avatar>

        <div class="col token-identity-details">
            <div class="row items-baseline q-gutter-x-sm">
                <span class="text-h6 text-weight-bold ellipsis">{{ symbol }}</span>
                <span v-if="name" class="text-caption text-grey-5 ellipsis token-identity-name">
                    {{ name }}
                </span>
            </div>

            <div v-if="category" class="row items-center q-gutter-x-xs q-mt-xs">
                <span class="text-caption text-mono text-grey-4">{{ shortenTokenId(category) }}</span>
                <CopyText :text="category" />
            </div>

            <div v-if="links.length" class="row q-gutter-xs q-mt-sm">
                <q-btn v-for="link in links" :key="link.id" flat dense no-caps size="sm" color="primary"
                    class="text-capitalize" :icon="linkIcon(link.id)" :label="link.id"
                    :href="link.href" target="_blank" rel="noopener noreferrer" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CopyText from 'src/components/CopyText.vue'
import type { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { inbrowserGatewayUrl, ipfsToGatewayUrl, parseIpfsUrl } from 'src/core/ipfs'
import { shortenTokenId } from 'src/core/utils'

defineOptions({ name: 'TokenIdentityBanner' })

const props = defineProps<{
    identitySnapshot?: IdentitySnapshot,
    /** Overrides the snapshot's token category, e.g. the category currently being viewed. */
    category?: string,
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

const symbol = computed(() => props.identitySnapshot?.token?.symbol || t('tokenProfile.unknownSymbol'))
const name = computed(() => props.identitySnapshot?.name)
const category = computed(
    () => props.category || props.identitySnapshot?.token?.category || ''
)

/** Resolve the registry icon through the same gateway pipeline the rest of the app uses. */
const iconUrl = computed(() => {
    const icon = props.identitySnapshot?.uris?.icon
    return icon ? ipfsToGatewayUrl(icon) : undefined
})

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

/** Every declared URI except the icon, which is already rendered as the avatar. */
const links = computed(() =>
    Object.entries(props.identitySnapshot?.uris ?? {})
        .filter(([id, uri]) => id !== 'icon' && !!uri)
        .map(([id, uri]) => ({ id, href: uriHref(uri) }))
)
</script>

<style scoped>
/* Flex items only shrink below their content width with an explicit min-width. */
.token-identity-details,
.token-identity-name {
    min-width: 0;
}

/* q-avatar is a fixed-size inline-block; keep long text from squeezing it. */
.token-identity-avatar {
    flex: none;
}
</style>
