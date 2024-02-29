<!-- Quasar dialog -->
<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" full-width persistent>
    <q-card class="q-px-sm full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5  text-center">
          {{ title || 'NFT Metadata' }}
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="row justify-center q-gutter-lg">
          <div class="col-xs-12 col-sm-8 col-lg-5">
            <div class="text-h6">
              Details
            </div>
            <q-form ref="form" class="q-gutter-md" @submit.prevent="onOk">
              <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
                <label>Name *</label>
                <q-input class="registry-field" v-model="nftType.name"
                  placeholder="E.g. `Art - 1`, `ACME Stadium Tickets`" :rules="[v => v.length > 0 || 'Required']" outlined
                  required autofocus>
                </q-input>
              </div>
              <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
                <label>Description</label>
                <q-input class="registry-field" v-model="nftType.description" placeholder="Describe this NFT" outlined
                  autogrow>
                </q-input>
              </div>
              <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center"
                :style="$q.screen.xs ? 'margin-bottom: 2rem' : ''">
                <label>NFT Asset {{ assetFileUploading ? 'Uploading' : '' }}<q-spinner-dots v-if="assetFileUploading"
                    color="warning" class="q-mr-sm"></q-spinner-dots></label>
                <div>
                  <q-file ref="assetFileRef" v-model="assetFile" @rejected="() => console.log('rejected')"
                    :disable="assetFileUploading" outlined bottom-slots class="hidden">
                  </q-file>
                  <q-input class="registry-field" v-model="nftType.uris!.asset" outlined autogrow bottom-slots
                    placeholder="Click upload icon to upload or paste URL">
                    <template v-slot:prepend>
                      <div @click.stop="assetFileRef.pickFiles()">
                        <q-spinner-box v-if="assetFileUploading" color="warning"></q-spinner-box>
                        <span v-else>
                          <q-avatar v-if="nftType.uris!.asset">
                            <q-img :src="ipfsToGatewayUrl(nftType.uris!.asset)"></q-img>
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
                  <q-file ref="iconFileRef" v-model="iconFile" @rejected="() => console.log('rejected')"
                    :disable="iconFileUploading" outlined bottom-slots class="hidden">
                  </q-file>
                  <q-input v-model="nftType.uris!.icon" outlined autogrow bottom-slots
                    placeholder="Click upload icon to upload or paste URL">
                    <template v-slot:prepend>
                      <div @click.stop=" iconFileRef.pickFiles()">
                        <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
                        <span v-else>
                          <q-avatar v-if="nftType.uris!.icon">
                            <q-img :src="ipfsToGatewayUrl(nftType.uris!.icon)"></q-img>
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
            </q-form>
          </div>
          <div class="col-xs-12 col-sm-8 col-lg-5">
            <div class="text-h6 ">Attributes<q-btn flat color="primary" icon="add" size="md" @click="openAttributeDialog"
                type="button" />
            </div>
            <div class="row q-gutter-md flex justify-between  q-mx-auto q-mt-lg  q-pa-lg rounded-borders"
              :class="Object.keys(nftTypeAttributes).length > 0 ? 'bg-grey-10' : ''">
              <div v-for="attrKey, i in Object.keys(nftTypeAttributes)" class="q-gutter-y-sm" :key="i">
                <label>{{ attrKey }}</label>
                <q-input v-model="nftTypeAttributes[attrKey]" outlined dense>
                  <template v-slot:after>
                    <q-icon name="remove" @click.stop="() => delete nftTypeAttributes[attrKey]" color="negative"
                      class="cursor-pointer">
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </div>
        <div class="row justify-end q-gutter-x-lg q-mb-lg q-mr-lg ">
          <q-btn @click.stop="onDialogHide()" text-color="negative" size="lg">Cancel</q-btn>
          <q-btn @click.stop="(e) => form.submit(e)" color="primary" size="lg" type="submit">Ok</q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { IdentitySnapshot, NftType, TokenI } from 'mainnet-js'
import { ipfsToGatewayUrl } from 'src/app/utils'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'

const $q = useQuasar()
defineEmits([
  ...useDialogPluginComponent.emits,
])
const props = defineProps<{
  token: TokenI,
  identitySnapshot: IdentitySnapshot,
  defaultNftType?: NftType,
  title?: string
}>()

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const form = ref()
const nftType = ref<NftType>({
  name: '',
  uris: {
    icon: '',
    asset: '',
    image: ''
  }
})
const nftTypeAttributes = ref<{ [name: string]: string }>({})
const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const assetFile = ref()
const assetFileRef = ref()
const assetPreviewUrl = ref()
const assetFileUploading = ref<boolean>(false)

const uploadIconToIpfs = async () => {
  if (iconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', iconFile.value);
      console.log(iconFile.value)
      if (iconPreviewUrl.value) {
        URL.revokeObjectURL(iconPreviewUrl.value)
      }
      iconPreviewUrl.value = URL.createObjectURL(iconFile.value)
      iconFileUploading.value = true
      const resp = await fetch(`api/tokens/nft/icon-upload?tokenId=${props.token.tokenId}&commitment=${props.token.commitment}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      nftType.value.uris!.icon = respJson.uris?.ipfs
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
      const resp = await fetch(`api/tokens/nft/asset-upload?tokenId=${props.token.tokenId}&commitment=${props.token.commitment}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      nftType.value.uris!.asset = respJson.uris?.ipfs
    } catch (error) {
      console.log(error)
    } finally {
      assetFileUploading.value = false
    }
  }
}

const openAttributeDialog = () => {
  $q.dialog({
    component: NftAttributeDialog,
  }).onOk((attribute) => {
    nftTypeAttributes.value = { ...nftTypeAttributes.value, [attribute.name]: attribute.value }
  })
}

const onOk = async () => {
  if (!(await form.value.validate())) return
  if (Object.keys(nftTypeAttributes.value).length > 0) {
    nftType.value.extensions = {
      attributes: nftTypeAttributes.value
    }
  }
  onDialogOK({ type: props.token.commitment, nftType: nftType.value })
}

watch(() => iconFile.value, async (b) => {
  if (b) { await uploadIconToIpfs() }
})


watch(() => assetFile.value, async (b) => {
  if (b) { await uploadAssetToIpfs() }
})

onMounted(() => {
  if (props.defaultNftType) {
    nftType.value = props.defaultNftType
    if (nftType.value.extensions?.attributes) {
      nftTypeAttributes.value = Object.assign({}, nftType.value.extensions?.attributes as any)
    }
  }
})


</script>
