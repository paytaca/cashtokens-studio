<template>
  <q-page class="q-pa-sm" style="min-height: 100vh">
    <div class="row justify-between items-end q-mb-sm q-mx-lg">
      <span class="col-6 text-h5"><q-icon name="token" /> Create Token</span>
      <div v-if="registry" class="col-6 row justify-end items-center q-gutter-sm">
        <div class="text-weight-thin">{BCMR}</div>
        <q-btn type="a" :href="`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(registry))}`"
          download="bitcoin-cash-metadata-registy.json" icon="download" size="xs" round></q-btn>
        <q-btn icon="edit" size="xs" round @click="genesisOptions.currentView = 'bcmr-editor'"></q-btn>
        <q-btn icon="delete" size="xs" color="red" round
          @click="() => { registry = null; genesisOptions.publishIdentityOutput = false; genesisOptions.currentView = 'create-token' }"></q-btn>
      </div>
    </div>
    <q-separator :dark="$q.dark.isActive" class="q-mx-lg q-mb-lg" />

    <q-form v-if="genesisOptions.currentView === 'create-token'" class="q-gutter-md q-mx-lg q-pa-sm">
      <i class="row text-h6 q-mb-sm">Token Details</i>
      <q-input class="row" :filled="true" dark:color="lime" v-model="creator" label="Creator's address"
        aria-disabled="true" disable dense square />
      <div class="row">
        <q-select class="col q-mb-sm" :filled="true" bottom-slots v-model="token.tokenId" :options="token.idOptions"
          label="Token tokenId" :disable="!token.idOptions || token.idOptions.length === 0" dense square>
          <template v-slot:hint>
            <i>{{ tokenIdInputHint }}</i>
          </template>
          <q-inner-loading :showing="isPopulatingTokenIdOptions">
            <q-spinner-facebook size="sm" color="primary" />
          </q-inner-loading>
        </q-select>
      </div>
      <q-input v-if="token.tokenType === 'fungible' || token.tokenType === 'hybrid'" class="row" :filled="true"
        dark:color="lime" v-model="token.amount" min="1" max="9223372036854700000" label="Genesis Supply"
        aria-disabled="true" dense square>
        <template v-slot:prepend>
          <q-icon name="pin"></q-icon>
        </template>
      </q-input>
      <q-select v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="q-mb-sm" :filled="true"
        bottom-slots v-model="token.capability" :options="['minting', 'mutable', 'none']" label="Capability" dense square>
        <q-inner-loading :showing="isPopulatingTokenIdOptions">
          <q-spinner-facebook size="sm" color="primary" />
        </q-inner-loading>
      </q-select>
      <q-input v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="row q-mb-sm" :filled="true"
        dark:color="lime" v-model="token.commitment" type="text" label="Commitment" dense square>
      </q-input>
      <div v-if="token.tokenId" class="row">
        <q-checkbox :filled="true" dark:color="lime" v-model="genesisOptions.publishIdentityOutput"
          label="Publish Registry">
        </q-checkbox>
        <div v-if="registry" class="row justify-end items-center q-gutter-sm">
          <div class="text-weight-thin">{BCMR}</div>
          <q-btn type="a" :href="`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(registry))}`"
            download="bitcoin-cash-metadata-registy.json" icon="download" size="xs" round></q-btn>
          <q-btn icon="edit" size="xs" round @click="genesisOptions.currentView = 'bcmr-editor'"></q-btn>
          <q-btn icon="delete" size="xs" color="red" round
            @click="() => { registry = null; genesisOptions.publishIdentityOutput = false; genesisOptions.currentView = 'create-token' }"></q-btn>
        </div>
      </div>
      <div v-if="genesisOptions.publishIdentityOutput" class="row">
        <q-input :filled="true" v-model="registryUrl" type="url" :rules="[v => v.length > 7 || 'Invalid URL']"
          label="Registry URL" class="col-12" dense square></q-input>
        <div class="col-12 justify-end q-gutter-sm q-py-sm">
          <q-btn color="primary" size="xs" @click="fetchRegistry">
            Fetch Registry
            <q-tooltip>Fetch an existing registry from the above URL</q-tooltip>
          </q-btn>
          <q-btn color="primary" size="xs" @click="displayRegistryCreateWizard">
            Create New Registry
            <q-tooltip>Create a new registry and use the above URL as </q-tooltip>
          </q-btn>
        </div>
      </div>
      <div class="row justify-end">
        <q-btn color="secondary" size="large" @click="submitTokenGenesisTransaction" :disable="!token.tokenId">Create
          Token</q-btn>
      </div>
    </q-form>
    <!-- Bcmr Create Form Wizard -->
    <div v-if="genesisOptions.currentView === 'bcmr-wizard'" class="q-mx-lg q-pa-sm">
      <i class="row text-h6 q-mb-sm">
        Create BCMR
      </i>
      <BcmrBasicFormWizard type="fungible" :token-id-options="token.idOptions" :bcmr="registry" :authbase="token.tokenId"
        @finish="(r) => { genesisOptions.currentView = 'create-token'; registry = r }"
        @cancel="() => genesisOptions.currentView = 'create-token'" />
    </div>

    <!-- Fetch Or Create Dialog -->
    <!-- <q-dialog :model-value="genesisOptions.displayFetchOrCreateDialog" full-width>
      <q-card class="q-pa-xs">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span class="text-weight-bold">Fetch Registry</span> or Create?</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-input :filled="true" v-model="registryUrl" label="Registry URL"></q-input>
        <div class="row justify-end q-ma-sm q-gutter-sm">
          <q-btn color="primary" size="md" @click="fetchRegistry">Fetch</q-btn>
          <q-btn color="primary" size="md" @click="displayRegistryCreateWizard">Create New</q-btn>
        </div>
      </q-card>
    </q-dialog> -->
    <!-- Bcmr editor -->
    <div v-if="genesisOptions.currentView === 'bcmr-editor'" class="q-mx-lg q-pa-sm">
      <div class="row justify-between">
        <i class="text-h6 q-mb-sm">Review BCMR</i>
        <q-btn icon="close" flat rounded size="sm" @click="genesisOptions.currentView = 'create-token'"></q-btn>
      </div>

      <JsonEditor v-model="registry" :darkTheme="$q.dark.isActive" />
    </div>
  </q-page>
