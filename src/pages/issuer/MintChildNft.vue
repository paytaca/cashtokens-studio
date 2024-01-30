<template>
  <q-page full-width class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row items-center q-gutter-sm page-header q-mb-lg">
          <q-btn round color="#434242" icon="west" style="background-color: #434242;" @click.stop="router.back()" />
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
                <td><span class="text-light">{{ state.mintersCommitment || '<none>'
                }}</span>
                </td>
              </tr>
              <tr>
                <td>Minter's Utxo: </td>
                <td><span class="text-light">{{ ui.minterInView?.txid || '<none>'
                }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <q-stepper v-model="state.step" vertical color="info" animated flat>
          <q-step :name="1" title="Mint the token" :icon="nftType.saved ? 'done_all' : 'token'" :done="state.step > 1">
            <!-- <div class="row items-center flex justify-between rounded-borders q-pa-lg" style="border: 1px solid grey;"> -->
            <div class="row items-center flex justify-between">
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <div v-if="state.mintTx" class="col-xs-12 q-mb-lg q-gutter-y-sm items-center flex text-left text-h6"
                  style="color:rgb(26, 196, 26)">
                  🎉 Minted! <q-btn v-if="state.mintTx" :href="openTxInExplorer(state.mintTx)" target="_blank" flat dense
                    color="secondary" label="View Tx" />
                </div>
                <div v-if="!state.mintTx" class="col-xs-12 q-mb-lg q-gutter-y-sm items-center q-gutter-y-sm">
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
                    :outlined="!state.mintTx" :disable="!!state.mintTx" :borderless="!!state.mintTx" dense
                    clearable></q-input>

                </div>
                <div class="row q-gutter-x-sm items-center">
                  <div class="col q-gutter-y-sm">
                    <label>Commitment <span v-if="options.mintOption === MINT_MULTIPLE_UNIQUE_NFTS">(first)</span></label>
                    <q-input v-model="token.commitment" :placeholder="tokenCommmitmentPlaceholderText"
                      :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" style="padding-bottom:unset;"
                      dense :outlined="!state.mintTx" :disable="!!state.mintTx" :borderless="!!state.mintTx">
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
                      dense :outlined="!state.mintTx" :disable="!!state.mintTx" :borderless="!!state.mintTx">
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
                  <q-input :model-value="token.capability" dense :outlined="!state.mintTx" :borderless="!!state.mintTx"
                    disable></q-input>
                </div>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right">
                <label>Sen{{ state.mintTx ? 't' : 'd' }} To (Defaults to your token address)</label>
                <q-input v-model="options.recipient" dense clearable :outlined="!state.mintTx" :disable="!!state.mintTx"
                  :borderless="!!state.mintTx">
                  <template v-slot:append>
                    <q-btn v-if="!options.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                      color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                      @click="options.recipient = user.walletTokenAddress!" />
                  </template>
                </q-input>
              </div>
            </div>
            <q-stepper-navigation>
              <div class="text-right">
                <q-btn flat v-if="state.mintTx" @click="addMetadata" color="primary" label="Continue" class="q-ml-sm" />

                <BusyButton v-if="!state.mintTx" color="primary" @click.stop="confirmMint"
                  :busy-label="ui.minterInView?.processing" label="Mint">
                </BusyButton>
              </div>
            </q-stepper-navigation>
          </q-step>

          <q-step :name="2" title="Describe your NFT" caption="Optional"
            :icon="nftType.saved ? 'done_all' : 'description'" :done="state.step > 2">
            <div v-if="nftType.saved" class="text-right">
              <q-icon v-if="nftType.saved" name="done_all" color="primary"></q-icon> Saved
            </div>

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
              <div class="col-xs-12 col-sm-7">
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
                  <div class="text-h5 q-mb-lg">NFT Attributes <q-btn flat color="primary" icon="add" size="md"
                      @click="addNftAttribute" />
                  </div>
                </div>
                <div class="row items-center flex justify-between">
                  <div v-for="attrKey, i in Object.keys(nftAttributes)"
                    class="col-xs-12 q-mb-lg q-gutter-y-sm items-center justify-right" :key="i">
                    <label>{{ attrKey }}</label>
                    <q-input v-model="nftAttributes[attrKey]" outlined dense clearable>
                      <template v-slot:after>
                        <q-icon v-if="!nftType.saved" name="remove" @click.stop="() => delete nftAttributes[attrKey]"
                          color="negative"></q-icon>
                      </template>
                    </q-input>
                  </div>
                </div>
              </div>
            </div>
            <q-stepper-navigation>
              <div class="text-right q-gutter-sm">
                <q-btn flat @click="state.step = 1" label="Back" class="q-ml-sm" :disable="!!nftType?.processing" />
                <q-btn v-if="nftType.saved" flat @click="state.step = 3" color="primary" label="Continue"
                  class="q-ml-sm" />
                <q-btn v-if="!nftType.saved" flat @click="state.step = 3" color="primary" label="Skip" class="q-ml-sm" />
                <BusyButton color="primary" @click.stop="saveNftType" :busy-label="nftType?.processing" label="Save"
                  :disable="!nftType.name">
                </BusyButton>
              </div>
            </q-stepper-navigation>
          </q-step>
          <q-step :name="3" title="Publish Registry" :icon="nftType.saved ? 'done_all' : 'data_object'"
            :disable="!nftType.saved">
            <span>Do you want to publish an updated registry that includes this recently added NFT?</span>
            <q-option-group v-model="options.publishOption"
              :options="[{ label: 'Publish Now', value: 'now' }, { label: 'Publish Later (Recommended if you\'re minting another NFT)', value: 'later' }]"
              color="primary" />
            <q-stepper-navigation>
              <div class="text-right q-gutter-sm">
                <q-btn flat @click="state.step = 2" label="Back" class="q-ml-sm" />
                <q-btn v-if="options.publishOption == 'later'" @click="state.step = 4" color="primary" label="Next"
                  class="q-ml-sm" />
                <BusyButton v-if="options.publishOption == 'now'" color="primary" size="md" @click.stop="publishRegistry"
                  :busy-label="ui.minterInView?.processing" label="Publish Registry">
                </BusyButton>
              </div>
            </q-stepper-navigation>
          </q-step>

          <q-step :name="4" title="Finish" icon="add_comment">
            <span>Do you want to mint another one?</span>
            <q-stepper-navigation>
              <div class="text-right q-gutter-sm">

                <q-btn flat @click="nftType.saved ? (state.step = 3) : (state.step = 2)" label="Back" class="q-ml-sm" />
                <q-btn color="negative" @click.stop="$router.back()">No i'm done here</q-btn>
                <BusyButton color="primary" @click.stop="mintAnother" :busy-label="ui.minterInView?.processing"
                  label="Yes">
                </BusyButton>
              </div>
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
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
import { ref, computed, watch, onMounted, nextTick, onBeforeMount, onBeforeUnmount } from 'vue';
import { NFTCapability, NftType, TokenI, binToHex } from 'mainnet-js';
import { useQuasar } from 'quasar';
import Dropzone from 'dropzone'
import { ADDRESS_WATCHER_TRIGGERED, ChainGraph } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import { NftCollectionType } from 'src/app/types';
import { shortenTokenId, shortenTx, shortenAddress, openTxInExplorer, formatCommitment } from 'src/app/utils';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { RegistryNftType } from 'src/app';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { bigIntToVmNumber, sha1 } from '@bitauth/libauth';
import { Console } from 'console';

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const route = useRoute()
const router = useRouter()
const dropzone = ref<Dropzone>()

/**
 * Value of this should be resolved from bcmr, but since we're just currently supporting
 * SequentialNftCollection, we'll use the default. ParsableNftCollection will be handled
 * differently
 */
const nftCollectionType = ref<NftCollectionType>('SequentialNftCollection')


// metadata
const nftType = ref<RegistryNftType>(new RegistryNftType({
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
}))

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
  const v = BigInt(formatCommitment(token.value.commitment, options.value.commitmentFormat, 'decimal')) + BigInt(options.value.quantity) - BigInt(1)
  return formatCommitment(v.toString(), 'decimal', options.value.commitmentFormat).toString()

})

