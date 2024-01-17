<template>
  <q-dialog full-width>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 row items-center">
          <q-avatar class="q-mx-sm" v-if="minter.tokenUris?.icon">
            <img :src="minter.tokenUris?.icon" alt="">
          </q-avatar>
          <span class="q-mx-sm text-bold">{{ minter.tokenCategory?.symbol ? minter.tokenCategory.symbol : 'NFT' }}</span>

        </q-toolbar-title>
        <span class="q-mr-sm">Token Id</span>
        <TokenCategory v-if="minter.token?.tokenId" :token-id="minter.token.tokenId" />
      </q-toolbar>
      <div id="x"></div>
      <q-card-section class="q-gutter-sm">
        <div class="row" :class="$q.screen.width < $q.screen.sizes.sm ? 'column reverse' : ''">
          <div class="col-xs-12 col-sm-5" :class="$q.screen.width >= $q.screen.sizes.sm ? 'q-px-lg' : ''">
            <form action="/file-upload" class="dropzone" id="nft-assets-dropzone"
              style="max-height:30em;overflow-y: scroll"></form>
          </div>
          <div class="col-xs-12 col-sm-7 ">
            <q-form class="q-gutter-sm">
              <q-input :model-value="form.commitmentOfLastMint"
                :label="nftCollectionType === 'SequentialNftCollection' ? 'Commitment of Last Mint (Last Sequence Number)' : 'Token Commitment'"
                filled dense disable>
              </q-input>
              <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'">
                Capability <sup><code>{{ form.capability }}</code></sup>
                <q-option-group name="preferred_genre" v-model="form.capability" :options="[
                  { value: 'minting', label: 'Minting' },
                  { value: 'mutable', label: 'Mutable' },
                  { value: 'none', label: 'None' }
                ]" color="primary" inline />
              </div>
              <div class="text-right">
                <q-checkbox v-model="form.excludeFromSequentialNftCollection"
                  label="Exclude from Sequential NFT Collection" />
                <q-icon name="info" class="q-ml-sm" @click.stop="excludeFromSequentialNftCollectionHelp">
                  <q-tooltip>
                    If checked,the minter won't keep track on the commitment of this NFT. Click for more info.
                  </q-tooltip>
                </q-icon>
              </div>
              <q-input v-if="form.capability !== 'minting'" v-model="form.commitment"
                :label="nftCollectionType === 'SequentialNftCollection' ? 'Token Commitment (Sequence Number)' : 'Token Commitment'"
                :filled="true" :placeholder="tokenCommmitmentPlaceholderText"
                :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;" dense
                stack-label>
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
              <div v-if="form.capability === 'none' && form.commitment && form.commitmentFormat === 'hex'"
                class="row justify-end items-center">
                <code>{{ convertBigIntToHexLE(BigInt(parseInt(form.commitment, 16))) }}</code>
                <i>(Raw commitment value)
                  <q-icon name="info">
                    <q-tooltip>The actual value on-chain.</q-tooltip>
                  </q-icon>
                </i>
              </div>
              <div v-if="form.capability === 'none' && form.commitment && form.commitmentFormat === 'decimal'"
                class="row justify-end items-center">
                <code>{{ convertBigIntToHexLE(BigInt(form.commitment)) }}</code>
                <i>(Raw commitment value)
                  <q-icon name="info">
                    <q-tooltip>The actual value on-chain.</q-tooltip>
                  </q-icon>
                </i>
              </div>
              <!-- <q-input v-model="form.commitment" label="Commitment" filled dense>
              </q-input> -->
              <q-input v-model="form.recipient" label="Recipient's Address" filled dense>
                <template v-slot:append>
                  <q-btn dense :flat="$q.dark.isActive ? true : false" label="Self" color="warning"
                    :class="$q.dark.isActive ? '' : 'text-black'" @click="form.recipient = user.walletTokenAddress!" />
                </template>
              </q-input>
              <div class="text-right">
                <q-checkbox v-model="form.uploadNftAsset" label="Upload NFT asset" />
                <q-icon name="info" class="q-ml-sm">
                  <q-tooltip>
                    Upload real world asset that this NFT represent. E.g. a digital artwork.
                  </q-tooltip>
                </q-icon>
              </div>
            </q-form>
          </div>
        </div>

      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => mintToken()" label="Mint NFT" :busyLabel="minter.processing" color="primary"
          :disable="disableMint" />
      </q-card-actions>
    </q-card>
  </q-dialog>
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

const props = defineProps<{
  minter: CashToken,
}>()

const emit = defineEmits<{
  (e: 'nftMinted', val: { tokenId: string, recipient: string, capability: NFTCapability, commitment: string }): void
}>()

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

const mintToken = async () => {
  if (props.minter) {
    try {
      const tx = await props.minter.mintChild(form.value)
      if (tx) {
        emit('nftMinted', { tokenId: props.minter.token!.tokenId, ...form.value })
        $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTokenId(tx) })
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.mintChild',
          timestamp: new Date().getTime(),
          successMsg: `Minted new ${props.minter?.tokenCategory?.symbol || shortenTokenId(props.minter.token!.tokenId)} NFT`
        })
        ui.setStatusMessage({
          statusMessage: `Minted new ${props.minter?.tokenCategory?.symbol || shortenTokenId(props.minter.token!.tokenId)} NFT`,
          statusMessageType: 'success',
          statusMessageTxid: tx
        })
      }
    } catch (error: any) {
      ui.setStatusMessage({
        statusMessage: error,
        statusMessageType: 'error',
      })
      $q.notify({ type: 'negative', message: 'Error!' + error.message })
    }
  }
}

const initCommitment = () => {
  if (props.minter.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    const commitmentOfLastMint = convertHexLEtoBigInt(props.minter.token.commitment)
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
    initCommitment()
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
