<template>
  <q-page full-width class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row items-center q-gutter-sm page-header q-mb-lg">
          <q-btn round color="#434242" icon="west" style="background-color: #434242;" @click.stop="$router.back()" />
          Authhead {{ ui.minterInView?.txid }}
          <span class="text-h5">
            Mint {{ ui.minterInView?.tokenUris?.icon || ui.minterInView?.tokenCategory?.symbol }} NFT
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
                <td><span class="text-light">{{ options.commitmentOfLastMint || '<none>' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="row rounded-borders q-pa-lg" style="border: 1px solid grey;">
          <div class="col-xs-12 col-sm-5 justify-center "
            :class="$q.screen.width >= $q.screen.sizes.sm ? 'q-pr-lg' : 'q-mb-lg'">
            <div class="row flex justify-center">
              <!-- <q-img :id="token.commitment"
                src="https://raw.githubusercontent.com/julien-gargot/images-placeholder/master/placeholder-portrait.png"
                fit="scale-down" style="max-height: 250px; max-width:250px" /> -->
              <form action="/file-upload" class="dropzone" id="nft-assets-dropzone"
                style="overflow-y: scroll;width: 100%;max-height: 40em; min-height: 20em;">
                <template id="dz-button-label">
                  <div class="row justify-center">
                    <div class="col-xs-12">Drop NFT asset(s) here</div>
                    <div class="col-xs-12"><q-icon name="attach_file"></q-icon></div>
                  </div>
                </template>
              </form>
            </div>
          </div>
          <div class="col-xs-12 col-sm-7">
            <div class="row items-center flex justify-between">
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <div class="text-h5">Token</div>
                <div class="row q-gutter-x-sm items-center">
                  <div class="col q-gutter-y-sm">
                    <label>Commitment</label>
                    <q-input v-model="token.commitment" :placeholder="tokenCommmitmentPlaceholderText"
                      :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;"
                      dense outlined>
                      <template v-slot:prepend>
                        <q-btn :label="options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm"
                          no-caps :icon-right="options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                      </template>
                      <template v-slot:append>
                        <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                          :class="$q.dark.isActive ? '' : 'text-black'"
                          :label="options.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
                          <q-tooltip>
                            {{
                              options.commitmentFormat === 'decimal' ? 'Click to value to hex'
                              : 'Click to convert value to a number'
                            }}
                          </q-tooltip>
                        </q-btn>
                      </template>
                      <template v-slot:hint>
                        <div v-if="token.commitment" class="row justify-end items-center">
                          <code>{{ nftCommitment }}</code>
                          <i>(Raw commitment value)
                            <q-icon name="info">
                              <q-tooltip>The actual value on-chain.</q-tooltip>
                            </q-icon>
                          </i>
                        </div>
                      </template>
                    </q-input>
                  </div>
                </div>
                <div class="col-xs-12 q-mt-lg">
                  <label>Capability <code>{{ token.capability }}</code></label>
                  <q-select :options="[
                    { value: 'none', label: 'None' },
                    { value: 'minting', label: 'Minting' },
                    { value: 'mutable', label: 'Mutable' }
                  ]" :model-value="token.capability" v-on:update:model-value="(v) => token.capability = v.value" dense
                    outlined class="q-mb-xs"></q-select>
                </div>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center q-gutter-y-sm">
                <div class="text-h5">Quantity</div>
                <label>Number of NFTs to mint for this type</label>
                <q-input v-model="options.quantity" outlined dense clearable style="width:fit-content"
                  :onchange="(v: any) => options.quantity = !v.target.value || v.target.value <= '0' ? 1 : Number(v.target.value)"></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <div class="text-h5">Send To</div>
                <label>Recipient (Defaults to your token address)</label>
                <q-input v-model="options.recipient" outlined dense clearable>
                  <template v-slot:append>
                    <q-btn v-if="!options.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                      color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                      @click="options.recipient = user.walletTokenAddress!" />
                  </template>
                </q-input>
              </div>
            </div>
          </div>
          <q-expansion-item label="Metadata" class="col-xs-12" style="border-top: 1px solid grey;">
            <div>
              <div class="row">
                <div class="col-xs-12 col-sm-6 q-px-lg">
                  <div class="row items-center flex justify-between">
                    <div class="text-h5 q-mb-lg">NFT Type</div>
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
                  </div>
                </div>
                <div class="col-xs-12 col-sm-6 q-px-lg">
                  <div class="row items-center flex justify-between">
                    <div class="text-h5 q-mb-lg">NftAttributes <q-btn flat color="primary" icon="add" size="xs"
                        @click="addNftAttribute" />
                    </div>
                  </div>
                  <div class="row items-center flex justify-between">
                    <div v-for="attrKey, i in Object.keys(nftAttributes)"
                      class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right" :key="i">
                      <label>{{ attrKey }}</label>
                      <q-input v-model="nftAttributes[attrKey]" outlined dense clearable>
                        <template v-slot:after>
                          <q-icon name="remove" @click.stop="() => delete nftAttributes[attrKey]"
                            color="negative"></q-icon>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </q-expansion-item>
          <q-expansion-item label="Advanced Options" class="col-xs-12" style="border-top: 1px solid grey;">
            <div class="text-left">
              <q-checkbox v-model="options.excludeFromSequentialNftCollection"
                label="Exclude from Sequential NFT Collection" />
              <q-icon name="info" class="q-ml-sm" @click.stop="excludeFromSequentialNftCollectionHelp">
                <q-tooltip>
                  If checked,the minter won't keep track on the commitment of this NFT. Click for more info.
                </q-tooltip>
              </q-icon>
            </div>
            <div class="text-left">
              <q-checkbox v-model="options.deferRegistryPublication"
                label="Defer registry publication (Recommended if your minting multiple NFTs)" />
              <q-icon name="info" class="q-ml-sm" @click.stop="deferRegistryPublicationHelp">
                <q-tooltip>
                  If checked,the NFT metadata will be cached and registry update won't be published on-chain
                </q-tooltip>
              </q-icon>
            </div>
          </q-expansion-item>
          <div class="col-xs-12 text-right">
            <q-btn color="primary" size="lg" @click.stop="confirmMint">Mint</q-btn>
          </div>
        </div>
      </div>
    </div>
    <q-dialog v-model="nftAttributeDialogData.dialog" v-close-on-popup>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Add Attribute</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-lg-9">
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Name</label>
                <q-input v-model="nftAttributeDialogData.key" outlined dense clearable></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Value</label>
                <q-input v-model="nftAttributeDialogData.value" outlined dense clearable></q-input>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" @click="clearNftAttribute" v-close-popup />
          <q-btn flat label="Ok" v-close-popup @click="confirmAddNftAttribute" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeMount } from 'vue';
