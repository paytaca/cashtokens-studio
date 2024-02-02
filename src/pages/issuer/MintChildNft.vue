<template>
  <q-page>
    <div class="row justify-center q-gutter-md">
      <div class="col-xs-12 col-sm-10 col-lg-9 bg-dark q-pa-lg">
        <div class="row q-gutter-md">
          <div class="col-xs-12">
            <q-avatar v-if="ui.minterInView?.tokenUris?.icon" square size="5em">
              <q-img :src="ui.minterInView?.tokenUris?.icon"></q-img>
            </q-avatar>
          </div>
          <div class="col-xs-12">
            <div class="row">
              <div class="col-xs-5 col-sm-4">Token ID</div>
              <div class="col-xs-7 col-sm-auto">{{ $q.screen.lt.md ? shortenTx(ui.minterInView?.token?.tokenId!) :
                ui.minterInView?.token?.tokenId }}</div>
            </div>
            <div class="row">
              <div class="col-xs-5 col-sm-4">Minter's Commitment</div>
              <div class="col-xs-7 col-sm-auto ">{{ state.mintersCommitment }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <q-stepper v-model="state.step" active-color="warning" done-icon="done_all" done-color="primary" vertical animated
          flat>
          <q-step :name="1" :title="!state.mintTx ? 'Mint the token' : '🎉 NFT Minted!'" icon="token"
            :done="state.step > 1">
            <q-chip v-if="state.mintTx" square>
              <q-avatar color="success" text-color="positive" icon="done_all" size="lg"></q-avatar>
              🎉 NFT Minted! <q-btn :href="openTxInExplorer(state.mintTx)" target="_blank" flat dense color="secondary"
                label="View Tx" />
            </q-chip>
            <q-form ref="mintForm" class="q-gutter-md q-pa-lg" @submit.prevent="mint">
              <q-select :options="[
                { value: MINT_ONE_UNIQUE_NFT, label: MINT_ONE_UNIQUE_NFT },
                { value: MINT_MULTIPLE_UNIQUE_NFTS, label: MINT_MULTIPLE_UNIQUE_NFTS },
                { value: MINT_SUPPLY_FOR_A_COMMITMENT, label: MINT_SUPPLY_FOR_A_COMMITMENT },
                { value: CREATE_MUTABLE_NFT, label: CREATE_MUTABLE_NFT },
                { value: CREATE_ANOTHER_MINTER, label: CREATE_ANOTHER_MINTER }
              ]" :model-value="options.mintOption" v-on:update:model-value="(v) => options.mintOption = v.value"
                :outlined="!state.mintTx" :disable="!!state.mintTx" :readonly="!!state.mintTx" class="q-mb-xs"
                label="I want to" stack-label>
              </q-select>
              <q-input v-if="options.mintOption != MINT_ONE_UNIQUE_NFT" v-model="options.quantity"
                style="width:fit-content"
                :onchange="(v: any) => options.quantity = !v.target.value || v.target.value <= '0' ? 1 : Number(v.target.value)"
                :outlined="!state.mintTx" :disable="!!state.mintTx" :readonly="!!state.mintTx" clearable type="number"
                label="Number of tokens to mint">
              </q-input>
              <q-input v-model="token.commitment" :placeholder="tokenCommmitmentPlaceholderText"
                :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" :outlined="!state.mintTx"
                :disable="!!state.mintTx" :readonly="!!state.mintTx" label="Commitment">
                <template v-slot:prepend>
                  <q-btn :label="options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm" no-caps
                    :icon-right="options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
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
              <q-input v-if="options.quantity > 1" :model-value="commitmentLast"
                :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" :outlined="!state.mintTx"
                :disable="!!state.mintTx" :readonly="!!state.mintTx" label="Commitment (last)">
                <template v-slot:prepend>
                  <q-btn :label="options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm" no-caps
                    :icon-right="options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
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
                    <code>{{ rawNftCommitmentLast }}</code>
                    <i>Actual value on-chain
                      <q-icon name="info">
                        <q-tooltip>VM Number. The actual value on-chain.</q-tooltip>
                      </q-icon>
                    </i>
                  </div>
                </template>
              </q-input>
              <q-input :model-value="token.capability" :outlined="!state.mintTx" :disable="!!state.mintTx"
                :readonly="!!state.mintTx" label="Capability"></q-input>
              <q-input v-model="options.recipient" clearable :outlined="!state.mintTx" :disable="!!state.mintTx"
                :label="`Sen${state.mintTx ? 't' : 'd'} To (Defaults to your token address)`"
                :rules="[(v) => /^((bitcoincash:|bchtest:)?(z)[a-zA-Z0-9]{1,64})$/.test(v) || 'Enter a valid token addresss']">
                <template v-slot:append>
                  <q-btn v-if="!options.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                    color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                    @click="options.recipient = user.walletTokenAddress!" />
                </template>
              </q-input>
              <q-stepper-navigation class="text-right q-my-lg q-px-lg">
                <q-btn v-if="state.mintTx && options.mintOption == MINT_ONE_UNIQUE_NFT" name="stepper-nav" flat
                  @click.stop="handleStepperNav" color="primary" label="Continue" class="q-ml-sm" size="lg" />
                <q-btn v-if="!state.mintTx" type="submit" color="primary" label="Mint NFT" class="q-ml-sm self-right"
                  size="lg" />
                <q-btn @click.stop="mintAnother" color="primary" label="Mint Another One" class="q-ml-sm self-right"
                  size="lg" />
              </q-stepper-navigation>

            </q-form>
          </q-step>
          <q-step :name="2" title="Provide NFT asset"
            :caption="options.mintOption == MINT_ONE_UNIQUE_NFT ? 'Optional' : 'Unsupported'" icon="attach_file"
            done-icon="done_all" class="q-gutter-md">

            <q-chip v-if="nftType.saved" square>
              <q-avatar color="success" text-color="positive" icon="done_all" size="lg"></q-avatar>
              Saved
            </q-chip>
            <p style="text-align: justify;">Drop your NFT asset here. The NFT asset is the off-chain resource that the
              token
              represents.
              This could be an image, pdf, music, etc... To upload an icon, drop a file with name 'icon', e.g.
              icon.png
            </p>
            <q-uploader ref="fileUploader" @uploaded="onFileUploaded" @added="onFileAdded" :factory="fileUploaderFactory"
              field-name="file" :label="'Upload'"
              :url="`/api/tokens/nft/asset-upload?tokenId=${token.tokenId}&commitment=${token.commitment}`" flat dense
              size="sm" style="width:100%;max-width: 100%; border: 2px dashed rgb(129 123 123 / 80%); " color="dark"
              class="q-my-md" multiple square bordered no-thumbnails />
            <div class="text-center text-h6 q-my-lg">Or</div>
            <div class="text-center">You can paste the asset URI here below. We recommend using IPFS (ipfs://). </div>

            <q-form id="nft-type-form" @submit.prevent="saveNftType" class="q-gutter-md q-mt-md">
              <div class="row items-center q-gutter-sm">
                <q-avatar v-if="nftTypeAssetHttpUri" rounded>
                  <q-img :src="nftTypeAssetHttpUri"></q-img>
                </q-avatar>
                <q-input class="col" v-model="nftType.uris!.asset" label="NFT Asset URI" outlined></q-input>
              </div>
              <div class="row items-center q-gutter-sm">
                <q-avatar v-if="nftTypeIconHttpUri" rounded>
                  <q-img :src="nftTypeIconHttpUri"></q-img>
                </q-avatar>
                <q-input class="col" v-model="nftType.uris!.icon" label="Icon URI" outlined></q-input>
              </div>
              <div class="text-h6 q-mt-md">NFT Details</div>
              <q-input v-model="nftType.name" label="Name*" outlined></q-input>
              <q-input v-model="nftType.description" label="Description" outlined clearable></q-input>

              <div class="text-h6 q-mt-md">NFT Attributes<q-btn flat color="primary" icon="add" size="md"
                  @click="openAttributeDialog" type="button" /></div>
              <div class="row q-gutter-md">
                <q-input v-for="attrKey, i in Object.keys(nftAttributes)" v-model="nftAttributes[attrKey]" outlined dense
                  :label="attrKey" :key="i">
                  <template v-slot:after>
                    <q-icon v-if="!nftType.saved" name="delete_forever" @click.stop="() => delete nftAttributes[attrKey]"
                      color="negative" class="cursor-pointer">
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <q-stepper-navigation class="text-right q-my-lg q-px-lg">
                <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" label="Back" class="q-ml-sm" size="lg" />
                <q-btn v-if="nftType.saved" name="stepper-nav" flat @click.stop="handleStepperNav" color="primary"
                  label="Continue" class="q-ml-sm" size="lg" />
                <q-btn name="stepper-nav" @click.stop="saveNftType" color="primary" label="Save" class="q-ml-sm" size="lg"
                  :disable="!nftType.name" :icon-right="nftType.saved ? 'done_all' : undefined" />
              </q-stepper-navigation>
            </q-form>
          </q-step>
          <q-step :name="3" title="Publish registry update"
            :caption="options.mintOption == MINT_ONE_UNIQUE_NFT ? 'Optional' : 'Unsupported'" icon="data_object"
            done-icon="done_all">
            <q-stepper-navigation class="text-right q-my-lg q-px-lg">
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Back" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Skip" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Continue"
                class="q-ml-sm" size="lg" />
            </q-stepper-navigation>
          </q-step>
          <q-step v-if="options.mintOption == MINT_ONE_UNIQUE_NFT" :name="4" title="Wrap up" icon="exit_to_app"
            done-icon="done_all">
            <q-stepper-navigation class="text-right q-my-lg q-px-lg">
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Back" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Skip" class="q-ml-sm"
                size="lg" />
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeMount, unref } from 'vue';
import { NFTCapability, NftType, TokenI, binToHex } from 'mainnet-js';
import { Dialog, DialogChainObject, useQuasar } from 'quasar';
import { ADDRESS_WATCHER_TRIGGERED, ChainGraph } from 'src/app';
import { useUser } from 'src/stores/user'
import { NftCollectionType } from 'src/app/types';
import { shortenTokenId, shortenTx, shortenAddress, openTxInExplorer, formatCommitment, copyText, ipfsToGatewayUrl } from 'src/app/utils';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { RegistryNftType } from 'src/app';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { bigIntToVmNumber, sha1 } from '@bitauth/libauth';
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import { useLocalForage } from 'src/composables/useLocalForage';
import localforage from 'localforage';

