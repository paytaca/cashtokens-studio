<template>
  <div>
    <q-file ref="iconFileRef" v-model="iconFile"
      @rejected="() => $q.notify({ message: 'File rejected, make sure to upload an image file!' })"
      :disable="iconFileUploading" outlined bottom-slots class="hidden">
    </q-file>
    <slot name="header">
      <div class="flex justify-between items-center">
        <h5 class="q-my-sm text-bold q-gutter-x-sm">
          <q-icon name="link"></q-icon><span>{{ t('label.registry.uris') }}</span>
        </h5>
        <q-toggle v-if="hideable" :false-value="true" :true-value="false" color="red" v-model="hidden" />
      </div>
    </slot>
    <template v-if="uris && !hidden">
      <FormField v-for="key, i in urisKeys" :key="i">
        <q-label>{{ t(key) }}</q-label>
        <q-input v-model="uris[key]" class="full-width" filled>
          <template v-slot:prepend>
            <q-avatar v-if="key === 'icon' && uris.icon">
              <q-img v-if="uris.icon" :src="iconDisplayUrl as string" />
            </q-avatar>
          </template>
          <template v-slot:append>
            <div v-if="key === 'icon' && enableIconUpload" @click.stop="iconFileRef.pickFiles()">
              <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
              <span v-else>
                <q-btn icon="upload_file" class="cursor-pointer" :label="t('button.upload')" dense />
              </span>
            </div>
          </template>
        </q-input>
      </FormField>
      <FormField>
        <div class="flex justify-end">
          <q-btn icon="add" @click="addUri = true">{{ t('button.addUri') }}</q-btn>
        </div>
      </FormField>
    </template>
    <q-dialog v-model="addUri">
      <q-card class="q-py-md">
        <q-toolbar>
          <q-avatar>
            <q-icon name="link" size="lg"></q-icon>
          </q-avatar>
          <q-toolbar-title><span class="text-weight-bold">{{ t('button.addUri') }}</span>
          </q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-card-section :style="$q.screen.xs ? 'min-width: 90vw' : 'min-width:40vw'">
          <FormField>
            <q-label>{{ t('label.registry.uriName') }}</q-label>
            <q-select v-model="addUriKey" :options="addUriOptions" @filter="filterFn" use-input fill-input
              input-debounce="0" hide-selected filled></q-select>
          </FormField>
          <FormField>
            <q-label>{{ t('label.registry.uri') }}</q-label>
            <q-input v-model="addUriValue" filled></q-input>
          </FormField>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" :disable="!addUriKey || !addUriValue"
            @click="() => onAddUriClick(addUriKey!, addUriValue!)">{{ t('Add') }}</q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { URIs } from 'src/core/bcmr/bcmr-v2.schema'
import FormField from '../FormField.vue';
import { useQuasar } from 'quasar';
import { ipfsToGatewayUrl, uploadFile } from 'src/core/ipfs';
const { t } = useI18n()
const $q = useQuasar()
const props = defineProps<{
  hideable?: boolean,
  enableIconUpload?: boolean,
  iconName?: string
}>()
const uris = defineModel<URIs>('uris', { required: true })
const hidden = ref<boolean>(false)
const urisKeys = computed(() => {
  return Object.keys(uris.value || {})
})
const addUri = ref<boolean>(false)
const addUriOptions = ref<string[]>()
const addUriKey = ref<string>()
const addUriValue = ref<string>()

const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)

const iconDisplayUrl = computed(() => {
  const uri = uris.value?.icon
  if (uri?.startsWith('ipfs://')) {
    return `/api/ipfs/${uri.replace('ipfs://', '')}`
  }
  return uri
})

const identitySnapshotUriOptionsSet = [
  'icon',
  'web',
  'chat',
  'image',
  'migrate',
  'support'
]

const socialUriOptionsSet = [
  `discord`, `docker`,
  `facebook`, `git`, `github`, `gitter`, `instagram`, `linkedin`, `matrix`,
  `npm`, `reddit`, `slack`, `substack`, `telegram`, `twitter`, `wechat`,
  `youtube`
]

const uriOptions = new Set(identitySnapshotUriOptionsSet.concat(socialUriOptionsSet))
const existingUris = new Set(Object.keys(uris || {}))
const uniqueOptions = [...uriOptions.difference(existingUris).values()]

const filterFn = (val: string, update: any) => {
  console.log('val', val, update)
  if (val === '') {
    update(() => {
      addUriOptions.value = uniqueOptions
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    addUriOptions.value = uniqueOptions.filter(
      v => v.toLowerCase().indexOf(needle) > -1
    )
  })
}

const onAddUriClick = (key: string, value: string) => {
  uris.value[key] = value
  addUri.value = false
}

watch(() => iconFile.value, async (v) => {
  if (v) {
    // const squareIcon = await isSquareImage(v)
    if (!true) {
      $q.dialog({
        message: `Please provide a square icon. Recommended dimension is 400px by 400px.
        Icons should also be suitable for display against light and dark backgrounds. Transparency is supported.`
      })
    } else {
      if (iconPreviewUrl.value) {
        URL.revokeObjectURL(iconPreviewUrl.value)
      }
      iconPreviewUrl.value = URL.createObjectURL(iconFile.value)
      iconFileUploading.value = true
      try {
        const uploadResponse = await uploadFile(iconFile.value, props.iconName || 'test.jpeg')
        if (uploadResponse.cid) {
          uris.value.icon = `ipfs://${uploadResponse.cid}`
        }
      } catch (error) {
        console.log(error)
      } finally {
        iconFileUploading.value = false
      }
    }
  }
})

</script>