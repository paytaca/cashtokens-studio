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
          <label>Token Id</label>
          <TokenCategory v-if="$route.params.tokenId" :token-id="($route.params.tokenId! as string)" />
        </div>
        <div class="row" :class="$q.screen.width < $q.screen.sizes.sm ? 'column reverse' : ''">
          <div class="col-xs-12 col-sm-5" :class="$q.screen.width >= $q.screen.sizes.sm ? 'q-pr-lg' : ''">
            <form action="/file-upload" class="dropzone" id="nft-assets-dropzone"
              style="max-height:30em;overflow-y: scroll"></form>
          </div>
          <div class="col-xs-12 col-sm-7 ">
            <div class="row items-center flex justify-between">

              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Recipient (Defaults to your token address)</label>
                <q-input v-model="form.recipient" outlined dense clearable>
                  <template v-slot:append>
                    <q-btn v-if="!form.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                      color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                      @click="form.recipient = user.walletTokenAddress!" />
                  </template>
                </q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Commitment of last mint</label>
                <q-input :model-value="form.commitmentOfLastMint || '<none>'" filled outlined dense disable
                  style="max-width: max-content;">
                </q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Capability <sup><code>{{ form.capability }}</code></sup></label>
                <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'">
                  <q-option-group name="preferred_genre" v-model="form.capability" :options="[
                    { value: 'minting', label: 'Minting' },
                    { value: 'mutable', label: 'Mutable' },
                    { value: 'none', label: 'None' }
                  ]" color="primary" inline />
                </div>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Commitment ( E.g. {{ form.commitment }} to indicate the NFT item id )</label>
                <q-input v-if="form.capability !== 'minting'" v-model="form.commitment"
                  :placeholder="tokenCommmitmentPlaceholderText"
                  :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;"
                  dense outlined>
                  <template v-slot:prepend>
                    <q-btn :label="form.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm" no-caps
                      :icon-right="form.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                  </template>
                  <template v-slot:append>
                    <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                      :class="$q.dark.isActive ? '' : 'text-black'"
                      :label="form.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
                      <q-tooltip>
                        {{
                          form.commitmentFormat === 'decimal' ? 'Click to value to hex'
                          : 'Click to convert value to a number'
                        }}
                      </q-tooltip>
                    </q-btn>
                  </template>
                </q-input>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeMount } from 'vue';
import { NFTCapability } from 'mainnet-js';
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

const form = ref<{
  capability: NFTCapability,
  commitmentOfLastMint: string,
  commitment: string,
  recipient: string,
  commitmentFormat: 'decimal' | 'hex',
  excludeFromSequentialNftCollection: boolean,
  uploadNftAsset: boolean, NftAssetUploadUris: any
}>({
  capability: NFTCapability.none,
  commitmentOfLastMint: '', // Commitment of last mint (stored as commitment of the minter)
  commitment: '',
  recipient: '',
  commitmentFormat: 'decimal',
  excludeFromSequentialNftCollection: false,
  uploadNftAsset: false,
  NftAssetUploadUris: null
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
  let commitment = form.value.commitment
  if (commitment && form.value.commitmentFormat === 'decimal') {
    commitment = convertBigIntToHexLE(BigInt(commitment))
  }

  if (commitment && form.value.commitmentFormat === 'hex') {
    if (nftCollectionType.value === 'SequentialNftCollection') {
      commitment = parseInt(commitment, 16).toString()
      commitment = convertBigIntToHexLE(BigInt(commitment))
    }
  } /*else commitment is raw hex provided by user*/
  return commitment
})

const disableMint = computed(() => {
  if (!form.value.recipient) {
    return true
  }
  console.log(nftAssetUploader.value)
  if (form.value.uploadNftAsset && nftAssetUploader.value.queuedFiles?.length <= 0) {
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



const convertCommitment = () => {
  if (form.value.commitment && form.value.commitmentFormat === 'decimal') {
    form.value.commitment = BigInt(form.value.commitment).toString(16)
    form.value.commitment = form.value.commitment.length < 2 ? form.value.commitment.padStart(2, '0') : form.value.commitment
    form.value.commitmentFormat = 'hex'
  } else if (form.value.commitment && form.value.commitmentFormat === 'hex') {
    form.value.commitment = parseInt(form.value.commitment, 16).toString()
    form.value.commitmentFormat = 'decimal'
  }
}

const initCommitment = () => {
  if (ui.tokenInView?.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    const commitmentOfLastMint = convertHexLEtoBigInt(ui.tokenInView?.token?.commitment)
    form.value.commitmentOfLastMint = commitmentOfLastMint.toString()
    form.value.commitment = (commitmentOfLastMint + BigInt(1)).toString()
    form.value.commitmentFormat = 'decimal'
  } else {
    form.value.commitment = '1'
    form.value.commitmentFormat = 'decimal'
  }
}


const excludeFromSequentialNftCollectionHelp = () => {
  ui.setStatusMessage({
    statusMessage: 'If the box is checked, the commitment of the child NFT being minted won\'t be tracked by the minter. This means that the sequence number will NOT increase. Recommended values are already set by default, i.e. exclude child with `minting` and `mutable` capability, include child with `none` capability.',
    statusMessageType: 'info'
  })
}

watch(() => form.value.commitment, (commitment) => {
  if (!commitment) {
    return form.value.commitmentFormat = 'decimal' //
  }
  if (/^(?!^\d+$)[0-9A-Fa-f]+$/.test(commitment)) {
    form.value.commitmentFormat = 'hex'
  }
})

watch(() => form.value.capability, (c) => {
  if (c === NFTCapability.minting || c === NFTCapability.mutable) {
    form.value.excludeFromSequentialNftCollection = true
  } else {
    form.value.excludeFromSequentialNftCollection = false
  }

})

watch(() => form.value.excludeFromSequentialNftCollection, (exclude) => {
  if (exclude) {
    form.value.commitment = ''
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
  form.value.recipient = user.walletTokenAddress
  nextTick(() => {
    Dropzone.discover();
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
