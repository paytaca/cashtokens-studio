<template>
  <q-page full-width class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row items-center q-gutter-sm page-header q-mb-lg">
          <q-btn round color="#434242" icon="west" style="background-color: #434242;" @click.stop="$router.back()" />
          <span class="text-h5">
            Mint {{ ui.tokenInView?.tokenUris?.icon || ui.tokenInView?.tokenCategory?.symbol }} NFT
          </span>
        </div>
        <div class="row items-center q-gutter-sm q-mb-md">
          <table>
            <tbody>
              <tr>
                <td class="q-pr-lg">Token Id:</td>
                <td>
                  <TokenCategory v-if="$route.params.tokenId" :token-id="($route.params.tokenId! as string)" />
                </td>
              </tr>
              <tr>
                <td>Commitment of last mint:</td>
                <td><span class="text-light">{{ state.commitmentOfLastMint || '<none>' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="row q-mb-lg">
          <div class="col-xs-12">
            <form action="/file-upload" class="dropzone" id="nft-assets-dropzone"
              style="min-height:100%;max-height:30em;overflow-y: scroll">
              <template id="dz-button-label">
                <div class="row justify-center">
                  <div class="col-xs-12">Drop NFT asset(s) here</div>
                  <div class="col-xs-12"><q-icon name="attach_file"></q-icon></div>
                </div>
              </template>
            </form>
          </div>
          <div class="col-xs-12">
            {{ nftType.extensions!.attributes }}
          </div>
        </div>
        <div class="row rounded-borders q-pa-lg" :class="$q.screen.width < $q.screen.sizes.sm ? 'column reverse' : ''"
          style="border: 1px solid grey;">
          <div class="col-xs-12 col-sm-5" :class="$q.screen.width >= $q.screen.sizes.sm ? 'q-pr-lg' : ''">
            <q-img
              src="https://raw.githubusercontent.com/julien-gargot/images-placeholder/master/placeholder-portrait.png"
              fit="scale-down" style="max-height: 250px; max-width:250px" />
          </div>
          <div class="col-xs-12 col-sm-7 ">
            <div class="row items-center flex justify-between">
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Recipient (Defaults to your token address)</label>
                <q-input v-model="state.recipient" outlined dense clearable>
                  <template v-slot:append>
                    <q-btn v-if="!state.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                      color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                      @click="state.recipient = user.walletTokenAddress!" />
                  </template>
                </q-input>
              </div>
              <!-- <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Commitment of last mint</label>
                <q-input :model-value="nftType.commitmentOfLastMint || '<none>'" dense outlined readonly
                  style="max-width: max-content;">
                </q-input>
              </div> -->
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <div class="text-h5">Token</div>
                <div class="row q-gutter-x-sm items-center">
                  <div class="col q-gutter-y-sm">
                    <label>Commitment</label>
                    <q-input v-if="token.capability !== 'minting'" v-model="token.commitment"
                      :placeholder="tokenCommmitmentPlaceholderText"
                      :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;"
                      dense outlined>
                      <template v-slot:prepend>
                        <q-btn :label="state.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm"
                          no-caps :icon-right="state.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                      </template>
                      <template v-slot:append>
                        <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                          :class="$q.dark.isActive ? '' : 'text-black'"
                          :label="state.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
                          <q-tooltip>
                            {{
                              state.commitmentFormat === 'decimal' ? 'Click to value to hex'
                              : 'Click to convert value to a number'
                            }}
                          </q-tooltip>
                        </q-btn>
                      </template>
                    </q-input>
                  </div>

                  <div class="col q-gutter-y-xs">
                    <label>Capability <code>{{ token.capability }}</code></label>
                    <!-- :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'" -->
                    <q-select :options="[
                      { value: 'none', label: 'None' },
                      { value: 'minting', label: 'Minting' },
                      { value: 'mutable', label: 'Mutable' }
                    ]" v-model="token.capability" dense outlined class="q-mb-xs"></q-select>

                  </div>
                </div>
                <div class="q-gutter-y-sm">
                  <label>Number of NFTs to mint for this type</label>
                  <q-input v-model="state.quantity" outlined dense clearable style="width:fit-content"></q-input>
                </div>
              </div>
              <div class="text-h5 q-mb-sm">Metadata</div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Name</label>
                <q-input v-model="nftType.name" outlined dense clearable></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Description</label>
                <q-input v-model="nftType.description" outlined dense clearable></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Icon URI</label>
                <q-input v-model="nftType.uris!.icon" outlined dense clearable></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Asset URI / Image URI</label>
                <q-input v-model="nftType.uris!.asset" outlined dense clearable></q-input>
              </div>
              <div class="text-h5 q-mb-sm">Attributes <q-btn flat color="primary" icon="add"
                  @click="attributeDialogState.dialog = !attributeDialogState.dialog" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <q-dialog v-model="attributeDialogState.dialog" v-close-on-popup>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Add NFT Attribute</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-lg-9">
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Attribute Name</label>
                <q-input v-model="attributeDialogState.key" outlined dense clearable></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Value</label>
                <q-input v-model="attributeDialogState.value" outlined dense clearable></q-input>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" @click="clearAttribute" v-close-popup />
          <q-btn flat label="Ok" v-close-popup @click="addAttribute" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeMount } from 'vue';
