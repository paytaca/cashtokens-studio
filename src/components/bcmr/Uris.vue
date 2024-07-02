<template>
  <div>
    <div v-if="title" class="text-h6 q-my-lg flex items-center q-gutter-x-md">
      <div class="q-gutter-x-xs"><q-icon name="link"></q-icon><span>{{ title || 'Links' }}</span></div>
      <q-btn v-if="enableAddUri" @click="addUri" text-color="primary" icon="add"></q-btn>
    </div>
    <div class="q-col-gutter-y-md">
      <div>
        <!-- <q-file ref="iconFileRef" v-model="iconFile" accept=".jpg, .png, image/*"
          @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
          :disable="iconFileUploading" outlined bottom-slots class="hidden">
        </q-file> -->
        <q-file ref="iconFileRef" v-model="iconFile"
          @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
          :disable="iconFileUploading" outlined bottom-slots class="hidden">
        </q-file>
        <q-input v-model="uris!.icon" outlined bottom-slots label="Icon"
          placeholder="Enter icon's URL or upload an icon">
          <template v-slot:prepend>
            <q-avatar v-if="uris!.icon">
              <q-img :src="ipfsToGatewayUrl(uris!.icon)"></q-img>
            </q-avatar>
          </template>

          <template v-slot:append>
            <div v-if="enableIconUpload" @click.stop="iconFileRef.pickFiles()">
              <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
              <span v-else>
                <q-btn icon="upload_file" class="cursor-pointer" text-color="warning" label="Upload Icon" dense
                  no-caps />
              </span>
            </div>
          </template>
        </q-input>
      </div>
      <div v-if="uris.web != undefined">
        <q-input label="Web" :model-value="uris['web']" @update:model-value="onUpdateModelValue"
          @focus="selectedUriName = 'web'" outlined>
          <template v-slot:after>
            <q-btn icon="remove" @click="() => deleteUri('web')" text-color="negative"> </q-btn>
          </template>
        </q-input>
      </div>
      <div v-for="uriName, i in Object.keys(uris || {})" :key="'uris' + i">
        <q-input v-if="uriName != 'icon' && uriName != 'asset' && uriName != 'web'" :label="uriName"
          :model-value="uris[uriName]" @update:model-value="onUpdateModelValue" @focus="selectedUriName = uriName"
          outlined>
          <template v-slot:after>
            <q-btn icon="remove" @click="() => deleteUri(uriName)" text-color="negative"></q-btn>
          </template>
        </q-input>
      </div>
      <div class="col-xs-12 col-sm-6">
        <q-dialog v-model="dialog" @before-show="onBeforeDialogShow" @before-hide="onBeforeDialogHide" class="q-pa-lg">
          <q-card style="min-width: 400px">
            <q-card-section>
              <div class="text-h6">Add Link</div>
            </q-card-section>
            <q-card-section class="q-pt-none q-gutter-lg">
              <q-select v-model="selectedUriName" :options="options" label="Name" stack-label class="text-capitalize"
                outlined />
              <q-input :model-value="uris[selectedUriName]" @update:model-value="onUpdateModelValue" label="Enter a URL"
                outlined autofocus />
            </q-card-section>
            <q-card-actions align="right" class="text-primary q-my-lg">
              <q-btn label="Add" v-close-popup size="lg" />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { URIs } from 'mainnet-js'
import { IconStorageArtifact, uploadIcon, upload as uploadToIPFS } from 'src/app/ipfs';
import { defineComponent, defineModel, ref, watch } from 'vue'
import { ipfsToGatewayUrl, isSquareImage } from 'src/app/utils'
import { useQuasar } from 'quasar';

const $q = useQuasar()
const emit = defineEmits(['icon-file-uploading'])
defineComponent({ name: 'UrisComponent' })
export type UrisProps = {
  title?: string,
  /**
   * Used as param when uploading icon
   */
  tokenId?: string,
  enableIconUpload?: boolean,
  enableAssetUpload?: boolean,
  enableAddUri?: boolean
}
const props = defineProps<UrisProps>()
const dialog = ref<boolean>()
const options = [
  'web',
  'telegram',
  'youtube',
  'twitter',
  'reddit',
  'discord',
  'blog',
  'forum',
  'chat',
  'support',
]
const selectedUriName = ref<string>('web')
const uris = defineModel<URIs>('uris', { required: true })
const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const iconFileUploadArtifact = ref<IconStorageArtifact>()


const addUri = () => {
  dialog.value = true
  selectedUriName.value = 'temp'
}

const deleteUri = (uriName: string) => {
  delete uris.value[uriName]
}


const onUpdateModelValue = (v: string | number | null) => {
  if (!uris.value) {
    uris.value = {}
  }
  uris.value[selectedUriName.value] = String(v)
}

watch(() => iconFile.value, async (v) => {
  if (v) {
    const artifact = await uploadToIPFS(iconFile.value, { tokenId: props.tokenId ?? '' })
    console.log('ARTIFACT', artifact)

    const squareIcon = await isSquareImage(v)
    if (!squareIcon) {
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
      emit('icon-file-uploading', true)
      try {
        // const artifact = await uploadIcon(iconFile.value, props.tokenId ?? '')
        // uris.value!.icon = artifact?.iconUris.ipfs || ''
        const artifact = await uploadToIPFS(iconFile.value, { tokenId: props.tokenId ?? '' })
        console.log('ARTIFACT', artifact)

      } catch (error) {
        console.log(error)
      } finally {
        iconFileUploading.value = false
        emit('icon-file-uploading', false)
      }
    }



  }
})


const onBeforeDialogShow = () => {
  if (!uris.value) {
    uris.value = {}
  }
  for (const o of options) {
    if (!uris.value[o]) {
      selectedUriName.value = o
      break
    }
  }
}

const onBeforeDialogHide = () => {
  if (uris.value && !uris.value[selectedUriName.value]) {
    delete uris.value[selectedUriName.value]
  }
}

</script>