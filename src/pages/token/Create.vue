<template>
  <q-page class="q-pa-md q-ma-sm" style="min-height: 100vh">
    <q-form v-if="!genesisOptions.displayRegistryCreateWizard" class="q-gutter-md">
      <span class="text-h5"><i>Create Token</i></span>
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
        dark:color="lime" v-model="token.amount" min="1" max="9223372036854775807" label="Max Supply" aria-disabled="true"
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
        <q-btn color="secondary" size="large" @click="createToken">Create Token</q-btn>
      </div>
    </q-form>
    <!-- Bcmr Create Form Wizard -->
    <BcmrBasicFormWizard v-if="genesisOptions.displayRegistryCreateWizard" type="fungible"
      :token-id-options="token.idOptions" :bcmr="registry"
      @finish="(r) => { genesisOptions.displayRegistryCreateWizard = false; registry = r }" />
    <!-- Fetch Or Create Dialog -->
    <q-dialog :model-value="genesisOptions.displayFetchOrCreateDialog" full-width>
      <q-card class="q-pa-xs">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span class="text-weight-bold">Fetch</span> or Create?</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-input :filled="true" v-model="registryFetchUrl" label="Registry URL"></q-input>
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
import { UtxoI } from 'mainnet-js';
import { Registry as BcmrRegistry } from 'src/interfaces'
import useStore from 'src/composables/useStore'
import BcmrBasicFormWizard from 'src/components/BcmrBasicFormWizard.vue'

defineOptions({ name: 'CreateToken' })

const route = useRoute()
const { user, ui } = useStore()

const creator = computed(() => user.connectedPaytacaAddress)

const token = ref<{
  tokenType: TokenType,
  tokenId: string,
  idOptions?: string[],
  amount: number | string,
  capability: null | 'none' | 'mutable' | 'minting',
  commitment: null | ''
}>({
  tokenType: 'fungible',
  tokenId: '',
  idOptions: [],
  amount: '9223372036854775807',
  capability: null,
  commitment: null
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
const registryFetchUrl = ref<string>('https://example.com/.well-known/bitcoin-cash-metadata-registry.json')
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
  token.value.tokenType = tokenType as string
})

onMounted(async () => {
  const txIds = (await user.wallet?.getAddressUtxos())?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0)
  token.value.tokenType = route.params?.tokenType as string
  console.log(route.params.tokenType)
  token.value.idOptions = txIds?.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
})

// methods
const fetchRegistry = async () => {
  try {
    ui.busy({ text: `Fetching registry from ${registryFetchUrl.value}`, type: 'info' })
    const r = await fetch(registryFetchUrl.value)
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

const createToken = async () => {
  console.log('CREATING TOKEN')
}

</script>