import { NFTCapability, NftType, TokenI } from 'mainnet-js';
import { useQuasar } from 'quasar';
import Dropzone from 'dropzone'
import { CashToken } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import convertHexLEtoBigInt from 'src/app/utils/convertHexLEtoBigInt';
import { NftCollectionType } from 'src/app/types';
import { shortenTokenId } from 'src/app/utils';
import convertBigIntToHexLE from "src/app/utils/convertBigIntToHexLE"
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';


const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const nftAssetUploader = ref()
const dropzone = ref<Dropzone>()

/**
 * Value of this should be resolved from bcmr, but since we're just currently supporting
 * SequentialNftCollection, we'll use the default. ParseableNftCollection will be handled
 * differently
 */
const nftCollectionType = ref<NftCollectionType>('SequentialNftCollection')

// metadata
const nftType = ref<NftType>({
  name: '',
  description: '',
  uris: {
    icon: '',
    image: '',
    asset: ''
  },
  extensions: {
    attributes: {}
  }
})

// utxo
const token = ref<TokenI>({
  amount: BigInt(0),
  tokenId: '',
  capability: NFTCapability.none,
  commitment: ''
})

const state = ref<{
  commitmentOfLastMint: string,
  recipient: string,
  commitmentFormat: 'decimal' | 'hex',
  excludeFromSequentialNftCollection: boolean,
  uploadNftAsset: boolean,
  NftAssetUploadUris: any
  quantity: number,
}>({
  commitmentOfLastMint: '',
  recipient: '',
  commitmentFormat: 'decimal',
  excludeFromSequentialNftCollection: false,
  uploadNftAsset: false,
  NftAssetUploadUris: null,
  quantity: 1,
})

const attributes = ref<any>({})

const attributeDialogState = ref<{ dialog: boolean, key: string, value: string | { [k: string]: string } }>({
  dialog: false,
  key: '',
  value: ''
})


const tokenCommmitmentPlaceholderText = computed<string>(() => {
  if (nftCollectionType.value === 'SequentialNftCollection') {
    return 'Enter a number'
  }
  return 'Enter commitment'
})

/**
 * Actual commitment on chain
 */
const nftCommitment = computed<string>(() => {
  let commitment = token.value.commitment
  if (commitment && state.value.commitmentFormat === 'decimal') {
    commitment = convertBigIntToHexLE(BigInt(commitment))
  }

  if (commitment && state.value.commitmentFormat === 'hex') {
    if (nftCollectionType.value === 'SequentialNftCollection') {
      commitment = parseInt(commitment, 16).toString()
      commitment = convertBigIntToHexLE(BigInt(commitment))
    }
  } /*else commitment is raw hex provided by user*/
  return commitment
})

const disableMint = computed(() => {
  if (!state.value.recipient) {
    return true
  }
  console.log(nftAssetUploader.value)
  if (state.value.uploadNftAsset && nftAssetUploader.value.queuedFiles?.length <= 0) {
    return true
  }
  return false
})



