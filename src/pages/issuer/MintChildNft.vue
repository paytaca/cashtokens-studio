<template>
  <q-page>
    <div class="row justify-center q-gutter-md">
      <div class="col-xs-12 col-sm-10 col-lg-9  q-pa-lg">
        <div class="row q-gutter-md">
          <div class="col-xs-12">
            <q-avatar v-if="minter.value?.identitySnapshot?.uris?.icon" square size="5em">
              <q-img :src="minter.value.identitySnapshot.uris.icon"></q-img>
            </q-avatar>
          </div>
          <div class="col-xs-12">
            <div class="row">
              <div class="col-xs-5 col-sm-4 text-caption">Token ID</div>
              <div class="col-xs-7 col-sm-auto">
                {{ minter.value.identitySnapshot?.token?.category ?
                  shortenTokenId(minter.value.identitySnapshot?.token?.category) : '' }}
              </div>
            </div>
            <div v-if="minter.value?.identitySnapshot?.token?.symbol" class="row">
              <div class="col-xs-5 col-sm-4 text-caption">Symbol</div>
              <div class="col-xs-7 col-sm-auto text-caption text-primary" style="letter-spacing: 2px;"><strong>{{
                minter.value.identitySnapshot.token.symbol
                  }}</strong></div>
            </div>

            <div class="row">
              <div class="col-xs-5 col-sm-4">Nft Collection Type</div>
              <div class="col-xs-7 col-sm-auto text-caption">{{ minter.value?.nftCollectionType }}</div>
            </div>
            <div v-if="minter.value?.nftCollectionType == 'ParsableNftCollection'" class="row">
              <div class="col-xs-5 col-sm-4 text-caption">Parsing Bytecode</div>
              <div class="col-xs-7 col-sm-auto text-caption">{{ minter.value.identitySnapshot.token.nfts.parse.bytecode
              }}
              </div>
            </div>
            <div class="row">
              <div class="col-xs-5 col-sm-4 text-caption">Minter's Commitment</div>
              <div class="col-xs-7 col-sm-auto text-caption">
                {{
                  state.mintersCommitment?.length == 0 ? '--' : formatCommitment(state.mintersCommitment, 'vm-number',
                    'decimal').toString()
                }}
              </div>
            </div>
            <div v-if="state.newMintersCommitment" class="row">
              <div class="col-xs-5 col-sm-4">New Minter's Commitment</div>
              <div class="col-xs-7 col-sm-auto ">
                {{
                  state.newMintersCommitment
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <q-stepper v-model="state.step" active-color="warning" done-icon="done_all" done-color="primary" vertical
          animated flat class="bg-transparent">
          <q-step :name="1" :title="!state.mintTx ? 'Mint the token' : '🎉 NFT Minted!'" icon="token"
            :done="state.step > 1">
            <q-chip v-if="state.mintTx" square>
              <q-avatar color="success" text-color="positive" icon="done_all" size="lg"></q-avatar>
              🎉 NFT Minted! <q-btn :href="openTxInExplorer(state.mintTx)" target="_blank" flat dense color="secondary"
                label="View Tx" />
            </q-chip>
            <q-form ref="mintForm" class="q-gutter-md q-pa-lg" @submit.prevent="mint">
              <q-select
                :options="minter.value.nftCollectionType == 'SequentialNftCollection' ? sequentialOpts : parsableOpts"
                :model-value="state.options.mintOption"
                v-on:update:model-value="(v) => state.options.mintOption = v.value" :outlined="!state.mintTx"
                :disable="!!state.mintTx" :readonly="!!state.mintTx" class="q-mb-xs" label="I want to" stack-label
                bottom-slots>
                <template v-slot:hint>
                  <div class="ellipsis">{{ hints[state.options.mintOption] }}</div>
                </template>
              </q-select>
              <q-input v-if="state.options.mintOption != MINT_ONE_NFT" v-model="state.options.quantity"
                :style="`width:${$q.screen.lt.sm ? '' : 'fit-content'}`"
                :onchange="(v: any) => state.options.quantity = !v.target.value || v.target.value <= '0' ? 1 : Number(v.target.value)"
                :outlined="!state.mintTx" :disable="!!state.mintTx" :readonly="!!state.mintTx" clearable type="number"
                min="1" label="Number of tokens to mint">
              </q-input>
              <q-input v-model="state.token.commitment" :placeholder="tokenCommmitmentPlaceholderText"
                :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" :outlined="!state.mintTx"
                :disable="!!state.mintTx" :readonly="!!state.mintTx"
                :label="state.options.quantity > 1 && state.options.mintOption !== MINT_SUPPLY_FOR_A_COMMITMENT ? 'Commitment (first)' : 'Commitment'"
                :bottom-slot="!!state.token.commitment">
                <template v-slot:prepend>
                  <q-btn :label="state.options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm"
                    no-caps :icon-right="state.options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                </template>
                <template v-slot:append>
                  <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                    :class="$q.dark.isActive ? '' : 'text-black'"
                    :label="state.options.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
                    <q-tooltip>
                      {{
                        state.options.commitmentFormat === 'decimal' ? 'Click to value to hex'
                          : 'Click to convert value to a number'
                      }}
                    </q-tooltip>
                  </q-btn>
                </template>
                <template v-slot:hint>
                  <div v-if="state.token.commitment" class="row justify-end items-center">
                    <i>
                      <q-icon name="info">
                        <q-tooltip>The actual value on-chain.</q-tooltip>
                      </q-icon>
                      vm number =
                    </i>
                    <code>{{ rawNftCommitment }}</code>
                  </div>
                </template>
              </q-input>
              <q-input v-if="state.options.quantity > 1 && state.options.mintOption !== MINT_SUPPLY_FOR_A_COMMITMENT"
                :model-value="commitmentLast" :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']"
                :outlined="!state.mintTx" :disable="!!state.mintTx" :readonly="!!state.mintTx"
                label="Commitment (last)">
                <template v-slot:prepend>
                  <q-btn :label="state.options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm"
                    no-caps :icon-right="state.options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                </template>
                <template v-slot:append>
                  <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                    :class="$q.dark.isActive ? '' : 'text-black'"
                    :label="state.options.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
                    <q-tooltip>
                      {{
                        state.options.commitmentFormat === 'decimal' ? 'Click to value to hex'
                          : 'Click to convert value to a number'
                      }}
                    </q-tooltip>
                  </q-btn>
                </template>
                <template v-slot:hint>
                  <div v-if="state.token.commitment" class="row justify-end items-center">
                    <i>
                      <q-icon name="info">
                        <q-tooltip>The actual value on-chain.</q-tooltip>
                      </q-icon>
                      vm number =
                    </i>
                    <code>{{ rawNftCommitmentLast }}</code>
                  </div>
                </template>
              </q-input>
              <q-input :model-value="state.token.capability" :outlined="!state.mintTx" :disable="!!state.mintTx"
                :readonly="!!state.mintTx" label="Capability"></q-input>
              <q-input v-model="state.options.recipient" clearable :outlined="!state.mintTx" :disable="!!state.mintTx"
                :label="`Sen${state.mintTx ? 't' : 'd'} To (Defaults to your token address)`"
                :rules="[(v) => /^((bitcoincash:|bchtest:)?(z)[a-zA-Z0-9]{1,64})$/.test(v) || 'Enter a valid token addresss']">
                <template v-slot:append>
                  <q-btn v-if="!state.options.recipient" dense :flat="$q.dark.isActive ? true : false" label="Self"
                    color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                    @click="state.options.recipient = user.walletTokenAddress!" />
                </template>
              </q-input>
              <q-expansion-item label="Advanced">
                <div class="q-my-md">
                  <q-input v-model="state.newMintersCommitment" :placeholder="tokenCommmitmentPlaceholderText"
                    :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" :outlined="!state.mintTx"
                    label="Minter's new commitment after mint" :bottom-slot="!!state.token.commitment">
                    <template v-slot:prepend>
                      <q-btn :label="state.options.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense
                        size="sm" no-caps
                        :icon-right="state.options.commitmentFormat === 'decimal' ? 'pin' : undefined" />
                    </template>
                    <template v-slot:append>
                      <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                        :class="$q.dark.isActive ? '' : 'text-black'"
                        :label="state.options.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
                        <q-tooltip>
                          {{
                            state.options.commitmentFormat === 'decimal' ? 'Click to value to hex'
                              : 'Click to convert value to a number'
                          }}
                        </q-tooltip>
                      </q-btn>
                    </template>
                    <template v-slot:hint>
                      <div class="row justify-between items-center">
                        <span class="col text-justify">This allows us to track the last sequence number of
                          a Sequential Nft Collection.</span>
                        <span class="col-auto" v-if="state.newMintersCommitment">
                          <i>
                            <q-icon name="info">
                              <q-tooltip>The actual value on-chain.</q-tooltip>
                            </q-icon>
                            vm number =
                          </i>
                          <code>{{ formatCommitment(state.newMintersCommitment, state.options.commitmentFormat, 'vm-number') }}</code>
                        </span>

                      </div>

                    </template>
                  </q-input>
                </div>


              </q-expansion-item>
              <q-stepper-navigation class="text-right q-my-lg q-px-lg">
                <q-btn v-if="state.mintTx && state.options.mintOption == MINT_ONE_NFT" name="stepper-nav" flat
                  @click.stop="handleStepperNav" color="primary" label="Continue" class="q-ml-sm" size="lg" />
                <q-btn v-if="!state.mintTx" type="submit" color="primary" label="Mint NFT" class="q-ml-sm self-right"
                  size="lg" />
                <q-btn v-if="state.mintTx" @click.stop="mintAgain" color="primary" label="Mint Again"
                  class="q-ml-sm self-right" size="lg" />
              </q-stepper-navigation>

            </q-form>

          </q-step>
          <q-step :name="2" title="Provide NFT asset"
            :caption="state.options.mintOption == MINT_ONE_NFT ? 'Optional' : 'Unsupported'" icon="attach_file"
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
            <q-uploader ref="fileUploader" @uploaded="onFileUploaded" @added="onFileAdded"
              :factory="fileUploaderFactory" field-name="file" :label="'Upload'"
              :url="`/api/tokens/nft/asset-upload?tokenId=${state.token.tokenId}&commitment=${state.token.commitment}`"
              flat dense size="sm" style="width:100%;max-width: 100%; border: 2px dashed rgb(129 123 123 / 80%); "
              color="dark" class="q-my-md" multiple square bordered no-thumbnails auto-upload />
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
                <q-input v-for="attrKey, i in Object.keys(nftAttributes)" v-model="nftAttributes[attrKey]" outlined
                  dense :label="attrKey" :key="i">
                  <template v-slot:after>
                    <q-icon v-if="!nftType.saved" name="delete_forever"
                      @click.stop="() => delete nftAttributes[attrKey]" color="negative" class="cursor-pointer">
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <q-stepper-navigation class="text-right q-my-lg q-px-lg">
                <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" label="Back" class="q-ml-sm" size="lg" />
                <q-btn v-if="nftType.saved" name="stepper-nav" flat @click.stop="handleStepperNav" color="primary"
                  label="Continue" class="q-ml-sm" size="lg" :disable="!nftType.saved" />
                <q-btn name="stepper-nav" flat @click.stop="state.step = 4" color="primary" label="Skip" class="q-ml-sm"
                  size="lg" />
                <q-btn name="stepper-nav" @click.stop="saveNftType" color="primary" label="Save" class="q-ml-sm"
                  size="lg" :disable="!nftType.name" :icon-right="nftType.saved ? 'done_all' : undefined" />
              </q-stepper-navigation>
            </q-form>
          </q-step>
          <q-step :name="3" title="Token Registry"
            :caption="state.options.mintOption == MINT_ONE_NFT ? 'Optional' : 'Unsupported'" icon="data_object"
            done-icon="done_all" class="q-gutter-md">
            <q-chip v-if="state.publishTx" square>
              <q-avatar color="success" text-color="positive" icon="done_all" size="lg"></q-avatar>
              Registry Revision Pupblished! <q-btn :href="openTxInExplorer(state.publishTx)" target="_blank" flat dense
                color="secondary" label="View Tx" />
            </q-chip>
            <p style="text-align: justify;">
              You can check the currently published and the unpublished revision of the registry by downloading it
              here-below.
              The unpublished revision contains the new NFT types that you've saved. Clicking on `Publish Revision`
              will publish the revision on-chain.
            </p>
            <div class="row justify-center q-gutter-md">
              <q-btn color="primary" icon="download" @click.stop="downloadPublishedRegistry">Download Current
                Version</q-btn>
              <q-btn color="primary" icon="download" @click.stop="downloadRevisedRegistry">Download Revision </q-btn>
            </div>
            <q-stepper-navigation class="text-right q-my-lg q-px-lg">
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Back" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Skip" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" @click.stop="publishRegistry" color="primary" label="Publish Revision"
                class="q-ml-sm" size="lg" />
            </q-stepper-navigation>
          </q-step>
          <q-step v-if="state.options.mintOption == MINT_ONE_NFT" :name="4" title="Wrap up" icon="exit_to_app"
            done-icon="done_all">

            <q-stepper-navigation class="text-right q-my-lg q-px-lg">
              <q-btn name="stepper-nav" flat @click.stop="state.step = 3" color="primary" label="Back" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="router.back()" color="primary" label="Exit" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" color="primary" size="lg" @click.stop="mintAgain" label="Mint Again"
                class="q-ml-sm" />
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { NFTCapability, TestNetWallet, TokenI, Wallet, binToHex } from 'mainnet-js'
import { useQuasar } from 'quasar'
import { AuthKey, AuthchainIdentity, Bcmr, ChainGraph } from 'src/apps'
import { useUser } from 'src/stores/user'
import { BcmrStorageArtifact } from 'src/apps/types'
import { shortenTokenId, openTxInExplorer, formatCommitment, ipfsToGatewayUrl } from 'src/apps/utils'
import { useEventBus } from 'src/composables'
import { useUI } from 'src/stores/ui'
import { RegistryNftType } from 'src/apps'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { bigIntToVmNumber, sha1 } from '@bitauth/libauth'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { useLocalForage } from 'src/composables/useLocalForage'
import { usePage } from 'src/stores/page'
import { useMinter } from 'src/stores/minter'

const MINT_ONE_NFT = 'Mint 1 NFT'
const MINT_MULTIPLE_NFTS = 'Mint multiple NFTs'
const MINT_SUPPLY_FOR_A_COMMITMENT = 'Mint supply for a particular NFT commitment' // Shouldn't update minter
const CREATE_MUTABLE_NFT = 'Create a mutable NFT'
const CREATE_ANOTHER_MINTER = 'Create another minter for this category'

const supportAssetUpload = [
  MINT_ONE_NFT
]

const hints: any = {
  [MINT_ONE_NFT]: `Will mint 1 NFT. The minter's commitment will be updated if it's a Sequential NFT Collection.`,
  [MINT_MULTIPLE_NFTS]: `Will mint multiple sequential NFTs.`,
  [MINT_SUPPLY_FOR_A_COMMITMENT]: `Will mint one or more NFTs having the same commitment.`,
  [CREATE_MUTABLE_NFT]: `Will mint one or more mutable NFT(s) having no or the same commitment.`,
  [CREATE_ANOTHER_MINTER]: `Will mint one or more minting NFT(s) having no or the same commitment.`
}

const sequentialOpts = [
  { value: MINT_ONE_NFT, label: MINT_ONE_NFT },
  { value: MINT_MULTIPLE_NFTS, label: MINT_MULTIPLE_NFTS },
  { value: MINT_SUPPLY_FOR_A_COMMITMENT, label: MINT_SUPPLY_FOR_A_COMMITMENT },
  { value: CREATE_MUTABLE_NFT, label: CREATE_MUTABLE_NFT },
  { value: CREATE_ANOTHER_MINTER, label: CREATE_ANOTHER_MINTER }
]

const parsableOpts = [
  { value: MINT_ONE_NFT, label: MINT_ONE_NFT },
  { value: MINT_SUPPLY_FOR_A_COMMITMENT, label: MINT_SUPPLY_FOR_A_COMMITMENT },
  { value: CREATE_MUTABLE_NFT, label: CREATE_MUTABLE_NFT },
  { value: CREATE_ANOTHER_MINTER, label: CREATE_ANOTHER_MINTER }
]

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const page = usePage()
const ui = useUI()
const minter = useMinter()
const route = useRoute()
const router = useRouter()
const mintForm = ref()
const fileUploader = ref()

const localForage = useLocalForage()
const chainGraph = ref<ChainGraph>(new ChainGraph())

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

const authchainIdentity = ref<AuthchainIdentity>()

const commitmentLast = computed(() => {
  if (!state.value.token.commitment) return ''
  const v = BigInt(formatCommitment(state.value.token.commitment, state.value.options.commitmentFormat, 'decimal')) + BigInt(state.value.options.quantity) - BigInt(1)
  return formatCommitment(v.toString(), 'decimal', state.value.options.commitmentFormat).toString()
})


const state = ref<{
  step: number,
  mintTx: string,
  publishTx: string,
  mintersCommitment: string,
  newMintersCommitment: string,
  splitterModel: any,
  tab: any,
  token: TokenI,
  options: {
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
    includeRevisionHistory: boolean, // download revision option
    advanced: {
      includeAdvancedMintOptions: boolean
    }
  }
}>({
  step: 1,
  mintTx: '',
  publishTx: '',
  mintersCommitment: '',
  newMintersCommitment: '',
  splitterModel: '',
  tab: '',
  token: {
    amount: BigInt(0),
    tokenId: minter.value.token.tokenId,
    capability: NFTCapability.none,
    commitment: ''
  },
  options: {
    recipient: '',
    commitmentFormat: 'decimal',
    excludeFromSequentialNftCollection: false,
    addMetadata: false,
    deferRegistryPublication: true,
    nftAssetDataURL: '',
    nftAssetFileType: 'image/png',
    NftAssetUploadUris: null,
    quantity: 1,
    mintOption: MINT_ONE_NFT,
    commitmentLast: '',
    publishOption: 'later',
    useAssetImageAsIcon: false,
    includeRevisionHistory: false,
    advanced: {
      includeAdvancedMintOptions: false
    }
  }
})


const tokenCommmitmentPlaceholderText = computed<string>(() => {
  if (minter.value.nftCollectionType === 'SequentialNftCollection') {
    return 'Enter a number'
  }
  return 'Enter commitment'
})

/**
 * VM Number, actual commitment on chain. 
 */
const rawNftCommitment = computed<string | undefined>(() => {
  if (minter.value.nftCollectionType === 'ParsableNftCollection') {
    return state.value.token.commitment
  }
  return formatCommitment(state.value.token.commitment || '', state.value.options.commitmentFormat, 'vm-number').toString()
})

/**
 * VM Number, actual commitment on chain, this if for  
 */
const rawNftCommitmentLast = computed<string>((): string => {
  if (minter.value.nftCollectionType === 'ParsableNftCollection') {
    return commitmentLast.value
  }
  return formatCommitment(commitmentLast.value || '', state.value.options.commitmentFormat, 'vm-number').toString()
})

const openAttributeDialog = () => {
  $q.dialog({
    component: NftAttributeDialog,
  }).onOk((attribute) => {
    nftAttributes.value = { ...nftAttributes.value, [attribute.name]: attribute.value }
  })
}


const convertCommitment = () => {
  if (state.value.token.commitment && state.value.options.commitmentFormat === 'decimal') {
    state.value.options.commitmentFormat = 'hex'
    state.value.token.commitment = formatCommitment(state.value.token.commitment || '', 'decimal', 'hex')
  } else if (state.value.token.commitment && state.value.options.commitmentFormat === 'hex') {
    state.value.token.commitment = formatCommitment(state.value.token.commitment || '', 'hex', 'decimal')
    state.value.options.commitmentFormat = 'decimal'
  }
}

const initCommitment = () => {
  if (minter.value?.token?.commitment && minter.value.nftCollectionType === 'SequentialNftCollection') {
    state.value.options.commitmentFormat = 'decimal'
    // state.value.mintersCommitment = formatCommitment(minter.value?.token?.commitment, 'vm-number', 'decimal').toString()
    state.value.mintersCommitment = minter.value.token.commitment
    const mintersCommitment = formatCommitment(state.value.mintersCommitment, 'vm-number', 'decimal').toString()
    state.value.token.commitment = (BigInt(mintersCommitment) + BigInt(1)).toString()
  } else {
    state.value.token.commitment = '1'
    state.value.options.commitmentFormat = 'decimal'
  }
}

const fileUploaderFactory = (files: any): Promise<any> => {
  return new Promise((resolve) => {
    const fileReader = new FileReader()
    fileReader.onload = function () {
      const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      const h = binToHex(sha1.hash(uint8Array))
      resolve({
        url: `/api/tokens/nft/asset-upload?tokenId=${state.value.token.tokenId}&commitment=${state.value.token.commitment}&h=${h}`
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
            if (f.name.startsWith('icon')) {
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
      fileUploader.value.upload()
    } catch (error) {
      fileUploader.value.removeFile(f)
    }
  }

}

const fetchPublishedRegistry = async () => {
  const pubInfo = await chainGraph.value.retrieveLastRegistryPublication(state.value.token.tokenId)
  const d = $q.dialog({
    class: 'col-auto',
    message: 'Fetching registry from published URL, please wait...',
    progress: true,
    ok: false
  })

  let url
  let registry
  const downloadUrls = [pubInfo[0].httpsUrl, ...pubInfo[0].uris]
  for (const uri of downloadUrls) {
    try {
      url = new URL(uri)
    } catch (error) {
      try {
        if (uri && uri.includes('.')) {
          url = new URL('https://' + uri)
        } else {
          url = ipfsToGatewayUrl('ipfs://' + uri)
        }
      } catch (error) {
        console.log(error)
        continue
      }
    }
    if (!url) continue
    try {
      d.update({
        message: `Downloading...${url}`
      })
      const resp = await fetch(url)
      if (resp.status === 200) {
        registry = await resp.json()
        if (registry) break
      } else {
        d.update({
          message: 'Checking other URLs'
        })
        continue
      }
      d.hide()
      break
    } catch (error) {

    }
  }
  d.hide()
  return registry
}

const createRegistryRevision = async () => {
  const registry = await fetchPublishedRegistry()
  const bcmr = new Bcmr(registry)
  const keys = (await localForage.nftTypesStore.keys()).filter((key) => key.startsWith(state.value.token.tokenId))
  for (const k of keys) {
    let item = await localForage.nftTypesStore.getItem(k)
    if (typeof (item) == 'string') {
      item = JSON.parse(await localForage.nftTypesStore.getItem(k) as string)
    }
    const commitmentNftType: any = item
    const commitment = Object.keys(commitmentNftType)[0]
    const nftType = commitmentNftType[commitment]
    bcmr.addNft(commitment, nftType)
    bcmr.setLatestRevision(new Date().toISOString())
  }
  return bcmr
}

const downloadRegistryFile = (registry: any) => {
  const blob = new Blob([registry], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bitcoin-cash-metadata-registry.json'; // Specify the desired file name with the appropriate extension
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

const downloadPublishedRegistry = async () => {
  const registry = await fetchPublishedRegistry()
  if (registry) {
    downloadRegistryFile(JSON.stringify(registry))
  }
}

const downloadRevisedRegistry = async () => {
  const bcmr = await createRegistryRevision()
  downloadRegistryFile(bcmr.getContent())
}

watch(() => state.value, (v) => {
  page.$patch({
    path: route.path,
    state: v as any
  })
}, { deep: true })

// if the commitment change
// update the minter's commitment if it's a sequential NFT only
// if the lastCommitment has value, use it
// if not use the first commitment

watch(() => commitmentLast.value, (v) => {
  if (minter.value.nftCollectionType == 'SequentialNftCollection') {
    nextTick(() => {
      if ([MINT_ONE_NFT, MINT_MULTIPLE_NFTS].includes(state.value.options.mintOption)) {
        state.value.newMintersCommitment = commitmentLast.value
      } else {
        state.value.newMintersCommitment = formatCommitment(minter.value.token.commitment, 'vm-number', state.value.options.commitmentFormat)
      }
    })
  }
})

watch(() => state.value.options.mintOption, (v) => {
  if (minter.value.nftCollectionType == 'SequentialNftCollection') {
    nextTick(() => {
      if ([MINT_ONE_NFT, MINT_MULTIPLE_NFTS].includes(v)) {
        state.value.newMintersCommitment = commitmentLast.value
      } else {
        state.value.newMintersCommitment = formatCommitment(minter.value.token.commitment, 'vm-number', state.value.options.commitmentFormat)
      }
    })
  }
})


watch(() => minter.value?.processing, (v, oldV) => {
  ui.setStatusMessage({
    statusMessage: v,
    statusMessageSpinner: true
  })
})

watch(() => chainGraph.value?.processing, (v, oldV) => {
  ui.setStatusMessage({
    statusMessage: v || '',
    statusMessageSpinner: true
  })
})

watch(() => authchainIdentity.value?.processing, (v) => {
  ui.setStatusMessage({
    statusMessage: v || '',
    statusMessageSpinner: true,
    statusMessageType: 'info'
  })
})

const mint = async () => {

  if (state.value.mintTx) {
    await minter.value?.updateUtxo()
    await minter.value?.updateAuthKeyUtxo()
    // return state.value.mintTx = ''
  }

  const tokens: any = []
  if (state.value.options.quantity == 1) {
    const t = Object.assign({}, state.value.token)
    t.commitment = rawNftCommitment.value
    tokens.push(t)
  }

  if (state.value.options.quantity > 1) {
    if (state.value.options.mintOption === MINT_MULTIPLE_NFTS) {
      let firstCommitment = formatCommitment(state.value.token.commitment as string, state.value.options.commitmentFormat, 'decimal')
      for (let i = 0; i < state.value.options.quantity; i++) {
        tokens.push({
          amount: BigInt(0),
          tokenId: minter.value?.token?.tokenId,
          commitment: binToHex(bigIntToVmNumber(BigInt(firstCommitment) + BigInt(i))), // Use sequential commitment 
          capability: state.value.token.capability,
        })
      }
    }

    if (state.value.options.mintOption === MINT_SUPPLY_FOR_A_COMMITMENT) {
      for (let i = 0; i < state.value.options.quantity; i++) {
        tokens.push({
          amount: BigInt(0),
          tokenId: minter.value?.token?.tokenId,
          commitment: rawNftCommitment.value, // Use same commitment on all tokens
          capability: state.value.token.capability,
        })
      }
    }
  }

  if (minter.value) {

    try {
      const lastToken = tokens[tokens.length - 1]
      let newMinterCommitment = minter.value.token?.commitment
      if (lastToken.capability == NFTCapability.none && state.value.options.mintOption !== MINT_SUPPLY_FOR_A_COMMITMENT) {
        // only track commitment in minter if the child's capability is `none`
        // so we can preserve the sequence
        newMinterCommitment = lastToken.commitment
      }


      const tx = await minter.value.mintChildrenExt({
        tokens: tokens as [TokenI],
        recipient: state.value.options.recipient,
        newMinterCommitment: newMinterCommitment
      })

      if (tx) {
        state.value.mintTx = tx
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.mintChild',
          timestamp: new Date().getTime(),
          successMsg: `Minted new ${minter.value?.identitySnapshot?.token?.symbol || shortenTokenId(minter.value.token!.tokenId)} NFT`
        })
        ui.setStatusMessage({
          statusMessage: `Minted new ${minter.value?.identitySnapshot?.token?.symbol || shortenTokenId(minter.value.token!.tokenId)} NFT`,
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
    const alreadySaved = await localForage.nftTypesStore.getItem(`${state.value.token.tokenId}-${rawNftCommitment.value}`)

    if (alreadySaved) {
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
    } else {
      proceed = true
    }



    if (!proceed) return

    nftType.value.extensions = {
      ...nftType.value.extensions,
      attributes: nftAttributes.value
    }
    await localForage.nftTypesStore.setItem(`${state.value.token.tokenId}-${rawNftCommitment.value}`, { [rawNftCommitment.value as string]: JSON.parse(JSON.stringify(nftType.value.value)) })
    const item = await localForage.nftTypesStore.getItem(`${state.value.token.tokenId}-${rawNftCommitment.value}`)
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

const clearSavedNfts = async () => {
  const keys = (await localForage.nftTypesStore.keys()).filter((key) => key.startsWith(state.value.token.tokenId))
  for (const k of keys) {
    try {
      await localForage.nftTypesStore.removeItem(k)
    } catch (error) {
      console.log(error)
    }
  }
}

const publishRegistry = async () => {

  if (minter.value?.utxoSpent) {
    await minter.value.updateUtxo()
    await minter.value.updateAuthKeyUtxo()
  }

  let d = $q.dialog({
    class: 'q-pa-md',
    dark: true,
    message: 'Authenticating, minter\'s utxo from the authchain',
    ok: false,
    cancel: false,
    progress: true,
  })

  const authhead = await (new ChainGraph()).fetchAuthheadTxid(minter.value!.token!.tokenId!)
  let proceed = false
  if (authhead != minter.value?.txid) {
    d.update({
      dark: true,
      message: 'Unauthorized, invalid auth identity. ',
      persistent: true,
      ok: true,
      focus: 'ok',
      progress: false
    }).onDismiss(() => {
      proceed = false
    })
  } else {
    proceed = true
  }

  if (!proceed) return


  d.update({ message: 'Authentication ok, creating a draft of the new registry. Please wait...' })

  try {
    const prevPublication = await (new ChainGraph()).retrieveLastRegistryPublication(minter.value!.token!.tokenId!)

    d.update({ message: 'Adding NFTs to new registry' })
    const bcmr = await createRegistryRevision()
    d.update({ message: 'Storing registry in IPFS' })
    const storageArtifact: BcmrStorageArtifact | undefined = await bcmr.storeRegistry()
    d.hide()

    if (storageArtifact) {
      authchainIdentity.value = new AuthchainIdentity(
        {
          ...minter.value!.utxo,
          authKey: minter.value?.authKey as AuthKey,
          ownerWallet: minter.value?.ownerWallet as TestNetWallet | Wallet
        },
      )
      authchainIdentity.value.transactionSigner = user.transactionSigner

      const tx = await authchainIdentity.value.publish({ url: storageArtifact.uris.https, contentHash: storageArtifact.contentHash })

      if (tx) {
        clearSavedNfts()
        state.value.publishTx = tx
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'AuthchainIdentity.publish',
          timestamp: new Date().getTime(),
          successMsg: `Published ${minter.value?.identitySnapshot?.token?.symbol || shortenTokenId(state.value.token.tokenId)}'s registry`
        })
        d = $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            txid: tx,
            statusType: 'success',
            statusText: 'Registry Published'
          },
          persistent: true,
          progress: false,
          ok: true,
        }).onDismiss(() => {
          state.value.step = 4
          nextTick(() => {
            minter.value!.utxoSpent = true
          })
          d.hide()
        })
      }
    }
  } catch (error: any) {
    d.update({
      message: error?.message || error,
      persistent: true,
      ok: true,
    })
  } finally {
    d.hide()
  }
}

const mintAgain = async () => {
  let proceed = false
  if (supportAssetUpload.includes(state.value.options.mintOption) && !nftType.value.saved) {
    proceed = await new Promise((res, rej) => {
      $q.dialog({
        class: 'q-pa-md',
        focus: 'cancel',
        message: 'Are you sure you don\'t want to add the metadata for this minted NFT?',
        ok: { label: 'Yes, I\'m Sure', 'text-color': 'primary', flat: true },
        cancel: { label: 'No', 'text-color': 'negative', flat: true },
      }).onOk(() => {
        res(true)
      }).onCancel(() => {
        res(false)
      })
    })
  } else {
    proceed = true
  }

  if (!proceed) return

  try {
    await minter.value?.updateUtxo()
    await minter.value?.updateAuthKeyUtxo()
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
  if (state.value.step === 2 && !nftType.value.name && state.value.token.commitment) {
    if (minter.value?.identitySnapshot?.token?.symbol) {
      nftType.value.name = `${minter.value?.identitySnapshot?.token?.symbol} - ${formatCommitment(state.value.token.commitment!, state.value.options.commitmentFormat, 'decimal')}`
    } else {
      nftType.value.name = `NFT - ${formatCommitment(state.value.token.commitment!, state.value.options.commitmentFormat, 'decimal')}`
    }

  }
}

watch(() => state.value.token?.commitment, (commitment) => {
  if (!commitment) {
    return state.value.options.commitmentFormat = 'decimal' //
  }
  if (/^(?!^\d+$)[0-9A-Fa-f]+$/.test(commitment)) {
    state.value.options.commitmentFormat = 'hex'
  }
})

watch(() => state.value.token?.capability, (c) => {
  if (c === NFTCapability.minting || c === NFTCapability.mutable) {
    state.value.options.excludeFromSequentialNftCollection = true
  } else {
    state.value.options.excludeFromSequentialNftCollection = false
  }
})

watch(() => state.value.options.mintOption, (o) => {
  state.value.token.capability = NFTCapability.none
  if (o === MINT_ONE_NFT || o === MINT_MULTIPLE_NFTS) {
    if (!state.value.token.commitment) {
      initCommitment()
    }
    return state.value.options.quantity = 1
  }
  if (o === CREATE_MUTABLE_NFT) {
    state.value.options.quantity = 1
    return state.value.token.capability = NFTCapability.mutable
  }
  if (o === CREATE_ANOTHER_MINTER) {
    state.value.options.quantity = 1
    return state.value.token.capability = NFTCapability.minting
  }
  if (o === MINT_SUPPLY_FOR_A_COMMITMENT) {
    return state.value.token.commitment = ''
  }

})

watch(() => state.value.options.excludeFromSequentialNftCollection, (exclude) => {
  if (exclude) {
    state.value.token.commitment = ''
  } else {
    // initCommitment()
  }
})

watch(() => state.value.step, (step) => {
  if (step == 2) {
    state.value.options.addMetadata = true
    if (!nftType.value.name && minter.value?.identitySnapshot?.token?.symbol) {
      nftType.value.name = minter.value?.identitySnapshot?.token?.symbol + '-' + state.value.token.commitment
    }
  }
})


onMounted(async () => {

  window.localForage = localForage.nftTypesStore

  nextTick(() => {
    ui.routeBack = `nft-reserves`
  })
  state.value.token.tokenId = minter.value!.token!.tokenId


  initCommitment()
  state.value.options.recipient = user.walletTokenAddress
  state.value.token.tokenId = route.query!.tokenId! as string
  window.onbeforeunload = (e) => {
    return true
  }

  //check for Navigation Timing API support
  // if (window.performance) {
  //   console.info("window.performance works fine on this browser");
  // }
  // console.info(performance.navigation.type);
  // if (performance.navigation.type == performance.navigation.TYPE_RELOAD) {
  //   console.info("This page is reloaded");
  // } else {
  //   console.info("This page is not reloaded");
  // }

  // const collectionType = await new BcmrIndexer().getNftCollectionType(route.query!.tokenId! as string)
})

onBeforeRouteLeave(async (to, from, next) => {
  next(true)
  // const yes: boolean = await new Promise((res, rej) => {
  //   $q.dialog({
  //     dark: true,
  //     message: 'Are you sure you want to leave the page?',
  //     persistent: true,
  //     ok: 'Yes',
  //     cancel: 'No',
  //     focus: 'cancel'
  //   }).onOk(() => {
  //     // localForage.pageStore.removeItem(page.path)
  //     ui.routeBack = false
  //     res(true)
  //   }).onCancel(async () => {
  //     // page.state = await localForage.pageStore.getItem(route.path)
  //     // page.path = route.path
  //     // page.state = state.value
  //     res(false)
  //   })
  // })
  // next(yes)
})

</script>


<style lang="scss">
.q-stepper__title {
  font-size: medium;
}
</style>
