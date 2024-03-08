<!-- Quasar dialog -->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-pa-md full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5">
          {{ title || 'NFT' }}
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-form @submit.prevent="onSubmit">
          <div class="col-xs-12 q-gutter-y-sm items-center">
            <q-input :model-value="shortenTokenId(category)" label="Category"
              :rules="[(v) => v.length > 0 || 'Required']" bottom-slots disable borderless clearable>
              <template v-slot:before>
                <CopyText :text="shortenTokenId(category)" />
              </template>
            </q-input>
          </div>
          <div class="col-xs-6 q-gutter-y-sm items-center">
            <label>Send To </label>
            <q-input v-model="form.recipient" outlined
              :rules="[(v) => /^((bitcoincash:|bchtest:)?(z)[a-zA-Z0-9]{1,64})$/.test(v) || 'Enter a valid token addresss']"
              bottom-slots></q-input>
          </div>

          <div class="col-xs-6 q-gutter-y-sm items-center">
            <label>Type {{ !bytecode ? '(Sequence #)' : '(BottomAltStackHex)' }}</label>
            <q-input v-model="form.nftTypeKey" outlined :rules="[(v) => v.length > 0 || 'Required']"
              bottom-slots></q-input>
          </div>

          <div class="text-h6 q-my-lg">Metadata</div>
          <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
            <label>Name *</label>
            <q-input v-model="form.nftType.name" label="Name*" outlined clearable
              :rules="[(v) => v.length > 0 || 'Required']" bottom-slots></q-input>
          </div>
          <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
            <label>Description</label>
            <q-input v-model="form.nftType.description" label="Description" outlined clearable bottom-slots></q-input>
          </div>
          <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center"
            :style="$q.screen.xs ? 'margin-bottom: 2rem' : ''">
            <label>NFT Asset {{ assetFileUploading ? 'Uploading' : '' }}<q-spinner-dots v-if="assetFileUploading"
                color="warning" class="q-mr-sm"></q-spinner-dots></label>
            <div>
              <q-file ref="assetFileRef" v-model="assetFile" @rejected="() => $q.dialog({ message: 'File Rejected!' })"
                :disable="assetFileUploading" outlined bottom-slots class="hidden">
              </q-file>
              <q-input class="registry-field" v-model="form.nftType.uris!.asset" outlined autogrow bottom-slots
                placeholder="Click upload icon to upload or paste URL">

                <template v-slot:prepend>
                  <div @click.stop="assetFileRef.pickFiles()">
                    <q-spinner-box v-if="assetFileUploading" color="warning"></q-spinner-box>
                    <span v-else>
                      <q-avatar v-if="form.nftType.uris!.asset">
                        <q-img :src="ipfsToGatewayUrl(form.nftType.uris!.asset)"></q-img>
                      </q-avatar>
                      <q-btn v-else icon="upload_file" class="cursor-pointer" text-color="warning" dense />
                    </span>
                  </div>
                </template>

                <template v-slot:hint>
                  <span style="line-height: 1rem;">
                    This is the real-world asset tokenized by this NFT. E.g. a digital artwork, music etc...
                  </span>
                </template>
              </q-input>
            </div>
          </div>
          <div class="col-xs-12 col-md-8 q-my-lg q-gutter-y-sm items-center"
            :style="$q.screen.xs ? 'margin-bottom: 4rem' : 'margin-bottom: 2rem'">
            <label>NFT Icon {{ iconFileUploading ? 'Uploading' : '' }}<q-spinner-dots v-if="iconFileUploading"
                color="warning" class="q-mr-sm"></q-spinner-dots></label>
            <div>
              <q-file ref="iconFileRef" v-model="iconFile" accept=".jpg, .png, image/*"
                @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
                :disable="iconFileUploading" outlined bottom-slots class="hidden">
              </q-file>
              <q-input v-model="form.nftType.uris!.icon" outlined autogrow bottom-slots
                placeholder="Click upload icon to upload or paste URL">

                <template v-slot:prepend>
                  <div @click.stop=" iconFileRef.pickFiles()">
                    <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
                    <span v-else>
                      <q-avatar v-if="form.nftType.uris!.icon">
                        <q-img :src="ipfsToGatewayUrl(form.nftType.uris!.icon)"></q-img>
                      </q-avatar>
                      <q-btn v-else icon="upload_file" class="cursor-pointer" text-color="warning" dense />
                    </span>
                  </div>
                </template>

                <template v-slot:hint>
                  <span style="line-height: 1.2rem;">
                    It's recommended to provide an image as icon for this NFT so it'll show up nicely on user
                    interfaces.
                    Recommended max size is 400x400.
                  </span>
                </template>
              </q-input>
            </div>
          </div>
          <div class="col-xs-12 col-md-8 q-my-lg q-gutter-y-sm items-center">
            <div class="text-h6 ">Attributes<q-btn flat color="primary" icon="add" size="md" type="button"
                @click="openAttributeDialog" />
            </div>
          </div>
          <div class="col-xs-12 q-my-lg">
            <div class="row q-gutter-sm flex justify-evenly q-pa-md"
              :class="Object.keys(form.nftTypeAttributes).length > 0 ? 'bg-grey-10' : ''" style="border-radius: 15px;">
              <div v-for="attrKey, i in Object.keys(form.nftTypeAttributes)" class="col-auto" :key="i">
                <q-input v-model="form.nftTypeAttributes[attrKey]" :label="attrKey" outlined dense>

                  <template v-slot:after>
                    <q-icon name="remove" @click.stop="() => delete form.nftTypeAttributes[attrKey]" color="negative"
                      class="cursor-pointer">
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
          <q-card-actions align="right">
            <q-btn :label="cancel || 'Cancel'" color="negative" size="lg" flat @click="onDialogHide"></q-btn>
            <q-btn :label="ok || 'Ok'" color="primary" size="lg" flat type="submit"></q-btn>
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { NftType } from 'mainnet-js';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { onMounted, ref, watch } from 'vue';
import { ipfsToGatewayUrl, shortenTokenId } from 'src/app/utils'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import CopyText from 'src/components/CopyText.vue'

