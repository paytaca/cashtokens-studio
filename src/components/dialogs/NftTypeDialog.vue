<!-- Quasar dialog -->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-px-sm full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-center q-py-md">
          {{ title || 'NFT Metadata' }}
        </q-toolbar-title>
      </q-toolbar>

      <q-card-section>
        <div class="text-right">
          <q-btn color="warning" icon="text_format" dense flat @click.stop="editor = 'form'"></q-btn>
          <q-btn color="warning" icon="data_object" dense flat @click.stop="editor = 'json'"></q-btn>
        </div>
        <q-tab-panels v-model="editor">
          <q-tab-panel name="form">
            <div class="row justify-center q-gutter-md">
              <div v-if="owner" class="col-xs-12 q-gutter-y-sm items-center">
                <label>{{ ownerLabel }}</label>
                <q-input v-model="newOwner" outlined :rules="newOwnerRules" bottom-slots>
                </q-input>
              </div>
              <template v-if="token">
                <div class="col-xs-12 text-h6 text-bold">
                  Token Spec
                </div>
                <div class="col-xs-12 q-gutter-y-sm">
                  <label>Category</label>
                  <q-input :model-value="token.category" outlined disable readonly>
                    <template v-slot:after>
                      <CopyText :text="token.category" />
                    </template>
                  </q-input>
                </div>
                <div class="col-xs-12  q-gutter-y-sm">
                  <label>Capability</label>
                  <q-input :model-value="token.capability" outlined disable readonly>
                  </q-input>
                </div>
                <div class="col-xs-12  q-gutter-y-sm">
                  <label>Commitment</label>
                  <q-input :model-value="token.commitment" outlined disable readonly>
                  </q-input>
                </div>
              </template>
              <div class="col-xs-12">
                <div class="text-h6 q-mb-md q-mt-lg text-bold">
                  Details
                </div>
                <q-form ref="form" class="q-gutter-md" @submit.prevent="onOk">
                  <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
                    <label>
                      {{ identitySnapshot?.token?.nfts?.parse?.bytecode ? 'Bottom Alt Stack Hex' : 'Sequence Number' }}
                    </label>
                    <q-input class="registry-field" v-model="nftTypeKey"
                      placeholder="Sequence Number or Bottom Alt Stack Hex" :rules="nftTypeKeyRules" outlined required
                      autofocus>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
                    <label>Name *</label>
                    <q-input class="registry-field" v-model="nftType.name"
                      placeholder="E.g. `Art - 1`, `ACME Stadium Tickets`" :rules="[v => v?.length > 0 || 'Required']"
                      outlined required autofocus>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center">
                    <label>Description</label>
                    <q-input class="registry-field" v-model="nftType.description" placeholder="Describe this NFT"
                      outlined autogrow>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-my-md q-gutter-y-sm items-center"
                    :style="$q.screen.xs ? 'margin-bottom: 2rem' : ''">
                    <label>NFT Asset {{ assetFileUploading ? 'Uploading' : '' }}<q-spinner-dots
                        v-if="assetFileUploading" color="warning" class="q-mr-sm"></q-spinner-dots></label>
                    <div>
                      <q-file ref="assetFileRef" v-model="assetFile"
                        @rejected="() => $q.dialog({ message: 'File Rejected!' })" :disable="assetFileUploading"
                        outlined bottom-slots class="hidden">
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
                      <q-file ref="iconFileRef" v-model="iconFile" accept=".jpg, .png, image/*"
                        @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
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
                  <div class="col-xs-12 col-sm-8 col-lg-5">
                    <div class="text-h6 ">Attributes<q-btn flat color="primary" icon="add" size="md"
                        @click="openAttributeDialog" type="button" />
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
                </q-form>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="json">
            <JsonEditor v-model="nftTypeJson" mode="text" class="jse-theme-dark" />
          </q-tab-panel>
        </q-tab-panels>

        <div class="row justify-end q-gutter-x-lg q-my-lg q-mr-sm ">
          <q-btn @click.stop="onDialogHide()" text-color="negative" size="lg"
            :disable="iconFileUploading || assetFileUploading">Cancel</q-btn>
          <q-btn v-if="editor == 'form'" @click.stop="(e) => form.submit(e)" color="primary" size="lg" type="submit"
            :disable="iconFileUploading || assetFileUploading">{{ ok || 'Ok' }}</q-btn>
          <q-btn v-if="editor == 'json'" @click.stop="(e) => onOk()" color="primary" size="lg"
            :disable="iconFileUploading || assetFileUploading">{{ ok || 'Ok' }}</q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { IdentitySnapshot, NftType } from 'mainnet-js'
