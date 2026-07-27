<template>
  <div>
    <div class="row items-start q-gutter-md q-mb-lg">
      <q-avatar size="64px" class="bg-grey-9 border-radius-8 shadow-1" :class="{ 'cursor-pointer': allowEdit }"
        @click="allowEdit ? uploadMedia() : undefined">
        <q-img v-if="iconUrl" :src="iconUrl" fit="cover" />
        <q-icon v-else name="image" color="grey-6" size="32px" />
      </q-avatar>
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">{{ nft.name }}</div>
        <div class="text-caption text-grey-5 text-mono q-mt-xs">&lt;0x{{ commitment }}&gt;</div>
      </div>
      <div class="col text-right">
        <q-chip round color="accent" size="lg">#{{ sequenceNumber }}</q-chip>
      </div>
    </div>
    <div class="media-viewport bg-grey-9 border-radius-12 flex flex-center q-mb-lg" :style="{ minHeight: '300px' }"
      :class="{ 'cursor-pointer': allowEdit }" @click="allowEdit ? uploadMedia() : undefined">
      <div v-if="loadingMedia" class="text-center">
        <q-spinner color="primary" size="48px" />
      </div>
      <img v-else-if="mediaType === 'image'" :src="mediaUrl" class="media-content" @error="onMediaError" />
      <video v-else-if="mediaType === 'video'" :src="mediaUrl" class="media-content" controls @error="onMediaError" />
      <audio v-else-if="mediaType === 'audio'" :src="mediaUrl" class="media-content" controls @error="onMediaError"
        style="width: 100%; max-width: 400px" />
      <div v-else-if="!allowEdit" class="text-center text-grey-5">
        <q-icon name="image" size="64px" class="q-mb-sm block" />
        <div class="text-caption">No media</div>
      </div>
      <div v-else class="text-center text-grey-5">
        <q-icon name="add_photo_alternate" size="64px" class="q-mb-sm block" />
        <div class="text-caption">Click to add media</div>
      </div>
    </div>
    <div class="q-gutter-y-md">
      <FormField>
        <label class="text-caption text-grey-5 q-mb-xs" style="letter-spacing: 1px;">
          Sequence Number
        </label>
        <q-input v-model="sequenceNumber" :disable="!allowEdit" :min="0" :step="1" :rules="[
          (val: string) => {
            if (val === '' || val === null || val === undefined) return true
            if (!/^\d+$/.test(val)) return 'Sequence number must be a non-negative integer'
            if (typeof Number(val) !== 'number' || Number(val) < 0) return 'Sequence number cannot be negative'
            return true
          }
        ]" outlined dark />
      </FormField>
      <FormField>
        <label class="text-caption text-grey-5 q-mb-xs" style="letter-spacing: 1px;">
          Name
        </label>
        <q-input v-model="nft.name" outlined dark placeholder="Name" :disable="!allowEdit" />
      </FormField>
      <FormField>
        <label class="text-caption text-grey-5 q-mb-xs" style="letter-spacing: 1px;">
          Description
        </label>
        <q-input v-model="nft.description" outlined dark placeholder="Describe this NFT" :disable="!allowEdit" />
      </FormField>

      <FormField>
        <div class="row items-center justify-between q-mb-sm">
          <label class="text-caption text-grey-5" style="letter-spacing: 1px;">
            Attributes
          </label>
          <q-btn v-if="allowEdit" dense flat icon="add" color="primary" size="sm" label="Add Attribute"
            @click="addAttribute" />
        </div>
        <div v-if="Object.keys(attributes).length > 0" class="q-gutter-y-xs">
          <div v-for="(val, key) in attributes" :key="key"
            class="row items-center justify-between bg-grey-9 q-pa-sm border-radius-8">
            <div class="text-body2 text-white">
              <span class="text-weight-medium">{{ key }}:</span>
              <span class="text-grey-4 q-ml-xs">{{ val }}</span>
            </div>
            <q-btn v-if="allowEdit" dense flat round icon="close" size="sm" color="negative"
              @click="removeAttribute(key)" />
          </div>
        </div>
        <div v-else class="text-caption text-grey-6">No attributes</div>
      </FormField>

      <div v-if="allowEdit" class="row justify-end q-mt-lg q-gutter-x-md">
        <q-btn unelevated label="Close" @click="$emit('close')" />
        <q-btn unelevated color="primary" label="Save" :disable="!isModified" @click="$emit('save', nft)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { uploadFile } from 'src/core/ipfs'
import FormField from 'src/components/FormField.vue'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import { commitmentToSequenceNumber, sequenceNumberToCommitment } from 'src/core/bcmr'

const props = defineProps<{
  // commitment: string
  allowEdit?: boolean
}>()

const $q = useQuasar()

const sequenceNumber = ref<string>()

const emit = defineEmits<{
  save: [nft: NftType],
  close: []
}>()

