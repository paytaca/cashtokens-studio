<template>
  <q-page class="q-pa-md q-ma-sm" style="min-height: 100vh">
    <q-form v-if="genesisOptions.displayRegistryCreateWizard" class="q-gutter-sm">
      <span class="text-h5"><i>Create Token</i></span>
      <q-input class="row" :filled="true" dark:color="lime" v-model="token.creator" label="Creator's address"
        aria-disabled="true" disable />
      <div class="row">
        <q-select class="col" :filled="true" bottom-slots v-model="token.tokenId" :options="token.idOptions"
          label="Token tokenId" :disable="!token.idOptions || token.idOptions.length === 0">
          <template v-slot:prepend>
            <q-icon name="abc" />
          </template>
          <template v-slot:hint>
            <i>Select suitable TX id from your utxos</i>
          </template>
          <q-inner-loading :showing="isPopulatingTokenIdOptions">
            <q-spinner-facebook size="sm" color="primary" />
          </q-inner-loading>
        </q-select>
      </div>
      <div class="row justify-end">
        <q-checkbox :filled="true" dark:color="lime" v-model="genesisOptions.publishIdentityOutput"
          label="Publish Identity Output">
        </q-checkbox>
      </div>
    </q-form>
    <!-- Bcmr Create Form Wizard -->
    <BcmrBasicFormWizard v-if="genesisOptions.displayRegistryCreateWizard" />
    <!-- Fetch Or Create Dialog -->
    <q-dialog :model-value="genesisOptions.displayFetchOrCreateDialog" full-width>
      <q-card class="q-pa-xs">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span class="text-weight-bold">Fetch</span> or Create?</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-input :filled="true" v-model="registry.registryIdentity.uris.registry" label="Registry URI"></q-input>
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
import { onMounted, ref } from 'vue'
import { UtxoI } from 'mainnet-js';
import { Registry as BcmrRegistry } from 'src/interfaces'
import useStore from 'src/composables/useStore'
import BcmrBasicFormWizard from 'src/components/BcmrBasicFormWizard'

defineOptions({ name: 'CreateToken' })

const { user, ui } = useStore()

const token = ref<{
  tokenType: 'fungible' | 'nonfungible' | 'hybrid',
  tokenId: string,
  creator?: string,
  idOptions?: string[]
}>({
  tokenType: 'fungible',
  tokenId: ''
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

const registry = ref<BcmrRegistry>({
  $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
  version: { 'major': 1, 'minor': 0, 'patch': 0 },
  latestRevision: '2023-06-26T03:02:34.464Z',
  registryIdentity: {
    name: 'Example Metadata Registry Name',
    description: 'Example metadata description',
    uris: {
      icon: 'https://example.com/icons/example.png',
      web: 'https://example.com',
      registry: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
    }
  },
  identities: {
    '<example_token_id>': {
      '2023-06-26T03:02:34.464Z': {
        name: 'example name',
        description: 'example description',
        token: {
          category: '<example_token_id>',
          symbol: 'XMPL',
          decimals: 8
        },
        uris: {
          icon: 'https://example.com/icons/example.png',
          web: 'https://example.com',
          chat: 'https://t.me/Example',
          registry: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json',
          support: 'https://t.me/Example'
        }
      }
    }
  },
  license: 'CC0-1.0'
})

const isPopulatingTokenIdOptions = ref<boolean>(false)

onMounted(async () => {
  token.value.creator = user.connectedPaytacaAddress
  const txIds = (await user.wallet?.getAddressUtxos())?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0)
  token.value.idOptions = txIds?.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
})

// methods
const fetchRegistry = async () => {
  try {
    let registryUri
    if (registry.value.registryIdentity) {
      registryUri = typeof (registry.value.registryIdentity) !== 'string' ? registry.value.registryIdentity.uris?.registry : ''
    }
    if (!registryUri) return
    ui.busy({ text: `Fetching registry from ${registryUri}`, type: 'info' })
    const r = await fetch(registryUri)
    registry.value = await r.json()
    // TODO:Check if this token.tokenId's identity is in the registry
    ui.idle()
    ui.setMessage({ text: 'Registry download success', type: 'success', timeout: 5 })
  } catch (error) {
    ui.idle()
    ui.setMessage({ text: 'Failed to fetch registry, make sure the URI is correct', type: 'error', timeout: 5 })
    console.log(error)
  }
}

const displayRegistryCreateWizard = async () => {
  genesisOptions.value.displayRegistryCreateWizard = true
}

</script>