const onNftAssetUploaded = (info: any) => {
  try {
    const serverResponse = JSON.parse(info.xhr.responseText)
    console.log(serverResponse.iconUris)

  } catch (error) {
    console.log(error)
  }
}


const clearAttribute = () => {
  attributeDialogState.value.key = ''
  attributeDialogState.value.value = '' as string
}

const addAttribute = () => {
  if (attributeDialogState.value.key && attributeDialogState.value.value) {
    attributes.value = { ...attributes.value, [attributeDialogState.value.key]: attributeDialogState.value.value }
  }
}


const convertCommitment = () => {
  if (token.value.commitment && state.value.commitmentFormat === 'decimal') {
    token.value.commitment = BigInt(token.value.commitment).toString(16)
    token.value.commitment = token.value.commitment.length < 2 ? token.value.commitment.padStart(2, '0') : token.value.commitment
    state.value.commitmentFormat = 'hex'
  } else if (token.value.commitment && state.value.commitmentFormat === 'hex') {
    token.value.commitment = parseInt(token.value.commitment, 16).toString()
    state.value.commitmentFormat = 'decimal'
  }
}

const initCommitment = () => {
  if (ui.tokenInView?.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    const commitmentOfLastMint = convertHexLEtoBigInt(ui.tokenInView?.token?.commitment)
    state.value.commitmentOfLastMint = commitmentOfLastMint.toString()
    token.value.commitment = (commitmentOfLastMint + BigInt(1)).toString()
    state.value.commitmentFormat = 'decimal'
  } else {
    token.value.commitment = '1'
    state.value.commitmentFormat = 'decimal'
  }
}

const initstate = () => {
  if (ui.tokenInView?.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    const commitmentOfLastMint = convertHexLEtoBigInt(ui.tokenInView?.token?.commitment)
    state.value.commitmentOfLastMint = commitmentOfLastMint.toString()
    token.value.commitment = (commitmentOfLastMint + BigInt(1)).toString()
    state.value.commitmentFormat = 'decimal'
  } else {
    token.value.commitment = '1'
    state.value.commitmentFormat = 'decimal'
  }
}

const excludeFromSequentialNftCollectionHelp = () => {
  ui.setStatusMessage({
    statusMessage: 'If the box is checked, the commitment of the child NFT being minted won\'t be tracked by the minter. This means that the sequence number will NOT increase. Recommended values are already set by default, i.e. exclude child with `minting` and `mutable` capability, include child with `none` capability.',
    statusMessageType: 'info'
  })
}

watch(() => token.value.commitment, (commitment) => {
  if (!commitment) {
    return state.value.commitmentFormat = 'decimal' //
  }
  if (/^(?!^\d+$)[0-9A-Fa-f]+$/.test(commitment)) {
    state.value.commitmentFormat = 'hex'
  }
})

watch(() => token.value.capability, (c) => {
  if (c === NFTCapability.minting || c === NFTCapability.mutable) {
    state.value.excludeFromSequentialNftCollection = true
  } else {
    state.value.excludeFromSequentialNftCollection = false
  }

})

watch(() => state.value.excludeFromSequentialNftCollection, (exclude) => {
  if (exclude) {
    token.value.commitment = ''
  } else {
    // initCommitment()
  }
})

onBeforeMount(() => {
  Dropzone.options.nftAssetsDropzone = {
    maxFiles: 20,
    autoProcessQueue: false,
    init: function () {
      dropzone.value = this
      this.on('addedfile', (file: any) => {
        console.log(file)
      })
      this.on('accept', (file: any) => {
        console.log(file)
      })
    }
  }
})

onMounted(() => {
  initCommitment()
  state.value.recipient = user.walletTokenAddress
  nextTick(() => {
    Dropzone.discover();
    if (document.querySelector('.dz-button')) {
      document.querySelector('.dz-button')!.innerHTML! = 'Drop your NFT asset here.'
    }
  });
})

</script>


<style>
.dropzone {
  border: 2px dashed rgb(129 123 123 / 80%);
  padding: unset;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.dropzone .dz-preview {
  margin: .75em;
}

.dropzone .dz-preview.dz-image-preview {
  background: #fff0;
}
</style>