const commitment = defineModel<string>('commitment', { required: true })
const nft = defineModel<NftType>('nft', { required: true })

const mediaUrl = ref('')
const mediaType = ref<'image' | 'video' | 'audio' | null>(null)
const loadingMedia = ref(false)

const initialNft = ref('')

const isModified = computed(() => JSON.stringify(nft.value) !== initialNft.value)

const iconUrl = computed(() => {
  const icon = nft.value.uris?.icon
  return icon ? ipfsToGatewayUrl(icon) : undefined
})

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

const loadMedia = async () => {
  const uri = nft.value.uris?.asset || nft.value.uris?.image || nft.value.uris?.web
  if (!uri) {
    mediaUrl.value = ''
    mediaType.value = null
    return
  }

  loadingMedia.value = true
  const url = ipfsToGatewayUrl(uri)
  mediaUrl.value = url as string

  const byExtension = detectMediaType(url as string)
  if (byExtension) {
    mediaType.value = byExtension
    loadingMedia.value = false
    return
  }

  try {
    const resp = await fetch(url as string, { method: 'HEAD' })
    const ct = resp.headers.get('content-type') || ''
    if (ct.startsWith('image/')) mediaType.value = 'image'
    else if (ct.startsWith('video/')) mediaType.value = 'video'
    else if (ct.startsWith('audio/')) mediaType.value = 'audio'
    else mediaType.value = null
  } catch {
    mediaType.value = null
  } finally {
    loadingMedia.value = false
  }
}

const onMediaError = () => {
  mediaType.value = null
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const createSquareThumbnail = async (file: File, maxSize: number): Promise<Blob> => {
  const url = URL.createObjectURL(file)
  const img = await loadImage(url)
  URL.revokeObjectURL(url)

  const size = Math.min(img.width, img.height)
  const offsetX = (img.width - size) / 2
  const offsetY = (img.height - size) / 2
  const targetSize = Math.min(maxSize, size)

  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9)
  })
}

const uploadMedia = () => {
  if (!props.allowEdit) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,video/*,audio/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    try {
      const isImage = file.type.startsWith('image/')
      const result = await uploadFile(file, file.name)
      const { cid } = result

      if (isImage) {
        const imgUrl = URL.createObjectURL(file)
        const img = await loadImage(imgUrl)
        URL.revokeObjectURL(imgUrl)

        if (img.width <= 400 && img.height <= 400 && img.width === img.height) {
          nft.value = {
            ...nft.value,
            uris: {
              ...nft.value.uris,
              asset: `ipfs://${cid}`,
              icon: `ipfs://${cid}`
            }
          }
        } else {
          const squareBlob = await createSquareThumbnail(file, 400)
          const thumbResult = await uploadFile(squareBlob, `thumb_${file.name}`)

          nft.value = {
            ...nft.value,
            uris: {
              ...nft.value.uris,
              asset: `ipfs://${cid}`,
              icon: `ipfs://${thumbResult.cid}`
            }
          }
        }
      } else {
        nft.value = {
          ...nft.value,
          uris: {
            ...nft.value.uris,
            web: `ipfs://${cid}`
          }
        }
      }

      await loadMedia()
      $q.notify({ type: 'positive', message: 'Media uploaded successfully' })
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.message || 'Upload failed' })
    }
  }
  input.click()
}

watch(() => nft.value.uris?.image || nft.value.uris?.asset || nft.value.uris?.web, () => {
  loadMedia()
})

watch(() => sequenceNumber.value, (newValue) => {
  if (newValue) {
    commitment.value = sequenceNumberToCommitment(newValue)
  }
})

onMounted(() => {
  if (commitment.value) {
    sequenceNumber.value = String(commitmentToSequenceNumber(commitment.value))
  }
  initialNft.value = JSON.stringify(nft.value)
  loadMedia()
})

const attributes = computed({
  get: () => ((nft.value.extensions as any)?.attributes || {}) as { [key: string]: string },
  set: (val) => {
    nft.value = {
      ...nft.value,
      extensions: {
        ...nft.value.extensions,
        attributes: val
      }
    }
  }
})

const addAttribute = () => {
  $q.dialog({
    component: NftAttributeDialog,
  }).onOk((result: { name: string, value: string }) => {
    attributes.value = { ...attributes.value, [result.name]: result.value }
  })
}

const removeAttribute = (key: string) => {
  const next = { ...attributes.value }
  delete next[key]
  attributes.value = next
}
</script>

<style scoped lang="scss">
.border-radius-8 {
  border-radius: 8px;
}

.border-radius-12 {
  border-radius: 12px;
}

.media-viewport {
  overflow: hidden;
  position: relative;

  &.cursor-pointer:hover {
    outline: 2px dashed rgba(255, 255, 255, 0.3);
    outline-offset: -2px;
  }
}

.media-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 400px;
}
</style>
