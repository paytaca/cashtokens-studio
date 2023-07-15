<template>
  <q-page class="q-pa-sm" style="min-height: 100vh">
    <div class="row justify-between items-end q-mb-lg q-px-sm">
      <i class="col-6 text-h5">Create Token</i>
      <div v-if="registry" class="col-6 row justify-end items-center q-gutter-sm">
        <div class="text-weight-thin">{BCMR}</div>
        <q-btn type="a" :href="`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(registry))}`"
          download="bitcoin-cash-metadata-registy.json" icon="download" size="xs" round></q-btn>
        <q-btn icon="edit" size="xs" round></q-btn>
        <q-btn icon="delete" size="xs" color="red" round></q-btn>
      </div>
    </div>

    <q-form v-if="!genesisOptions.displayRegistryCreateWizard" class="q-gutter-md q-mx-sm">
      <q-input class="row" :filled="true" dark:color="lime" v-model="creator" label="Creator's address"
        aria-disabled="true" disable dense square />
      <div class="row">
        <q-select class="col q-mb-sm" :filled="true" bottom-slots v-model="token.tokenId" :options="token.idOptions"
          label="Token tokenId" :disable="!token.idOptions || token.idOptions.length === 0" dense square>
          <template v-slot:hint>
            <i>Select suitable TX id from your utxos</i>
          </template>
          <q-inner-loading :showing="isPopulatingTokenIdOptions">
            <q-spinner-facebook size="sm" color="primary" />
          </q-inner-loading>
        </q-select>
      </div>
      <q-input v-if="token.tokenType === 'fungible' || token.tokenType === 'hybrid'" class="row" :filled="true"
        dark:color="lime" v-model="token.amount" min="1" max="9223372036854700000" label="Max Supply" aria-disabled="true"
        dense square />
      <q-select v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="col q-mb-sm"
        :filled="true" bottom-slots v-model="token.capability" :options="['minting', 'mutable', 'none']"
        label="Capability" dense square>
        <q-inner-loading :showing="isPopulatingTokenIdOptions">
          <q-spinner-facebook size="sm" color="primary" />
        </q-inner-loading>
      </q-select>
      <q-input v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="row q-mb-sm" :filled="true"
        dark:color="lime" v-model="token.commitment" type="text" label="Commitment" dense square>
      </q-input>
      <div class="row justify-end">
        <q-checkbox :filled="true" dark:color="lime" v-model="genesisOptions.publishIdentityOutput"
          label="Publish Identity Output">
        </q-checkbox>
      </div>
      <div class="row justify-end">
        <q-btn color="secondary" size="large" @click="submitTokenGenesisTransaction">Create Token</q-btn>
      </div>
    </q-form>
    <!-- Bcmr Create Form Wizard -->
    <BcmrBasicFormWizard v-if="genesisOptions.displayRegistryCreateWizard" type="fungible"
      :token-id-options="token.idOptions" :bcmr="registry" :authbase="token.tokenId"
      @finish="(r) => { genesisOptions.displayRegistryCreateWizard = false; registry = r }" />
    <!-- Fetch Or Create Dialog -->
    <q-dialog :model-value="genesisOptions.displayFetchOrCreateDialog" full-width>
      <q-card class="q-pa-xs">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span class="text-weight-bold">Fetch</span> or Create?</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-input :filled="true" v-model="registryUrl" label="Registry URL"></q-input>
        <div class="row justify-end q-ma-sm q-gutter-sm">
          <q-btn color="primary" size="md" @click="fetchRegistry">Fetch</q-btn>
          <q-btn color="primary" size="md" @click="displayRegistryCreateWizard">Create New</q-btn>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>
<style scoped></style>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router';
import { sha256, utf8ToBin, decodeTransaction, binToUtf8 } from '@bitauth/libauth'
import { hexToBin, BCMR, OpReturnData, SendRequest, TokenSendRequest, UnitEnum, UtxoI } from 'mainnet-js'

import AuthChainGuard from 'src/classes/AuthChainGuard'
import getWalletClass from 'src/utils/getWalletClass'
import { Registry as BcmrRegistry } from 'src/interfaces'
import useStore from 'src/composables/useStore'
import BcmrBasicFormWizard from 'src/components/BcmrBasicFormWizard.vue'
import { TokenType } from 'src/types'
defineOptions({ name: 'submitTokenGenesisTransaction' })

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
  displayRegistryCreateWizard: boolean,
  displayFetchOrCreateDialog: boolean
}>({
  publishIdentityOutput: false,
  displayRegistryCreateWizard: false,
  displayFetchOrCreateDialog: false
})

const registry = ref<BcmrRegistry | null>(null)
const registryUrl = ref<string>('https://example.com/.well-known/bitcoin-cash-metadata-registry.json')
const registryObtainedFrom = ref<'fetch' | 'create' | null>(null)
const isPopulatingTokenIdOptions = ref<boolean>(false)

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
    const txIds = (await user.wallet?.getAddressUtxos())?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0)
    token.value.idOptions = txIds?.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
  }
})
onMounted(async () => {
  // let b = hexToBin('0x6578616d706c652e636f6d2f2e77656c6c2d6b6e6f776e2f626974636f696e2d636173682d6d657461646174612d72656769737472792e6a736f6e')
  // console.log(hexToBin('0x6578616d706c652e636f6d2f2e77656c6c2d6b6e6f776e2f626974636f696e2d636173682d6d657461646174612d72656769737472792e6a736f6e'))
  // console.log(binToUtf8(b))
  token.value.tokenType = route.params?.tokenType as TokenType
  console.log('user wallet', user.wallet)
  const txIds = (await user.wallet?.getAddressUtxos())?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0)
  console.log(txIds)
  token.value.idOptions = txIds?.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
})

// methods
const fetchRegistry = async () => {
  try {
    ui.busy({ text: `Fetching registry from ${registryUrl.value}`, type: 'info' })
    const r = await fetch(registryUrl.value)
    registry.value = await r.json()
    registryObtainedFrom.value = 'fetch'
    // TODO:Check if this token.tokenId's identity is in the registry
    ui.setMessage({ text: 'Registry download success', type: 'success', timeout: 5 })
  } catch (error) {
    ui.setMessage({ text: 'Failed to fetch registry, make sure the URI is correct', type: 'error', timeout: 5 })
    console.log(error)
  } finally {
    ui.idle()
  }
}

const displayRegistryCreateWizard = async () => {
  genesisOptions.value.displayFetchOrCreateDialog = false
  genesisOptions.value.displayRegistryCreateWizard = true
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

    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
      return
    }
  }
}

</script>