</template>
<style scoped></style>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import JsonEditor from 'vue3-ts-jsoneditor'
import { sha256, utf8ToBin, decodeTransaction } from '@bitauth/libauth'
import { hexToBin, BCMR, OpReturnData, SendRequest, TokenSendRequest, UnitEnum, UtxoI } from 'mainnet-js'

import AuthChainGuard from 'src/classes/AuthChainGuard'
import getWalletClass from 'src/utils/getWalletClass'
import { Registry as BcmrRegistry } from 'src/interfaces'
import useStore from 'src/composables/useStore'
import BcmrBasicFormWizard from 'src/components/BcmrBasicFormWizard.vue'
import { TokenType } from 'src/types'

defineOptions({ name: 'TokenCreate' })

const route = useRoute()
const { user, ui } = useStore()

const creator = computed(() => user.connectedPaytacaAddress)

const token = ref<{
  tokenType: TokenType,
  tokenId: string,
  idOptions?: string[],
  amount: number | string,
  capability: undefined | 'none' | 'mutable' | 'minting',
  commitment: undefined | string
}>({
  tokenType: 'fungible',
  tokenId: '',
  idOptions: [],
  amount: '9223372036854700000',
  capability: undefined,
  commitment: undefined
})

const genesisOptions = ref<{
  publishIdentityOutput: boolean,
  currentView: 'create-token' | 'bcmr-wizard' | 'bcmr-editor',
  displayRegistryCreateWizard: boolean,
  displayFetchOrCreateDialog: boolean,
  displayBcmrEditor: boolean
}>({
  currentView: 'create-token',
  publishIdentityOutput: false,
  displayRegistryCreateWizard: false,
  displayFetchOrCreateDialog: false,
  displayBcmrEditor: false
})

const registry = ref<BcmrRegistry | null>(null)
const registryUrl = ref<string>('https://example.com/.well-known/bitcoin-cash-metadata-registry.json')
const registryObtainedFrom = ref<'fetch' | 'create' | null>(null)
const isPopulatingTokenIdOptions = ref<boolean>(false)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const tokenIdInputHint = computed(() => token.value.idOptions!.length > 0 ? 'Select token id from suitable UTXOs' : 'No suitable UTXO, please consolidate your UTXOs and try again.')

watch(() => genesisOptions.value.publishIdentityOutput, (yes) => {
  if (yes && !registryObtainedFrom.value) {
    genesisOptions.value.displayFetchOrCreateDialog = true
  } else {
    registryObtainedFrom.value = null
    genesisOptions.value.displayFetchOrCreateDialog = false
  }
})

watch(() => route.params.tokenType, (tokenType) => {
  token.value.tokenType = tokenType as TokenType
})

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address) {
    const creatorWallet = await getWalletClass().watchOnly(address)
    const txIds = (await creatorWallet.getAddressUtxos())?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0)
    token.value.idOptions = txIds?.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
  }
})

onMounted(async () => {
  token.value.tokenType = route.params?.tokenType as TokenType
  if (creator.value) {
    const creatorWallet = await getWalletClass().watchOnly(creator.value)
    const txIds = (await creatorWallet.getAddressUtxos())?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0)
    if (txIds.length > 0) {
      token.value.idOptions = txIds?.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
    }
  }
})