const MINT_ONE_UNIQUE_NFT = 'Mint 1 unique NFT'
const MINT_ONE_NON_UNIQUE_NFT = 'Mint 1 nonunique NFT'
const MINT_MULTIPLE_UNIQUE_NFTS = 'Mint multiple unique NFTs'
const MINT_SUPPLY_FOR_A_COMMITMENT = 'Mint supply for a particular NFT commitment' // Shouldn't update minter
const CREATE_MUTABLE_NFT = 'Create a mutable NFT'
const CREATE_ANOTHER_MINTER = 'Create another minter for this category'
const supportAssetUpload = [
  MINT_ONE_UNIQUE_NFT
]

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const route = useRoute()
const mintForm = ref()
const fileUploader = ref()
const localForage = useLocalForage()
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

const nftTypeIconHttpUri = computed(() => {
  if (nftType.value.uris?.icon.startsWith('ipfs://')) {
    return ipfsToGatewayUrl(nftType.value.uris?.icon)
  }
  return nftType.value.uris?.icon
})

const nftTypeAssetHttpUri = computed(() => {
  if (nftType.value.uris?.asset.startsWith('ipfs://')) {
    return ipfsToGatewayUrl(nftType.value.uris?.asset)
  }
  return nftType.value.uris?.asset
})

