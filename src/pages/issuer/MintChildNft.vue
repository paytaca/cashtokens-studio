<template>
  <q-page full-width class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row items-center q-gutter-sm page-header q-mb-lg">
          <q-btn round color="#434242" icon="west" style="background-color: #434242;" @click.stop="$router.back()" />
          <span class="text-h5">
            Mint
            <q-avatar v-if="ui.minterInView?.tokenUris?.icon">
              <q-img :src="ui.minterInView?.tokenUris?.icon"></q-img>
            </q-avatar>
            <span v-else-if="ui.minterInView?.tokenCategory?.symbol">
              {{ ui.minterInView?.tokenCategory?.symbol }}
            </span>
            <span v-else>
              NFT
            </span>
          </span>
        </div>

        <div class="row items-center q-gutter-sm q-mb-md">
          <table>
            <tbody>
              <tr class="items-center">
                <td class="q-pr-lg">Token Id:</td>
                <td>
                  <TokenCategory v-if="$route.params.tokenId" :token-id="($route.params.tokenId! as string)" />
                </td>
              </tr>
              <tr>
                <td>Minter's commitment: </td>
                <td><span class="text-light">{{ options.commitmentOfLastMint || '<none>'
                }}</span>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
        <q-expansion-item v-if="mintTx && options.addMetadata" label="Mint Receipt" class="q-mb-lg">
          <div class="row">
            <div class="col-xs-12 q-gutter-y-sm" style="color:green">
              <div class="row">
                <div class="col-xs-4 col-sm-3">Txid</div>
                <div class="col-xs-4 col-sm-6">
                  <div class="col-xs-12" style="border-bottom: 2px dashed green; min-height: 80%"></div>
                </div>
                <div class="col-xs-4 col-sm-3 text-right">{{
                  shortenTx(mintTx) }}
                </div>
              </div>
              <div class="row">
                <div class="col-xs-4 col-sm-3">Commitment</div>
                <div class="col-xs-4 col-sm-6">
                  <div class="col-xs-12" style="border-bottom: 2px dashed green; min-height: 80%"></div>
                </div>
                <div class="col-xs-4 col-sm-3 text-right">{{ token.commitment }}</div>
              </div>
              <div class="row">
                <div class="col-xs-4 col-sm-3">Capability</div>
                <div class="col-xs-4 col-sm-6">
                  <div class="col-xs-12" style="border-bottom: 2px dashed green; min-height: 80%"></div>
                </div>
                <div class="col-xs-4 col-sm-3 text-right">{{ token.capability }}</div>
              </div>
              <div class="row">
                <div class="col-xs-4 col-sm-3">Sent To</div>
                <div class="col-xs-2 col-sm-6">
                  <div class="col-xs-12" style="border-bottom: 2px dashed green; min-height: 80%"></div>
                </div>
                <div class="col-xs-6 col-sm-3 text-right">{{ shortenAddress(options.recipient) }}
                </div>
              </div>
            </div>
          </div>

        </q-expansion-item>
        <div class="row rounded-borders q-pa-lg" style="border: 1px solid grey;">
          <div v-if="!options.addMetadata" class="col-xs-12">
            <div class="row items-center flex justify-between">
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <div v-if="mintTx" class="col-xs-12 q-mb-lg q-gutter-y-sm items-center flex text-left text-h6"
                  style="color:rgb(26, 196, 26)">
                  🎉 Minted! <q-btn v-if="mintTx" :href="openTxInExplorer(mintTx)" target="_blank" flat dense
                    color="secondary" label="View Tx" />
                </div>
                <div v-if="!mintTx" class="col-xs-12 q-mb-lg q-gutter-y-sm items-center q-gutter-y-sm">
                  <label>I want to</label>
                  <q-select :options="[
                    { value: MINT_ONE_UNIQUE_NFT, label: MINT_ONE_UNIQUE_NFT },
                    { value: MINT_MULTIPLE_UNIQUE_NFTS, label: MINT_MULTIPLE_UNIQUE_NFTS },
                    { value: MINT_SUPPLY_FOR_A_COMMITMENT, label: MINT_SUPPLY_FOR_A_COMMITMENT },
                    { value: CREATE_MUTABLE_NFT, label: CREATE_MUTABLE_NFT },
                    { value: CREATE_ANOTHER_MINTER, label: CREATE_ANOTHER_MINTER }
                  ]" :model-value="options.mintOption" v-on:update:model-value="(v) => options.mintOption = v.value"
                    dense outlined class="q-mb-xs"></q-select>
                </div>
                <div
                  v-if="options.mintOption === MINT_MULTIPLE_UNIQUE_NFTS || options.mintOption === MINT_SUPPLY_FOR_A_COMMITMENT"
                  class="col-xs-12 q-mb-lg q-gutter-y-sm items-center q-gutter-y-sm">
                  <label>
                    <span v-if="options.mintOption === MINT_MULTIPLE_UNIQUE_NFTS">Number of unique NFTs to mint</span>
                    <span v-else-if="options.mintOption === MINT_SUPPLY_FOR_A_COMMITMENT">Number of NFTs to mint with the
                      below commitment</span>
                  </label>
                  <q-input v-model="options.quantity" style="width:fit-content"
                    :onchange="(v: any) => options.quantity = !v.target.value || v.target.value <= '0' ? 1 : Number(v.target.value)"
                    :outlined="!mintTx" :disable="!!mintTx" :borderless="!!mintTx" dense clearable></q-input>

                </div>
                <div class="row q-gutter-x-sm items-center">
                  <div class="col q-gutter-y-sm">
                    <label>Commitment <span v-if="options.mintOption === MINT_MULTIPLE_UNIQUE_NFTS">(first)</span></label>
                    <q-input v-model="token.commitment" :placeholder="tokenCommmitmentPlaceholderText"
                      :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;"
                      dense :outlined="!mintTx" :disable="!!mintTx" :borderless="!!mintTx">
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
                          <code>{{ rawNftCommitment }}</code>
                          <i>Actual value on-chain
                            <q-icon name="info">
                              <q-tooltip>VM Number. The actual value on-chain.</q-tooltip>
                            </q-icon>
                          </i>
                        </div>
                      </template>
                    </q-input>
                  </div>
                </div>
                <div v-if="options.mintOption === MINT_MULTIPLE_UNIQUE_NFTS && options.quantity > 1"
                  class="row q-gutter-x-sm items-center q-mt-lg">
                  <div class="col q-gutter-y-sm">
                    <label>Commitment (Last)</label>
                    <q-input :model-value="commitmentLast" :placeholder="tokenCommmitmentPlaceholderText"
                      :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;"
                      dense :outlined="!mintTx" :disable="!!mintTx" :borderless="!!mintTx">
                      <template v-slot:prepend>
                        <q-btn :label="options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm"
                          no-caps :icon-right="options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                      </template>
                      <template v-slot:hint>
                        <div v-if="commitmentLast" class="row justify-end items-center">
                          <code>{{ rawNftCommitmentLast }}</code>
                          <i>Actual value on-chain
                            <q-icon name="info">
                              <q-tooltip>The actual value on-chain.</q-tooltip>
                            </q-icon>
                          </i>
                        </div>
                      </template>
                    </q-input>
                  </div>
                </div>
                <div class="col-xs-12 q-mt-lg q-gutter-y-sm ">
                  <label>Capability <code>{{ token.capability }}</code></label>
                  <q-input :model-value="token.capability" dense :outlined="!mintTx" :disable="!!mintTx"
                    :borderless="!!mintTx"></q-input>
                  <!-- <q-select :options="[
                    { value: 'none', label: 'None' },
                    { value: 'minting', label: 'Minting' },
                    { value: 'mutable', label: 'Mutable' }
                  ]" :model-value="token.capability" v-on:update:model-value="(v) => token.capability = v.value" dense
                    outlined class="q-mb-xs"></q-select> -->
                </div>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Sen{{ mintTx ? 't' : 'd' }} To (Defaults to your token address)</label>
                <q-input v-model="options.recipient" dense clearable :outlined="!mintTx" :disable="!!mintTx"
                  :borderless="!!mintTx">
                  <template v-slot:append>
                    <q-btn v-if="!options.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                      color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                      @click="options.recipient = user.walletTokenAddress!" />
                  </template>
                </q-input>
              </div>
              <div class="col-xs-12 text-right q-mt-lg">
                <!-- <q-btn v-if="!mintTx" color="primary" size="lg" @click.stop="confirmMint">Mint</q-btn>
                <q-btn v-if="mintTx && options.addMetadata" color="primary" size="lg" @click.stop="">Save Metadata</q-btn>
                <q-btn v-if="mintTx && !options.deferRegistryPublication" color="primary" size="lg" @click.stop="">Publish
                  Registry</q-btn> -->
                <BusyButton v-if="!mintTx" color="primary" size="lg" @click.stop="confirmMint"
                  :busy-label="ui.minterInView?.processing" label="Mint">
                </BusyButton>

                <p v-if="mintTx" class="text-left q-gutter-sm">
                  The NFT has been added to the blockchain. Do you want to add an asset(E.g. you can upload a digital
                  artwork.) or metadata for this NFT ?
                  <q-btn color="primary" size="lg" @click.stop="options.addMetadata = true">Yes</q-btn>
                  <q-btn color="negative" size="lg" @click.stop="mintTx = ''">No</q-btn>
                </p>
              </div>
            </div>
          </div>
          <div v-if="mintTx && options.addMetadata" class="col-xs-12">
            <div>
              <div class="text-h5">Metadata</div>
              <div>
                <div class="row">
                  <div class="col-xs-12 col-sm-5 justify-center "
                    :class="$q.screen.width >= $q.screen.sizes.sm ? 'q-pr-lg' : 'q-mb-lg'">
                    <div class="row flex justify-center">
                      <div class="col-xs-12 q-mb-sm justify-center flex">
                        <span class="text-h6">NFT Asset</span>
                      </div>
                      <div class="col-xs-12 q-mb-lg justify-center flex">
                        <q-option-group v-model="options.loadAssetFrom"
                          :options="[{ label: 'Upload New', value: 'file' }, { label: 'Load from URL', value: 'url' }]"
                          color="primary" inline dense />
                      </div>
                      <form v-if="options.loadAssetFrom == 'file'"
                        :action="`/api/tokens/nft/asset-upload?tokenId=${token.tokenId}&commitment=${token.commitment}`"
                        class="dropzone" id="nft-assets-dropzone"
                        style="overflow-y: scroll;width: 100%;max-height: 40em; min-height: 20em;">
                      </form>
                      <div v-else class="col-xs-12 q-gutter-y-sm dropurl items-center q-px-lg"
                        style="overflow-y: scroll;width: 100%;max-height: 40em; min-height: 20em;">
                        <q-input v-model="nftType.uris!.asset" outlined label="Enter the NFT asset url here!"
                          style="width: 100%" class="q-mx-lg"></q-input>
                      </div>
                    </div>
                  </div>
                  <div class="col-xs-12 col-sm-7 q-px-lg">
                    <div class="row items-center flex justify-between">
                      <div class="text-h6 q-mb-lg">NFT Type</div>
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
                  <div class="col-xs-12 q-mt-lg">
                    <div class="row items-center flex justify-between">
                      <div class="text-h5 q-mb-lg">NFT Attributes <q-btn flat color="primary" icon="add" size="xs"
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
            </div>
            <div label="Advanced Options" class="col-xs-12" style="border-top: 1px solid grey;">
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
            </div>
            <div class="text-right q-gutter-sm">
              <q-btn color="negative" size="lg" @click.stop="options.addMetadata = false">Cancel</q-btn>
              <q-btn color="primary" size="lg" @click.stop="">Save</q-btn>
            </div>
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
import { ref, computed, watch, onMounted, nextTick, onBeforeMount, unref } from 'vue';
import { NFTCapability, NftType, TokenI, Wallet, binToHex, delay, sha256 } from 'mainnet-js';
import { useQuasar } from 'quasar';
import Dropzone from 'dropzone'
import { ADDRESS_WATCHER_TRIGGERED, CashToken } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import convertHexLEtoBigInt from 'src/app/utils/convertHexLEtoBigInt';
import { NftCollectionType } from 'src/app/types';
import { shortenTokenId, shortenTx, shortenAddress, openTxInExplorer } from 'src/app/utils';
import convertBigIntToHexLE from "src/app/utils/convertBigIntToHexLE"
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { CTSRegistry } from 'src/app/CTSRegistry';
import { useRoute } from 'vue-router';
import { bigIntToVmNumber, sha1 } from '@bitauth/libauth';
import NonFungibleTokens from '../account/balances/NonFungibleTokens.vue';
const Validator = require('jsonschema').Validator

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const route = useRoute()
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

