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
          <q-step :name="1" title="Mint the token" icon="token" :done="state.step > 1">
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
              <div class="row justify-end">
                <q-btn type="submit" color="primary" :label="!state.mintTx ? 'Mint' : 'Mint Again'"
                  class="q-ml-sm self-right" size="lg" />
              </div>

            </q-form>
            <q-stepper-navigation class="text-right q-my-lg q-px-lg">
              <q-btn v-if="state.mintTx && options.mintOption != MINT_ONE_UNIQUE_NFT" name="stepper-nav" flat
                @click.stop="handleStepperNav" color="primary" label="Continue" class="q-ml-sm" size="lg" />
              <!-- <q-btn name="stepper-nav" @click.stop="handleStepperNav" color="primary" label="Mint" class="q-ml-sm"
                size="lg" /> -->
            </q-stepper-navigation>
          </q-step>
          <q-step :name="2" title="Provide NFT asset"
            :caption="options.mintOption == MINT_ONE_UNIQUE_NFT ? 'Optional' : 'Unsupported'" icon="attach_file"
            done-icon="done_all" class="q-gutter-md">
            <q-chip v-if="nftType.saved" square>
              <q-avatar color="success" text-color="positive" icon="done_all" size="lg"></q-avatar>
              Saved
            </q-chip>
            <q-form v-if="options.loadAssetFrom == 'file'"
              :action="`/api/tokens/nft/asset-upload?tokenId=${token.tokenId}&commitment=${token.commitment}`"
              class="dropzone" id="nft-assets-dropzone"
              style="overflow-y: scroll;width: 100%;max-height: 40em; min-height: 10em;">
            </q-form>
            <q-form id="nft-type-form" @submit.prevent="saveNftType" class="q-gutter-md q-mt-md">
              <q-input v-model="nftType.name" label="Name" outlined clearable></q-input>
              <q-input v-model="nftType.description" label="Description" outlined clearable></q-input>
              <q-input v-model="nftType.uris!.icon" label="Icon URI" outlined clearable></q-input>
              <q-input v-model="nftType.uris!.asset" label="NFT Asset URI" outlined clearable></q-input>
              <div class="text-h6 q-mt-md">Attributes<q-btn flat color="primary" icon="add" size="md"
                  @click="addNftAttribute" type="button" /></div>
              <div class="row">
                <q-input v-for="attrKey, i in Object.keys(nftAttributes)" v-model="nftAttributes[attrKey]" outlined dense
                  clearable :label="attrKey" :key="i">
                  <template v-slot:after>
                    <q-icon v-if="!nftType.saved" name="remove" @click.stop="() => delete nftAttributes[attrKey]"
                      color="negative"></q-icon>
                  </template>
                </q-input>
              </div>
            </q-form>
            <q-stepper-navigation class="text-right q-my-lg q-px-lg">
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Back" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Skip" class="q-ml-sm"
                size="lg" />
              <q-btn name="stepper-nav" flat @click.stop="handleStepperNav" color="primary" label="Continue"
                class="q-ml-sm" size="lg" />
            </q-stepper-navigation>

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
import { ref, computed, watch, onMounted, nextTick, onBeforeMount, onBeforeUnmount } from 'vue';
import { NFTCapability, NftType, TokenI, binToHex } from 'mainnet-js';
import { Dialog, DialogChainObject, useQuasar } from 'quasar';
import Dropzone from 'dropzone'
import { ADDRESS_WATCHER_TRIGGERED, ChainGraph } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import { NftCollectionType } from 'src/app/types';
import { shortenTokenId, shortenTx, shortenAddress, openTxInExplorer, formatCommitment, copyText } from 'src/app/utils';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { RegistryNftType } from 'src/app';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { bigIntToVmNumber, sha1 } from '@bitauth/libauth';
import { Console } from 'console';
import NFTMintingContractDeployerDialog from 'src/components/dialogs/NFTMintingContractDeployerDialog.vue';


// tx of successful mint
// const state.mintTx = ref<string>()
const MINT_ONE_UNIQUE_NFT = 'Mint 1 unique NFT'
const MINT_ONE_NON_UNIQUE_NFT = 'Mint 1 nonunique NFT'
const MINT_MULTIPLE_UNIQUE_NFTS = 'Mint multiple unique NFTs'
const MINT_SUPPLY_FOR_A_COMMITMENT = 'Mint supply for a particular NFT commitment' // Shouldn't update minter
const CREATE_MUTABLE_NFT = 'Create a mutable NFT'
const CREATE_ANOTHER_MINTER = 'Create another minter for this category'


const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const route = useRoute()
const router = useRouter()
const dropzone = ref<Dropzone>()
const mintForm = ref()
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


const state = ref<{
  step: number,
  mintTx: string,
  mintersCommitment: string,
}>({
  step: 1,
  // mintTx: '760923415a8138082deb731e680cc066316a6a4d066bd808eb338d1852512b7c',
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

watch(() => state.value.step, (step) => {
  if (step == 2) {
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

.q-stepper__title {
  font-size: medium;
}
</style>