// tx of successful mint
// const state.mintTx = ref<string>()
const MINT_ONE_UNIQUE_NFT = 'Mint 1 unique NFT'
const MINT_ONE_NON_UNIQUE_NFT = 'Mint 1 nonunique NFT'
const MINT_MULTIPLE_UNIQUE_NFTS = 'Mint multiple unique NFTs'
const MINT_SUPPLY_FOR_A_COMMITMENT = 'Mint supply for a particular NFT commitment' // Shouldn't update minter
const CREATE_MUTABLE_NFT = 'Create a mutable NFT'
const CREATE_ANOTHER_MINTER = 'Create another minter for this category'

const state = ref<{
  step: number,
  mintTx: string,
  mintersCommitment: string,
}>({
  step: 1,
  mintTx: '',
  mintersCommitment: ''
})

const options = ref<{
  collectionType: NftCollectionType,
  recipient: string,
  commitmentFormat: 'decimal' | 'hex',
  excludeFromSequentialNftCollection: boolean,
  addMetadata: boolean,
  deferRegistryPublication: boolean,
  nftAssetDataURL: string,
  nftAssetFileType: string,
  NftAssetUploadUris: any
  quantity: number,
  mintOption: string,
  loadAssetFrom: any,
  commitmentLast: string,
  publishOption: 'now' | 'later'
}>({
  collectionType: 'SequentialNftCollection',
  recipient: '',
  commitmentFormat: 'decimal',
  excludeFromSequentialNftCollection: false,
  addMetadata: false,
  deferRegistryPublication: true,
  nftAssetDataURL: '',
  nftAssetFileType: 'image/png',
  NftAssetUploadUris: null,
  quantity: 1,
  mintOption: MINT_ONE_UNIQUE_NFT,
  loadAssetFrom: 'file',
  commitmentLast: '',
  publishOption: 'later'
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
  return formatCommitment(token.value.commitment || '', options.value.commitmentFormat, 'vm-number').toString()
})