import { NFTCapability, NftType, TokenI, Wallet, binToHex, sha256 } from 'mainnet-js';
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
import { CTSRegistry } from 'src/app/CTSRegistry';
const Validator = require('jsonschema').Validator

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const nftAssetUploader = ref()
const dropzone = ref<Dropzone>()

/**
 * Value of this should be resolved from bcmr, but since we're just currently supporting
 * SequentialNftCollection, we'll use the default. ParsableNftCollection will be handled
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
  extensions: {}
})

const nftAttributes = ref<any>({})

// utxo
const token = ref<TokenI>({
  amount: BigInt(0),
  tokenId: '',
  capability: NFTCapability.none,
  commitment: ''
})

const options = ref<{
  collectionType: NftCollectionType,
  commitmentOfLastMint: string,
  recipient: string,
  commitmentFormat: 'decimal' | 'hex',
  excludeFromSequentialNftCollection: boolean,
  deferRegistryPublication: boolean,
  uploadNftAsset: boolean,
  nftAssetDataURL: string,
  nftAssetFileType: string,
  NftAssetUploadUris: any
  quantity: number,
}>({
  collectionType: 'SequentialNftCollection',
  commitmentOfLastMint: '',
  recipient: '',
  commitmentFormat: 'decimal',
  excludeFromSequentialNftCollection: false,
  deferRegistryPublication: true,
  uploadNftAsset: false,
  nftAssetDataURL: '',
  nftAssetFileType: 'image/png',
  NftAssetUploadUris: null,
  quantity: 1,
})



const nftAttributeDialogData = ref<{ dialog: boolean, key: string, value: string }>({
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
 * Actual commitment on chain. LE
 */