// for single mint
const token = ref<TokenI>({
  amount: BigInt(0),
  tokenId: '',
  capability: NFTCapability.none,
  commitment: ''
})

const commitmentLast = computed(() => {
  if (!token.value.commitment) return ''

  let v
  if (options.value.commitmentFormat === 'decimal') {
    v = Number(token.value.commitment) + Number(options.value.quantity) - 1
  }
  if (options.value.commitmentFormat === 'hex') {
    v = Number(parseInt(token.value.commitment, 16)) + Number(options.value.quantity) - 1
    v = BigInt(v).toString(16)
    v = v.length < 2 ? v.padStart(2, '0') : v
  }
  return v
})

// tx of successful mint
const mintTx = ref<string>('cf168fefc2518386200901178ba4d54d5fd19a00fca06932195d9a24903e06a7')
const MINT_ONE_UNIQUE_NFT = 'Mint 1 unique NFT'
const MINT_MULTIPLE_UNIQUE_NFTS = 'Mint multiple unique NFTs'
const MINT_SUPPLY_FOR_A_COMMITMENT = 'Mint supply for a particular NFT commitment' // Shouldn't update minter
const CREATE_MUTABLE_NFT = 'Create a mutable NFT'
const CREATE_ANOTHER_MINTER = 'Create another minter for this category'