import { ipfsToGatewayUrl, isTokenAddress } from 'src/app/utils'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import CopyText from 'src/components/CopyText.vue'
import JsonEditor from 'json-editor-vue'
import { Draft07 } from 'json-schema-library'


const nftTypeSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "additionalProperties": false,
  "description": "A definition for one type of NFT within a token category.",
  "properties": {
    "description": {
      "description": "A string describing this NFT type for use in user interfaces.\n\nIn user interfaces with limited space, names should be hidden beyond the first newline character or `140` characters until revealed by the user.\n\nE.g.:\n- \"Receipts issued by the exchange to record details about purchases. After settlement, these receipts are redeemed for the purchased tokens.\";\n- \"Receipts issued by the crowdfunding campaign to document the value of funds pledged. If the user decides to cancel their pledge before the campaign completes, these receipts can be redeemed for a full refund.\";\n- \"Tickets issued for events at ACME Stadium.\";\n- Sealed ballots certified by ACME decentralized organization during the voting period. After the voting period ends, these ballots must be revealed to reclaim the tokens used for voting.\"",
      "type": "string"
    },
    "extensions": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "object",
          "properties": {
            "type": "string"
          }
        }
      ],
      "additionalProperties": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "object",
            "additionalProperties": {
              "type": "string"
            }
          }
        ]
      },
      "description": "A mapping of extension identifiers to extension definitions. Extensions may be widely standardized or application-specific, and extension definitions must be either:\n\n- `string`s,\n- key-value mappings of `string`s, or\n- two-dimensional, key-value mappings of `string`s.\n\nThis limitation encourages safety and wider compatibility across implementations.\n\nTo encode an array, it is recommended that each value be assigned to a numeric key indicating the item's index (beginning at `0`). Numerically-indexed objects are often a more useful and resilient data-transfer format than simple arrays because they simplify difference-only transmission: only modified indexes need to be transferred, and shifts in item order must be explicit, simplifying merges of conflicting updates.\n\nFor encoding of more complex data, consider using base64 and/or string-encoded JSON.",
      "type": "object"
    },
    "fields": {
      "description": "A list of identifiers for fields contained in NFTs of this type. On successful parsing evaluations, the bottom item on the altstack indicates the matched NFT type, and the remaining altstack items represent NFT field contents in the order listed (where `fields[0]` is the second-to-bottom item, and the final item in `fields` is the top of the altstack).\n\nFields should be ordered by recommended importance from most important to least important; in user interfaces, clients should display fields at lower indexes more prominently than those at higher indexes, e.g. if some fields cannot be displayed in minimized interfaces, higher-importance fields can still be represented. (Note, this ordering is controlled by the bytecode specified in `token.nft.parse.bytecode`.)\n\nIf this is a sequential NFT, (the category's `parse.bytecode` is undefined), `fields` should be omitted or set to `undefined`.",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "name": {
      "description": "The name of this NFT type for use in interfaces. Names longer than `20` characters may be elided in some interfaces.\n\nE.g. `Market Order Buys`, `Limit Order Sales`, `Pledge Receipts`, `ACME Stadium Tickets`, `Sealed Votes`, etc.",
      "type": "string"
    },
    "uris": {
      "additionalProperties": {
        "type": "string"
      },
      "description": "A mapping of identifiers to URIs associated with an entity. URI identifiers may be widely-standardized or registry-specific. Values must be valid URIs, including a protocol prefix – e.g. `https://` or `ipfs://`., Clients are only required to support `https` and `ipfs` URIs, but any scheme may be specified.",
      "type": "object"
    }
  },
  "required": ["name"],
  "type": "object"
}

const $q = useQuasar()

defineEmits([
  ...useDialogPluginComponent.emits,
])

const props = defineProps<{
  token: { amount: number, category: string, capability: string, commitment: string },
  identitySnapshot: IdentitySnapshot,
  defaultNftType?: NftType,
  defaultNftTypeKey?: string,
  title?: string,
  owner?: string // address,
  ownerLabel?: string,
  ok?: string
}>()

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const editor = ref<'form' | 'json'>()
const form = ref()
const nftType = ref<NftType>({
  name: '',
  description: '',
  uris: {
    icon: '',
    asset: '',
    image: ''
  },
  extensions: {
    attributes: {}
  }
})

