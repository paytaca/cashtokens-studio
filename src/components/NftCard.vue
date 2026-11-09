<template>
    <q-card flat class="nft-card bg-dark-2 q-pa-md">
        <div class="row items-start q-gutter-md q-mb-md">
            <q-avatar size="64px" class="bg-grey-9 rounded-borders">
                <q-img v-if="iconUrl" :src="iconUrl" fit="cover" />
                <q-icon v-else name="image" color="grey-6" size="32px" />
            </q-avatar>
            <div class="col">
                <div class="text-subtitle1 text-weight-medium">{{ displayName }}</div>
                <div class="text-caption text-grey-5 text-mono q-mt-xs">
                    {{ bytecode ? commitment : `<0x${commitment}>` }}
                </div>
            </div>
        </div>

        <div class="media-viewport bg-grey-9 flex flex-center">
            <div v-if="loadingMedia" class="text-center">
                <q-spinner color="primary" size="48px" />
            </div>
            <img v-else-if="mediaType === 'image'" :src="mediaUrl" class="media-content" @error="onMediaError" />
            <video v-else-if="mediaType === 'video'" :src="mediaUrl" class="media-content" controls
                @error="onMediaError" />
            <audio v-else-if="mediaType === 'audio'" :src="mediaUrl" class="media-content" controls
                style="width: 100%; max-width: 400px" />
            <div v-else class="text-center text-grey-5">
                <q-icon name="image" size="64px" class="q-mb-sm block" />
                <div class="text-caption">{{ $t('nftCard.noMedia') }}</div>
            </div>
        </div>

        <div v-if="capability" class="row items-center q-mt-md">
            <q-badge v-if="capability === 'minting'" color="dark" text-color="purple-4"
                class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                {{ $t('dashboard.managed.badgeMinting') }}
            </q-badge>
            <q-badge v-else-if="capability === 'mutable'" color="dark" text-color="teal-8"
                class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                {{ $t('dashboard.managed.badgeMutable') }}
            </q-badge>
            <q-badge v-else-if="capability === 'none'" color="dark" text-color="grey-6"
                class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                {{ $t('dashboard.managed.badgeImmutable') }}
            </q-badge>
        </div>

        <div v-if="description" class="q-mt-md">
            <div class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                {{ $t('nftCard.description') }}
            </div>
            <div class="text-body2 text-grey-3">{{ description }}</div>
        </div>

        <div class="q-mt-md">
            <div class="text-caption text-grey-5 text-uppercase q-mb-xs" style="letter-spacing: 1px;">
                {{ $t('nftCard.attributes') }}
            </div>
            <div v-if="hasAttributes" class="q-gutter-y-xs">
                <div v-for="(value, key) in attributes" :key="key"
                    class="row items-center justify-between bg-grey-9 q-pa-sm border-radius-8">
                    <span class="text-body2 text-white">
                        <span class="text-weight-medium">{{ key }}:</span>
                        <span class="text-grey-4 q-ml-xs">{{ value }}</span>
                    </span>
                </div>
            </div>
            <div v-else class="text-caption text-grey-6">{{ $t('nftCard.noAttributes') }}</div>
        </div>

        <div v-if="!nftType" class="text-caption text-grey-6 q-mt-md">
            {{ $t('nftCard.noMetadata') }}
        </div>
    </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { commitmentToSequenceNumber } from 'src/core/bcmr'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { ipfsToGatewayUrl } from 'src/core/ipfs'

defineOptions({ name: 'NftCard' })

const props = defineProps<{
    nftType?: NftType
    commitment: string
    /** Parsable collection bytecode; parsable types render their raw bottom altstack. */
    bytecode?: string
    symbol?: string
    capability?: 'none' | 'minting' | 'mutable'
    /** Token identity icon, used when the NFT type has no icon of its own. */
    fallbackIcon?: string
}>()

const { t } = useI18n()

const iconUrl = computed(() => {
    const icon = props.nftType?.uris?.icon || props.fallbackIcon
    return icon ? ipfsToGatewayUrl(icon) : undefined
})

const description = computed(() => props.nftType?.description)

const sequence = computed(() => {
    try {
        return String(commitmentToSequenceNumber(props.commitment || '01'))
    } catch {
        return t('nftPage.authKeyNft.sequenceUnknown')
    }
})

/** Matches the fallback name NftPage gives an NFT before its registry record resolves. */
const displayName = computed(() => {
    if (props.nftType?.name) return props.nftType.name
    if (!props.symbol) return t('nftPage.noName')
    return props.bytecode
        ? `${props.symbol} #${props.commitment}`
        : `${props.symbol} #${sequence.value}`
})

const attributes = computed(
    () => ((props.nftType?.extensions as { attributes?: Record<string, string> } | undefined)?.attributes || {})
)

const hasAttributes = computed(() => Object.keys(attributes.value).length > 0)

const mediaUrl = ref('')
const mediaType = ref<'image' | 'video' | 'audio' | null>(null)
const loadingMedia = ref(false)

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif']
const videoExtensions = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv', 'wmv', 'flv']
const audioExtensions = ['mp3', 'wav', 'ogg', 'oga', 'flac', 'aac', 'm4a', 'wma', 'opus']

const detectMediaType = (url: string): 'image' | 'video' | 'audio' | null => {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || ''
    if (imageExtensions.includes(ext)) return 'image'
    if (videoExtensions.includes(ext)) return 'video'
    if (audioExtensions.includes(ext)) return 'audio'
    return null
}

const onMediaError = () => {
    mediaType.value = null
}

const loadMedia = async () => {
    const uri = props.nftType?.uris?.asset || props.nftType?.uris?.image || props.nftType?.uris?.web
    if (!uri) {
        mediaUrl.value = ''
        mediaType.value = null
        return
    }

    const url = ipfsToGatewayUrl(uri)
    if (!url) {
        mediaUrl.value = ''
        mediaType.value = null
        return
    }

    loadingMedia.value = true
    mediaUrl.value = url

    const byExtension = detectMediaType(url)
    if (byExtension) {
        mediaType.value = byExtension
        loadingMedia.value = false
        return
    }

    try {
        const response = await fetch(url, { method: 'HEAD' })
        const contentType = response.headers.get('content-type') || ''
        if (contentType.startsWith('image/')) mediaType.value = 'image'
        else if (contentType.startsWith('video/')) mediaType.value = 'video'
        else if (contentType.startsWith('audio/')) mediaType.value = 'audio'
        else mediaType.value = null
    } catch {
        mediaType.value = null
    } finally {
        loadingMedia.value = false
    }
}

watch(
    () => props.nftType?.uris?.asset || props.nftType?.uris?.image || props.nftType?.uris?.web,
    () => { void loadMedia() }
)

onMounted(() => { void loadMedia() })
</script>

<style scoped>
/* The global card style adds a border; the viewer card is borderless. */
.nft-card {
    border: none !important;
    box-shadow: none;
}

.border-radius-4 {
    border-radius: 4px;
}

.border-radius-8 {
    border-radius: 8px;
}

.font-8 {
    font-size: 0.75em;
}

.styled-capability-badge {
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.border-grey-8 {
    border: 1px solid #424242;
}

.media-viewport {
    overflow: hidden;
    position: relative;
    min-height: 300px;
    border-radius: 12px;
}

.media-content {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-height: 400px;
}
</style>