const options = ref<{
  collectionType: NftCollectionType,
  commitmentOfLastMint: string,
  recipient: string,
  commitmentFormat: 'decimal' | 'hex',
  excludeFromSequentialNftCollection: boolean,
  addMetadata: boolean,
  deferRegistryPublication: boolean,
  uploadNftAsset: boolean,
  nftAssetDataURL: string,
  nftAssetFileType: string,
  NftAssetUploadUris: any
  quantity: number,
  uniqueNftQuantity: number,
  mintOption: any,
  loadAssetFrom: any,
  commitmentLast: string
}>({
  collectionType: 'SequentialNftCollection',
  commitmentOfLastMint: '',
  recipient: '',
  commitmentFormat: 'decimal',
  excludeFromSequentialNftCollection: false,
  addMetadata: true,
  deferRegistryPublication: true,
  uploadNftAsset: false,
  nftAssetDataURL: '',
  nftAssetFileType: 'image/png',
  NftAssetUploadUris: null,
  quantity: 1,
  uniqueNftQuantity: 1,
  mintOption: MINT_ONE_UNIQUE_NFT,
  loadAssetFrom: 'file',
  commitmentLast: ''
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
 * VM Number, actual commitment on chain. 
 */
const rawNftCommitment = computed<string | undefined>(() => {
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

/**
 * VM Number, actual commitment on chain, this if for  
 */
const rawNftCommitmentLast = computed<string>(() => {
  if (nftCollectionType.value === 'ParsableNftCollection') {
    return commitmentLast.value
  }

  let commitment = commitmentLast.value
  if (commitment && options.value.commitmentFormat === 'decimal') {
    commitment = convertBigIntToHexLE(BigInt(commitment))
  }

  if (commitment && options.value.commitmentFormat === 'hex') {
    commitment = parseInt(String(commitment), 16).toString()
    commitment = convertBigIntToHexLE(BigInt(commitment))
  }
  return commitment || ''
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
  const tokens: any = []
  if (options.value.quantity == 1) {
    const t = Object.assign({}, token.value)
    t.commitment = rawNftCommitment.value
    tokens.push(t)
  }

  if (options.value.quantity > 1) {
    let firstCommitment =
      options.value.commitmentFormat === 'decimal' ? Number(token.value.commitment) : Number(parseInt(token.value.commitment!, 16))
    if (options.value.mintOption === MINT_MULTIPLE_UNIQUE_NFTS) {
      for (let i = firstCommitment; i <= options.value.quantity + 1; i++) {
        tokens.push({
          amount: BigInt(0),
          tokenId: ui.minterInView?.token?.tokenId,
          commitment: bigIntToVmNumber(BigInt(i)), // Use sequential commitment 
          capability: token.value.capability,
        })
      }
    }

    if (options.value.mintOption === MINT_SUPPLY_FOR_A_COMMITMENT) {
      for (let i = firstCommitment; i <= options.value.quantity + 1; i++) {
        tokens.push({
          amount: BigInt(0),
          tokenId: ui.minterInView?.token?.tokenId,
          commitment: rawNftCommitment.value, // Use same commitment on all tokens
          capability: token.value.capability,
        })
      }
    }
  }

  if (ui.minterInView) {

    try {

      const lastToken = tokens[tokens.length - 1]
      let newMinterCommitment = ui.minterInView.token?.commitment
      if (lastToken.capability == NFTCapability.none && options.value.mintOption !== MINT_SUPPLY_FOR_A_COMMITMENT) {
        // only track commitment in minter if the child's capability is `none`
        // so we can preserve the sequence
        newMinterCommitment = lastToken.commitment
      }

      const tx = await ui.minterInView.mintChildrenExt({
        tokens: tokens as [TokenI],
        recipient: options.value.recipient,
        newMinterCommitment: newMinterCommitment
      })

      if (tx) {
        mintTx.value = tx
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


    // const message = {
    //   txid: '46a81267860da53a4b76dd00ad39dd1cbf2ff7f7b13524c83a361d9941958c25',
    //   tokenId: '5ff749ca2d929eb23b56de0b5dbd9023ef2916199c122a8590cff5ada6c6a463',
    //   nftCapability: 'none',
    //   rawNftCommitment: '01', //rawNftCommitment.value
    //   address: user.wallet?.getDepositAddress(),
    //   nftType: nftType.value
    // }

    // await delay(3000)
    // await (new CTSRegistry()).createWorkspace(user.transactionSigner!, JSON.stringify(message))
    // // TODO: handle response
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

watch(() => options.value.mintOption, (o) => {
  if (o === CREATE_MUTABLE_NFT) {
    return token.value.capability = NFTCapability.mutable
  }
  if (o === CREATE_ANOTHER_MINTER) {
    return token.value.capability = NFTCapability.minting
  }
  token.value.capability = NFTCapability.none
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
    autoProcessQueue: true,
    addRemoveLinks: true,
    paramName: 'file',
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

          // fileReader.onload = function () {
          //   const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
          //   const uint8Array = new Uint8Array(arrayBuffer);
          //   console.log('sha1', binToHex(sha1.hash(uint8Array)))
          // };
          // fileReader.readAsArrayBuffer(file);
        }

      })

      this.on('removedfile', (file) => {
        options.value.nftAssetDataURL = ''
        if (file.type === 'application/json') {
          nftAttributes.value = {}
        }
      })

      this.on('success', (file, response: any) => {
        console.log('SUCCESS', response)
        nftType.value.uris!.asset = response?.assetUris?.ipfs
        const fileReader = new FileReader()
        fileReader.onload = function () {
          const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          localStorage.setItem(`asseturis-${binToHex(sha1.hash(uint8Array))}`, JSON.stringify(response))
        };
        fileReader.readAsArrayBuffer(file);
      })

      this.on('accept', (file: any) => {
        console.log(file)
      })
    }
  }
})

watch(() => options.value.loadAssetFrom, (v) => {
  if (v == 'file') {
    nextTick(() => {
      Dropzone.discover();
      if (document.querySelector('.dz-button')) {
        document.querySelector('.dz-button')!.innerHTML! = 'Drop your NFT asset here.'
      }
    });
  }
})

onMounted(() => {
  initCommitment()
  options.value.recipient = user.walletTokenAddress
  token.value.tokenId = route.params.tokenId! as string
  nextTick(() => {
    Dropzone.discover();
    if (document.querySelector('.dz-button')) {
      document.querySelector('.dz-button')!.innerHTML! = 'Drop your NFT asset here.'
    }
  });

  $ebus?.on(ADDRESS_WATCHER_TRIGGERED, async () => {
    await ui.minterInView?.updateUtxo()
    await ui.minterInView?.updateAuthKeyUtxo()
    // initCommitment()
  })
})

</script>


<style lang="scss">
.dropurl {
  border: 2px dashed rgb(129 123 123 / 80%);
  padding: unset;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

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

.dz-progress {
  margin-top: -50px !important;
}
</style>