const nftTypeKey = ref<string>()

const nftTypeKeyRules = [
  (v: string | number) => !v || /^[0-9a-fA-F]+$/.test(String(v)) || `${props.identitySnapshot?.token?.nfts?.parse?.bytecode ? 'Enter a hex value' : 'Enter a number'}`
]

const newOwnerRules = [
  // (v:string) => /^((bitcoincash:|bchtest:)?(z)[a-zA-Z0-9]{1,64})$/.test(v) || 'Enter a valid token address',
  (v: string) => isTokenAddress(v) || 'Enter a valid token address'
]
const newOwner = ref<string>()

const nftTypeJson = ref()
const justMounted = ref<boolean>()
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
      if (iconPreviewUrl.value) {
        URL.revokeObjectURL(iconPreviewUrl.value)
      }
      iconPreviewUrl.value = URL.createObjectURL(iconFile.value)
      iconFileUploading.value = true
      const resp = await fetch(`api/tokens/nft/icon-upload?tokenId=${props.token.category}&commitment=${props.token.commitment}`, {
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
      const resp = await fetch(`api/tokens/nft/asset-upload?tokenId=${props.token.category}&commitment=${props.token.commitment}`, {
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
  let v
  if (editor.value == 'form') {
    if (!(await form.value.validate())) return
    if (Object.keys(nftTypeAttributes.value).length > 0) {
      nftType.value.extensions = {
        attributes: nftTypeAttributes.value
      }
    }
    v = nftType.value
  } else {
    v = nftTypeJson.value
    if (typeof (nftTypeJson.value) == 'string') {
      v = JSON.parse(nftTypeJson.value)
    }
  }
  const d = new Draft07(nftTypeSchema)
  const errors: any = d.validate(v)
  if (errors.length == 0) {
    onDialogOK({ type: props.token.commitment, nftType: v, owner: newOwner?.value })
  } else {
    $q.dialog({
      message: 'Format error! Make sure the value conforms to BCMR\'s NftType spec. If you\'re using the `extensions` field, make sure it has a maximum nesting depth of 2 and only has `string` values. Example: {"extensions": "value"}, {"extensions": {"key":"value"}}',
      class: 'q-pa-lg text-justify'
    })
  }
}

watch(() => iconFile.value, async (v) => {
  if (v) { await uploadIconToIpfs() }
})


watch(() => assetFile.value, async (v) => {
  if (v) { await uploadAssetToIpfs() }
})

watch(() => nftTypeAttributes.value, async (v) => {
  nftType.value.extensions = !nftType.value.extensions ? { attributes: v } : { ...nftType.value.extensions, attributes: v }
  if (nftTypeJson.value) {
    let nftTypeParsed = nftTypeJson.value
    if (typeof (nftTypeJson.value) == 'string') {
      nftTypeParsed = JSON.parse(nftTypeJson.value)
    }
    nftTypeParsed.extensions = !nftTypeParsed.extensions ? { attributes: v } : { ...nftTypeParsed.extensions, attributes: v }
    nftTypeJson.value = JSON.stringify(nftTypeParsed)
  }
})

watch(() => editor.value, async (v) => {
  if (v == 'json') {
    justMounted.value = false
    nftTypeJson.value = JSON.parse(JSON.stringify(nftType.value))
  } else {
    if (justMounted.value) return
    if (nftTypeJson.value) {
      if (typeof (nftTypeJson.value) == 'string') {
        nftType.value = JSON.parse(nftTypeJson.value)
      } else {
        nftType.value = nftTypeJson.value
      }
    }

    if (nftType.value.extensions?.attributes) {
      for (const [k, v] of Object.entries(nftType.value.extensions?.attributes || {})) {
        if (typeof (v) == 'string') {
          nftTypeAttributes.value[k] = v
        }
      }
    }
  }
})

onMounted(() => {
  justMounted.value = true
  editor.value = 'form'
  if (props.defaultNftType) {
    nftType.value = props.defaultNftType
    if (!nftType.value.uris) {
      nftType.value.uris = {
        icon: '',
        asset: ''
      }
    }
    if (nftType.value.extensions?.attributes) {
      nftTypeAttributes.value = Object.assign({}, nftType.value.extensions?.attributes as any)
    }
  }
  newOwner.value = props.owner
})


</script>

<style lang="scss">
@import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
</style>