/**
 * VM Number, actual commitment on chain, this if for  
 */
const rawNftCommitmentLast = computed<string>((): string => {
  if (nftCollectionType.value === 'ParsableNftCollection') {
    return commitmentLast.value
  }
  return formatCommitment(commitmentLast.value || '', options.value.commitmentFormat, 'vm-number').toString()
})


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

const addMetadata = () => {
  state.value.step = 2
  options.value.addMetadata = true
  if (!nftType.value.name && ui.minterInView?.tokenCategory?.symbol) {
    nftType.value.name = ui.minterInView?.tokenCategory?.symbol + '-' + token.value.commitment
  }
  nextTick(() => {
    Dropzone.discover();
    if (document.querySelector('.dz-button')) {
      document.querySelector('.dz-button')!.innerHTML! = 'Drop your NFT asset here.'
    }
  });
}


const convertCommitment = () => {
  if (token.value.commitment && options.value.commitmentFormat === 'decimal') {
    options.value.commitmentFormat = 'hex'
    token.value.commitment = formatCommitment(token.value.commitment || '', 'decimal', 'hex')
  } else if (token.value.commitment && options.value.commitmentFormat === 'hex') {
    token.value.commitment = formatCommitment(token.value.commitment || '', 'hex', 'decimal')
    options.value.commitmentFormat = 'decimal'
  }
}

const initCommitment = () => {
  if (ui.minterInView?.token?.commitment && nftCollectionType.value === 'SequentialNftCollection') {
    options.value.commitmentFormat = 'decimal'
    state.value.mintersCommitment = formatCommitment(ui.minterInView?.token?.commitment, 'vm-number', 'decimal').toString()
    token.value.commitment = (BigInt(state.value.mintersCommitment) + BigInt(1)).toString()
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
    if (options.value.mintOption === MINT_MULTIPLE_UNIQUE_NFTS) {
      let firstCommitment = formatCommitment(token.value.commitment as string, options.value.commitmentFormat, 'decimal')
      for (let i = 0; i < options.value.quantity; i++) {
        tokens.push({
          amount: BigInt(0),
          tokenId: ui.minterInView?.token?.tokenId,
          commitment: binToHex(bigIntToVmNumber(BigInt(firstCommitment) + BigInt(i))), // Use sequential commitment 
          capability: token.value.capability,
        })
      }
    }

    if (options.value.mintOption === MINT_SUPPLY_FOR_A_COMMITMENT) {
      for (let i = 0; i < options.value.quantity; i++) {
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
        state.value.mintTx = tx
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
  }
}

const saveNftType = async () => {
  try {

    nftType.value.extensions = {
      ...nftType.value.extensions,
      attributes: nftAttributes.value
    }
    const t = Object.assign({}, token.value, { commitment: rawNftCommitment.value })
    const r = await nftType.value.saveNft(state.value.mintTx!, t, user.transactionSigner!, user.walletAddress!)
    if (r) {
      ui.setStatusMessage({
        statusMessage: `Saved Nft metadata`,
        statusMessageType: 'success',
      })
    }

  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    })
  }

}

const publishRegistry = async () => {

  // if (options.value.publishOption == 'later') {
  //   return state.value.step = 4
  // }
  // check if this is an authchain authhead
  if (ui.minterInView?.utxoSpent) {
    await ui.minterInView.updateUtxo()
    await ui.minterInView.updateAuthKeyUtxo()
  }
  const authhead = await (new ChainGraph()).fetchAuthheadTxid(ui.minterInView!.token!.tokenId!)

  if (authhead == ui.minterInView?.txid) {
    console.log('Publishing')
  } else {
    $q.dialog({
      dark: true,
      message: 'Unauthorized, invalid auth identity.',
      persistent: true,
      ok: true,
      focus: 'ok',

    }).onOk(() => {
      console.log('OK')
    })
  }

  console.log('authhead', authhead)
}

const mintAnother = async () => {
  try {
    await ui.minterInView?.updateUtxo()
    await ui.minterInView?.updateAuthKeyUtxo()
    state.value.mintTx = ''
    initCommitment()
    state.value.step = 1
    nftType.value = new RegistryNftType({
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
  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    })
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

onMounted(async () => {
  initCommitment()
  options.value.recipient = user.walletTokenAddress
  token.value.tokenId = route.params.tokenId! as string

  // console.log('authhead', authhead)
  // $ebus?.on(ADDRESS_WATCHER_TRIGGERED, async () => {
  //   await ui.minterInView?.updateUtxo()
  //   await ui.minterInView?.updateAuthKeyUtxo()
  //   // initCommitment()
  // })
})

onBeforeRouteLeave((to, from, next) => {
  $q.dialog({
    dark: true,
    message: 'Are you sure you want to leave the page?',
    persistent: true,
    ok: true,
    cancel: true,
    focus: 'cancel'
  }).onOk(() => {
    next()
    // router.back()
  }).onCancel(() => {
    next(false)
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