const nftCommitment = computed<string | undefined>(() => {
  if (nftCollectionType.value === 'ParsableNftCollection') {
    return token.value.commitment
  }
  let commitment = token.value.commitment
  if (commitment && options.value.commitmentFormat === 'decimal') {
    commitment = convertBigIntToHexLE(BigInt(commitment))
  }

  if (commitment && options.value.commitmentFormat === 'hex') {
    commitment = parseInt(commitment, 16).toString()
    commitment = convertBigIntToHexLE(BigInt(commitment))
  }
  return commitment
})

const disableMint = computed(() => {
  if (!options.value.recipient) {
    return true
  }
  console.log(nftAssetUploader.value)
  if (options.value.uploadNftAsset && nftAssetUploader.value.queuedFiles?.length <= 0) {
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

const clearNftAttribute = () => {
  nftAttributeDialogData.value.key = ''
  nftAttributeDialogData.value.value = '' as string
}

const addNftAttribute = () => {
  clearNftAttribute()
  nftAttributeDialogData.value.dialog = !nftAttributeDialogData.value.dialog
}

const confirmAddNftAttribute = () => {
  if (nftAttributeDialogData.value.key && nftAttributeDialogData.value.value) {
    nftAttributes.value = { ...nftAttributes.value, [nftAttributeDialogData.value.key]: nftAttributeDialogData.value.value }
  }
}


const convertCommitment = () => {
  if (token.value.commitment && options.value.commitmentFormat === 'decimal') {
    token.value.commitment = BigInt(token.value.commitment).toString(16)
    token.value.commitment = token.value.commitment.length < 2 ? token.value.commitment.padStart(2, '0') : token.value.commitment
    options.value.commitmentFormat = 'hex'
  } else if (token.value.commitment && options.value.commitmentFormat === 'hex') {
    token.value.commitment = parseInt(token.value.commitment, 16).toString()
    options.value.commitmentFormat = 'decimal'
  }
}

const initCommitment = () => {
  if (ui.minterInView?.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    const commitmentOfLastMint = convertHexLEtoBigInt(ui.minterInView?.token?.commitment)
    options.value.commitmentOfLastMint = commitmentOfLastMint.toString()
    token.value.commitment = (commitmentOfLastMint + BigInt(1)).toString()
    options.value.commitmentFormat = 'decimal'
  } else {
    token.value.commitment = '1'
    options.value.commitmentFormat = 'decimal'
  }
}

const initstate = () => {
  if (ui.minterInView?.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    const commitmentOfLastMint = convertHexLEtoBigInt(ui.minterInView?.token?.commitment)
    options.value.commitmentOfLastMint = commitmentOfLastMint.toString()
    token.value.commitment = (commitmentOfLastMint + BigInt(1)).toString()
    options.value.commitmentFormat = 'decimal'
  } else {
    token.value.commitment = '1'
    options.value.commitmentFormat = 'decimal'
  }
}

const excludeFromSequentialNftCollectionHelp = () => {
  ui.setStatusMessage({
    statusMessage: 'If the box is checked, the commitment of the child NFT being minted won\'t be tracked by the minter. This means that the sequence number will NOT increase. Recommended values are already set by default, i.e. exclude child with `minting` and `mutable` capability, include child with `none` capability.',
    statusMessageType: 'info'
  })
}

const deferRegistryPublicationHelp = () => {
  ui.setStatusMessage({
    statusMessage: 'If checked, the NFT metadata will be cached but minting won\'t include registry publication on-chain.',
    statusMessageType: 'info'
  })
}

const confirmMint = async () => {
  console.log('minter', ui.minterInView)
  console.log('quantity', options.value.quantity)

  if (ui.minterInView) {
    let tx
    try {
      tx = await ui.minterInView.mintChildren({
        capability: token.value.capability!,
        commitment: token.value.commitment!,
        commitmentFormat: options.value.commitmentFormat,
        nftCollectionType: options.value.collectionType,
        recipient: options.value.recipient,
        excludeFromSequentialNftCollection: options.value.excludeFromSequentialNftCollection,
        quantity: options.value.quantity
      })
      if (tx) {
        // emit('nftMinted', { tokenId: ui.minterInView.token!.tokenId, ...options.value })
        $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTokenId(tx) })
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.mintChild',
          timestamp: new Date().getTime(),
          successMsg: `Minted new ${ui.minterInView?.tokenCategory?.symbol || shortenTokenId(ui.minterInView.token!.tokenId)} NFT`
        })
        ui.setStatusMessage({
          statusMessage: `Minted new ${ui.minterInView?.tokenCategory?.symbol || shortenTokenId(ui.minterInView.token!.tokenId)} NFT`,
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

    const message = {
      txid: tx,
      address: user.wallet?.getDepositAddress()
    }

    await (new CTSRegistry()).createWorkspace(user.transactionSigner!, JSON.stringify(message))
    // TODO: handle response



  }
}

watch(() => token.value.commitment, (commitment) => {
  if (!commitment) {
    return options.value.commitmentFormat = 'decimal' //
  }
  if (/^(?!^\d+$)[0-9A-Fa-f]+$/.test(commitment)) {
    options.value.commitmentFormat = 'hex'
  }
})

watch(() => token.value.capability, (c) => {
  if (c === NFTCapability.minting || c === NFTCapability.mutable) {
    options.value.excludeFromSequentialNftCollection = true
  } else {
    options.value.excludeFromSequentialNftCollection = false
  }

})

watch(() => options.value.excludeFromSequentialNftCollection, (exclude) => {
  if (exclude) {
    token.value.commitment = ''
  } else {
    // initCommitment()
  }
})

onBeforeMount(() => {
  Dropzone.options.nftAssetsDropzone = {
    maxFiles: 2,
    autoProcessQueue: false,
    addRemoveLinks: true,
    init: function () {
      dropzone.value = this
      this.on('addedfile', (file: any) => {
        console.log('FILE', file)
        // binToHex(sha256.hash(utf8ToBin(this.getContent())))
        const fileReader = new FileReader()
        if (file.type === 'application/json') {
          fileReader.onload = (e) => {
            const content: any = e.target?.result
            console.log('content', content)
            try {
              nftAttributes.value = JSON.parse(content)
            } catch (error) {
              console.log(error)
            }
          }
          fileReader.readAsText(file)
        } else {
          for (const f of dropzone.value!.files) {
            if (f.name !== file.name) {
              dropzone.value?.removeFile(f)
            }
          }

          fileReader.onload = function () {
            const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            console.log('hash', binToHex(sha256.hash(uint8Array)))
          };
          fileReader.readAsArrayBuffer(file);
        }

      })

      this.on('removedfile', (file) => {
        options.value.nftAssetDataURL = ''
        if (file.type === 'application/json') {
          nftAttributes.value = {}
        }
      })

      this.on('accept', (file: any) => {
        console.log(file)
      })
    }
  }
})

onMounted(() => {
  initCommitment()
  options.value.recipient = user.walletTokenAddress
  nextTick(() => {
    Dropzone.discover();
    if (document.querySelector('.dz-button')) {
      document.querySelector('.dz-button')!.innerHTML! = 'Drop your NFT asset here.'
    }
  });
})

</script>


<style lang="scss">
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

.dropzone a.dz-remove {
  color: $negative;
  margin-top: 1em;
}
</style>