// methods
const fetchRegistry = async () => {
  try {
    ui.busy({ text: `Fetching registry from ${registryUrl.value}`, type: 'info' })
    const r = await fetch(registryUrl.value)
    registry.value = await r.json()
    registryObtainedFrom.value = 'fetch'
    genesisOptions.value.displayFetchOrCreateDialog = false
    // TODO:Check if this token.tokenId's identity is in the registry
    ui.idle()
    ui.setMessage({ text: 'Registry download success', type: 'success', timeout: 5 })
  } catch (error) {
    ui.setMessage({ text: 'Failed to fetch registry, make sure the URI is correct', type: 'error', timeout: 5 })
    console.log(error)
  }
}

const displayRegistryCreateWizard = async () => {
  genesisOptions.value.displayFetchOrCreateDialog = false
  genesisOptions.value.currentView = 'bcmr-wizard'
}

const submitTokenGenesisTransaction = async () => {
  ui.busy({ text: 'Creating FT', type: 'info' })

  if (creator.value) {
    const wallet = await getWalletClass().watchOnly(creator.value)
    const authbaseAndTokenGenesisInput = (await wallet.getAddressUtxos()).filter((val: UtxoI) => !val.token && val.vout === 0 && val.txid === token.value.tokenId)[0]

    let txSigningResult
    try {
      /* Locking authchain to the AuthchainGuard, TODO: Make this optional, allow sending to P2PKH address*/
      const authChainGuard = new AuthChainGuard(creator.value, wallet.getPublicKeyHash(false), wallet.network)
      const contract = authChainGuard.contract
      const tokenGenesisRequest: (SendRequest | TokenSendRequest | OpReturnData)[] = [
        new SendRequest({ cashaddr: contract.getDepositAddress(), value: 1000 /**/, unit: UnitEnum.SATOSHIS }),
      ]

      const requiredFields = { cashaddr: wallet.getTokenDepositAddress(), value: 1000, tokenId: token.value.tokenId }
      if (token.value.tokenType === 'fungible') {
        tokenGenesisRequest.push(new TokenSendRequest({
          ...requiredFields,
          amount: Number(token.value.amount),
        }))
      } else if (token.value.tokenType === 'nonfungible') {
        tokenGenesisRequest.push(new TokenSendRequest({
          ...requiredFields,
          capability: token.value.capability,
          commitment: token.value.commitment
        }))
      } else if (token.value.tokenType === 'hybrid') {
        tokenGenesisRequest.push(new TokenSendRequest({
          ...requiredFields,
          amount: Number(token.value.amount),
          capability: token.value.capability,
          commitment: token.value.commitment
        }))
      } else {
        return ui.setMessage({ type: 'error', text: 'Unsupported token type' })
      }

      if (genesisOptions.value.publishIdentityOutput === true) {
        let contentHash = sha256.hash(utf8ToBin(JSON.stringify(registry.value)))
        tokenGenesisRequest.push(OpReturnData.fromArray(['BCMR', contentHash, registryUrl.value.replace('https://', '')]))
      }

      const { encodedTransaction, sourceOutputs } = await wallet.encodeTransaction(tokenGenesisRequest,
        false,
        { tokenOperation: 'genesis', checkTokenQuantities: false, buildUnsigned: true, utxoIds: [authbaseAndTokenGenesisInput], ensureUtxos: [authbaseAndTokenGenesisInput] }
      )

      let decoded = decodeTransaction(encodedTransaction)

      if (typeof decoded === 'string') {
        return ui.setMessage({ type: 'error', text: decoded })
      }

      ui.busy({ type: 'info', text: 'Waiting for FT creator\'s signature' })

      txSigningResult = await window.paytaca.signTransaction({
        transaction: decoded, sourceOutputs: [...sourceOutputs], broadcast: false, userPrompt: 'Create Token Genesis'
      })

      if (!txSigningResult) {
        ui.idle()
        ui.clearMessage()
        return
      }

    } catch (error) {
      console.log(error)
      if (error instanceof Error) {
        console.log(error)
        ui.setMessage({ type: 'error', text: 'Error creating FT Token' })
      }
      return
    }

    // Tx signing success, submitting transaction
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tx = await wallet.submitTransaction(hexToBin(txSigningResult!.signedTransaction), true)
      ui.idle()
      ui.setMessage({ text: `Success! FT Created Tx = ${tx}`, type: 'success', timeout: 5 })

      await BCMR.buildAuthChain({ transactionHash: token.value.tokenId, network: wallet.network })
      const router = useRouter()
      router.push(`/token/view?tokenId=${token.value.tokenId}&creator=${creator.value}`)
    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
      return
    }
  }
}

</script>