const nftAttributes = ref<any>({})

// for single mint
const token = ref<TokenI>({
  amount: BigInt(0),
  tokenId: '5ff749ca2d929eb23b56de0b5dbd9023ef2916199c122a8590cff5ada6c6a463',
  capability: NFTCapability.none,
  commitment: '26'
})

const commitmentLast = computed(() => {
  if (!token.value.commitment) return ''
  const v = BigInt(formatCommitment(token.value.commitment, options.value.commitmentFormat, 'decimal')) + BigInt(options.value.quantity) - BigInt(1)
  return formatCommitment(v.toString(), 'decimal', options.value.commitmentFormat).toString()
})


const state = ref<{
  step: number,
  mintTx: string,
  mintersCommitment: string,
}>({
  step: 1,
  mintTx: '760923415a8138082deb731e680cc066316a6a4d066bd808eb338d1852512b7c',
  // mintTx: '',
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
  commitmentLast: string,
  publishOption: 'now' | 'later',
  useAssetImageAsIcon: boolean,
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
  commitmentLast: '',
  publishOption: 'later',
  useAssetImageAsIcon: false,
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

const openAttributeDialog = () => {
  $q.dialog({
    component: NftAttributeDialog,
  }).onOk((attribute) => {
    nftAttributes.value = { ...nftAttributes.value, [attribute.name]: attribute.value }
  })
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

const fileUploaderFactory = (files: any): Promise<any> => {
  console.log('FILES', files)
  return new Promise((resolve) => {
    const fileReader = new FileReader()
    fileReader.onload = function () {
      const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      const h = binToHex(sha1.hash(uint8Array))
      resolve({
        url: `/api/tokens/nft/asset-upload?tokenId=${token.value.tokenId}&commitment=${token.value.commitment}&h=${h}`
      })
    };
    fileReader.readAsArrayBuffer(files[0]);

  })
}

const onFileUploaded = (info: any) => {
  try {
    const serverResponse = JSON.parse(info.xhr.responseText)
    if (serverResponse.originalFilename?.startsWith('icon')) {
      nftType.value.uris!.icon = serverResponse.uris.ipfs
    } else {
      nftType.value.uris!.asset = serverResponse.uris.ipfs
    }
    localStorage.setItem(`h-${serverResponse.h}`, JSON.stringify(serverResponse))
  } catch (error) {
    console.log(error)
  }
}

const onFileAdded = async (files: readonly any[]) => {
  for (const f of files) {
    try {
      await new Promise((res, rej) => {
        const fileReader = new FileReader()
        fileReader.onload = function () {
          const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const h = binToHex(sha1.hash(uint8Array))
          if (localStorage.getItem(`h-${h}`)) {
            let data = JSON.parse(localStorage.getItem(`h-${h}`) as string)
            if (data.originalFilename.startsWith('icon')) {
              nftType.value.uris!.icon = data.uris.ipfs
            } else {
              nftType.value.uris!.asset = data.uris.ipfs
              nftType.value.uris!.image = data.uris.ipfs
            }
            rej()
          }

        };
        fileReader.readAsArrayBuffer(f);
      })
    } catch (error) {
      fileUploader.value.removeFile(f)
    }
  }
  fileUploader.value.upload()
}

watch(() => ui.minterInView!.processing, (v, oldV) => {
  if (v && !ui.dialog) {
    return ui.dialog = $q.dialog({
      message: v,
      ok: false,
      progress: true
    })
  } else if (v && ui.dialog) {
    return ui.dialog = ui.dialog.update({
      message: v,
      ok: false,
      progress: true
    })
  }
  if (!v && ui.dialog) {
    try {
      ui.dialog.hide()
    } catch (error) {
      ui.dialog = undefined
    }
  }
})

const mint = async () => {

  if (state.value.mintTx) {
    await ui.minterInView?.updateUtxo()
    await ui.minterInView?.updateAuthKeyUtxo()
    return state.value.mintTx = ''
  }

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
      console.log('LASTTOKEN', lastToken)
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
    } finally {
    }
  }
}

const saveNftType = async () => {
  try {

    let proceed = false
    if (await localForage.nftTypesStore.getItem(`${token.value.tokenId}-${rawNftCommitment.value}`)) {
      proceed = await new Promise((res) => {
        $q.dialog({
          message: 'This will overwrite the existing data. Do you want to proceed?',
          class: 'q-pa-md',
          ok: { label: 'Yes', color: 'primary', flat: true },
          cancel: { label: 'No', color: 'negative', flat: true },
          focus: 'cancel'
        }).onCancel(() => {
          res(false)
        }).onOk(() => {
          res(true)
        })
      })
    }

    if (!proceed) return

    nftType.value.extensions = {
      ...nftType.value.extensions,
      attributes: nftAttributes.value
    }
    // const t = Object.assign({}, token.value, { commitment: rawNftCommitment.value })
    // const r = await nftType.value.saveNft(state.value.mintTx!, t, user.transactionSigner!, user.walletAddress!)
    await localForage.nftTypesStore.setItem(`${token.value.tokenId}-${rawNftCommitment.value}`, JSON.stringify({ [rawNftCommitment.value as string]: nftType.value.value }))
    const item = await localForage.nftTypesStore.getItem(`${token.value.tokenId}-${rawNftCommitment.value}`)
    if (item) {
      nftType.value.saved = true
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

  const d = $q.dialog({
    dark: true,
    message: 'Authenticating, minter\'s utxo from the authchain',
    ok: false,
    cancel: false,
    progress: true,
  })

  const authhead = await (new ChainGraph()).fetchAuthheadTxid(ui.minterInView!.token!.tokenId!)

  if (authhead != ui.minterInView?.txid) {

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

  d.update({ message: 'Authentication ok, creating a draft of the new registry. Please wait...' })

  const prevPublication = await (new ChainGraph()).retrieveLastRegistryPublication(ui.minterInView!.token!.tokenId!)
  console.log('prevPublication', prevPublication)
  d.hide()
}

const mintAnother = async () => {
  let proceed = false
  if (supportAssetUpload.includes(options.value.mintOption) && !nftType.value.saved) {
    $q.dialog({
      class: 'q-pa-md',
      focus: 'cancel',
      message: 'Are you sure you don\'t want to upload NFT metadata?',
      ok: { label: 'Yes, I\'m Sure', color: 'primary', flat: true },
      cancel: { label: 'No', color: 'negative', flat: true },
    }).onOk(() => {
      proceed = true
    })
  }

  if (!proceed) return

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

const handleStepperNav = (e: any) => {
  const label = e.target.innerText.toLowerCase()
  switch (label) {
    case 'continue':
      state.value.step = state.value.step + 1
      break
    case 'skip':
      state.value.step = state.value.step + 1
      break
    case 'back':
      state.value.step = state.value.step - 1
      break
  }
  if (state.value.step === 2 && !nftType.value.name && token.value.commitment) {
    if (ui.minterInView?.tokenCategory?.symbol) {
      nftType.value.name = `${ui.minterInView?.tokenCategory?.symbol} - ${formatCommitment(token.value.commitment!, options.value.commitmentFormat, 'decimal')}`
    } else {
      nftType.value.name = `NFT - ${formatCommitment(token.value.commitment!, options.value.commitmentFormat, 'decimal')}`
    }

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
  if (o === MINT_ONE_UNIQUE_NFT) {
    return options.value.quantity = 1
  }
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

watch(() => state.value.step, (step) => {
  if (step == 2) {
    options.value.addMetadata = true
    if (!nftType.value.name && ui.minterInView?.tokenCategory?.symbol) {
      nftType.value.name = ui.minterInView?.tokenCategory?.symbol + '-' + token.value.commitment
    }
  }
})

onMounted(async () => {
  ui.routeBack = true
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
    ok: 'Yes',
    cancel: 'No',
    focus: 'cancel'
  }).onOk(() => {
    ui.routeBack = false
    next()
    // router.back()
  }).onCancel(() => {
    next(false)
  })
})


</script>


<style lang="scss">
.q-stepper__title {
  font-size: medium;
}
</style>