defineEmits([
  ...useDialogPluginComponent.emits,
])

const props = defineProps<{
  ok: string,
  cancel: string,
  title?: string,
  category: string,
  nftTypeKey: string | number,
  nftType?: NftType,
  bytecode?: string,
  recipient?: string
}>()

const $q = useQuasar()
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const assetFile = ref()
const assetFileRef = ref()
const assetPreviewUrl = ref()
const assetFileUploading = ref<boolean>(false)

const form = ref<{
  category: string,
  nftTypeKey: string | number,
  nftType: NftType,
  parseBytecode: string,
  nftTypeAttributes: { [key: string]: string },
  recipient: string,
}>({
  category: '',
  nftTypeKey: '',
  nftType: {
    name: '',
    description: '',
    uris: {
      icon: '',
      asset: ''
    }
  },
  nftTypeAttributes: {},
  parseBytecode: '',
  recipient: ''
})

const openAttributeDialog = () => {
  $q.dialog({
    component: NftAttributeDialog,
  }).onOk((attribute) => {
    form.value.nftTypeAttributes = { ...form.value.nftTypeAttributes, [attribute.name]: attribute.value }
  })
}

onMounted(() => {
  form.value.nftTypeKey = props.nftTypeKey
  form.value.category = props.category
  form.value.nftType = props.nftType || {
    name: '',
    description: '',
    uris: {
      icon: '',
      asset: ''
    }
  }
  form.value.recipient = props.recipient || ''
  form.value.nftTypeAttributes = props.nftType?.extensions?.attributes as { [key: string]: string } || {}

})

const uploadIconToIpfs = async () => {
  if (iconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', iconFile.value);
      if (iconPreviewUrl.value) {
        URL.revokeObjectURL(iconPreviewUrl.value)
      }
      iconPreviewUrl.value = URL.createObjectURL(iconFile.value)
      iconFileUploading.value = true
      const resp = await fetch(`api/tokens/nft/icon-upload?tokenId=${props.category}&commitment=${props.nftTypeKey}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      form.value.nftType.uris!.icon = respJson.uris?.ipfs
    } catch (error) {
      console.log(error)
    } finally {
      iconFileUploading.value = false
    }
  }
}

const uploadAssetToIpfs = async () => {
  if (assetFile.value) {
    try {
      const formData = new FormData();
      formData.append('file', assetFile.value);
      if (assetPreviewUrl.value) {
        URL.revokeObjectURL(assetPreviewUrl.value)
      }
      assetPreviewUrl.value = URL.createObjectURL(assetFile.value)
      assetFileUploading.value = true
      const resp = await fetch(`api/tokens/nft/asset-upload?tokenId=${props.category}&commitment=${props.nftTypeKey}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      form.value.nftType.uris!.asset = respJson.uris?.ipfs
    } catch (error) {
      console.log(error)
    } finally {
      assetFileUploading.value = false
    }
  }
}


watch(() => iconFile.value, async (b) => {
  if (b) { await uploadIconToIpfs() }
})


watch(() => assetFile.value, async (b) => {
  if (b) { await uploadAssetToIpfs() }
})

function onSubmit() {
  onDialogOK(form.value)
}
</script>
