<template>
  <q-page class="q-pa-lg" style="min-height: 100vh">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 col-lg-8">
        <div class="row justify-between items-end q-mb-sm">
          <span class="col-6 text-h5"><q-icon name="token" /> Create Token</span>
          <div v-if="registry" class="col-6 row justify-end items-center q-gutter-sm">
            <div class="text-weight-thin">{BCMR}</div>
            <q-btn type="a" :href="`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(registry))}`"
              download="bitcoin-cash-metadata-registy.json" icon="download" size="xs" round></q-btn>
            <q-btn icon="edit" size="xs" round @click="options.currentView = 'bcmr-editor'"></q-btn>
            <q-btn icon="delete" size="xs" color="red" round
              @click="() => { registry = null; options.publishIdentityOutput = false; options.currentView = 'create-token' }"></q-btn>
          </div>
        </div>
        <q-separator :dark="$q.dark.isActive" class="q-mb-lg" />
        <q-form v-if="options.currentView === 'create-token'" class="q-gutter-md q-pa-sm">
          <i class="row text-h6 q-mb-sm">Token Details</i>
          <q-input class="row" :filled="true" dark:color="lime" v-model="creator" label="Creator's address"
            aria-disabled="true" disable dense square />
          <div class="row">
            <q-select class="col q-mb-sm ellipsis" :filled="true" bottom-slots v-model="token.tokenId"
              :options="token.idOptions" label="Token ID" :disable="!token.idOptions || token.idOptions.length === 0"
              dense square>
              <template v-slot:hint>
                <i v-if="!token.tokenId">{{ tokenIdInputHint }}</i>
                <q-btn v-else size="xs" dense @click="copyTokenId">copy</q-btn>
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
          <q-select v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="q-mb-sm"
            :filled="true" bottom-slots v-model="token.capability" :options="['minting', 'mutable', 'none']"
            label="Capability" dense square>
            <q-inner-loading :showing="isPopulatingTokenIdOptions">
              <q-spinner-facebook size="sm" color="primary" />
            </q-inner-loading>
          </q-select>
          <q-input v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="row q-mb-sm"
            :filled="true" dark:color="lime" v-model="token.commitment" type="text" label="Commitment" dense square>
          </q-input>
          <div v-if="token.tokenId" class="row items-center">
            <q-checkbox :filled="true" dark:color="lime" v-model="options.publishIdentityOutput" size="xs"
              label="Publish Registry">
            </q-checkbox>
            <q-btn size="xs" color="info" icon="help" flat round>
              <q-tooltip>Include a BCMR publication output</q-tooltip>
            </q-btn>
          </div>
          <div v-if="options.publishIdentityOutput" class="row q-pa-md"
            style="border-style: solid; border-width: 1px; border-radius: 5px;">
            <q-input :filled="true" v-model="registryUrl" type="url" :rules="[v => v.length > 7 || 'Invalid URL']"
              label="Registry URL" class="col-12" dense square></q-input>
            <div class="col-12 justify-end q-gutter-sm">
              <q-btn color="primary" size="xs" @click="fetchRegistry">
                Fetch Registry
                <q-tooltip>Fetch an existing registry from the above URL</q-tooltip>
              </q-btn>
              <q-btn color="primary" size="xs" @click="displayRegistryCreateWizard">
                Create New Registry
                <q-tooltip>Create a new registry and use the registry URL as value </q-tooltip>
              </q-btn>
            </div>
          </div>
          <div v-if="token.tokenId" class="row items-center">
            <q-checkbox :filled="true" dark:color="lime" v-model="options.useMintingBaton" size="xs"
              label="Use Minting Baton">
            </q-checkbox>
            <q-btn href="https://github.com/mr-zwets/MBC-Token-Standard" :target="'_blank'" icon="help" size="xs"
              color="info" flat round>
              <q-tooltip>Click to view CHIP</q-tooltip>
            </q-btn>
          </div>
          <div class="row justify-end">
            <q-btn color="primary" size="large" @click="submitTokenGenesisTransaction" :disable="!token.tokenId">
              Create Token
            </q-btn>
          </div>
        </q-form>
        <!-- Bcmr Create Form Wizard -->
        <div v-if="options.currentView === 'bcmr-wizard'" class="q-pa-sm">
          <i class="row text-h6 q-mb-sm">
            Create BCMR
          </i>
          <BcmrBasicFormWizard type="fungible" :token-id-options="token.idOptions" :bcmr="registry"
            :authbase="token.tokenId" @finish="onBcmrCreationFinish"
            @cancel="() => options.currentView = 'create-token'" />
        </div>
        <div v-if="options.currentView === 'bcmr-editor'" class="q-pa-sm">
          <div class="row justify-between">
            <i class="text-h6 q-mb-sm">Review BCMR</i>
            <q-btn icon="close" flat rounded size="sm" @click="options.currentView = 'create-token'"></q-btn>
          </div>
          <JsonEditor v-model="registry" :darkTheme="$q.dark.isActive" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import JsonEditor from 'vue3-ts-jsoneditor'
import { onMounted, ref, computed, watch } from 'vue'
import { sha256, utf8ToBin, decodeTransaction, binToHex } from '@bitauth/libauth'
import { hexToBin, BCMR, OpReturnData, SendRequest, TokenSendRequest, UtxoI, TokenI, Wallet } from 'mainnet-js'

import { TokenType } from 'src/types'
import useStore from 'src/composables/useStore'
import getWalletClass from 'src/utils/getWalletClass'
import { Registry as BcmrRegistry } from 'src/interfaces'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import MintingCovenant from 'src/contracts/MintingCovenant'
import BcmrBasicFormWizard from 'src/components/BcmrBasicFormWizard.vue'

defineOptions({ name: 'TokenCreate' })
const route = useRoute()
const router = useRouter()
const { user, ui } = useStore()
const creator = computed(() => user.connectedPaytacaAddress)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const tokenIdInputHint = computed(() => token.value.idOptions!.length > 0 ? 'Select token id from suitable UTXOs' : 'No suitable UTXO, please consolidate your UTXOs and try again.')
const registry = ref<BcmrRegistry | null>(null)
const registryUrl = ref<string>('https://example.com/.well-known/bitcoin-cash-metadata-registry.json')
const registryObtainedFrom = ref<'fetch' | 'create' | null>(null)
const isPopulatingTokenIdOptions = ref<boolean>(false)

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

const options = ref<{
  currentView: 'create-token' | 'bcmr-wizard' | 'bcmr-editor',
  displayRegistryCreateWizard: boolean,
  displayFetchOrCreateDialog: boolean,
  displayBcmrEditor: boolean,
  publishIdentityOutput: boolean,
  useAuthChainGuard: boolean,
  useMintingBaton: boolean
}>({
  currentView: 'create-token',
  displayRegistryCreateWizard: false,
  displayFetchOrCreateDialog: false,
  displayBcmrEditor: false,
  publishIdentityOutput: false,
  useAuthChainGuard: true,
  useMintingBaton: false
})

watch(() => options.value.publishIdentityOutput, (yes) => {
  if (yes && !registryObtainedFrom.value) {
    options.value.displayFetchOrCreateDialog = true
  } else {
    registryObtainedFrom.value = null
    options.value.displayFetchOrCreateDialog = false
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

const copyTokenId = () => {
  navigator?.clipboard.writeText(token.value.tokenId)
}
// methods
const fetchRegistry = async () => {
  try {
    ui.busy({ text: `Fetching registry from ${registryUrl.value}`, type: 'info' })
    const r = await fetch(registryUrl.value)
    registry.value = await r.json()
    registryObtainedFrom.value = 'fetch'
    options.value.displayFetchOrCreateDialog = false
    // TODO:Check if this token.tokenId's identity is in the registry
    ui.idle()
    ui.setMessage({ text: 'Registry download success', type: 'success', timeout: 5 })
  } catch (error) {
    ui.setMessage({ text: 'Failed to fetch registry, make sure the URI is correct', type: 'error', timeout: 5 })
    console.log(error)
  }
}

const displayRegistryCreateWizard = async () => {
  options.value.displayFetchOrCreateDialog = false
  options.value.currentView = 'bcmr-wizard'
}

const onBcmrCreationFinish = (r: BcmrRegistry) => {
  options.value.currentView = 'create-token'
  registry.value = r;
  registryObtainedFrom.value = 'create'
  console.log(registry.value)
}

/**
 * Prepare genesis request based on some selected options
 */
const prepareGenesisRequest = async (wallet: Wallet): Promise<(SendRequest | TokenSendRequest | OpReturnData)[]> => {
  const requests = []
  let owner: string = creator.value as string
  let authchainIdentityOutputRecipient = owner
  let authchainGuard = null
  if (options.value.useAuthChainGuard) {
    authchainGuard = new AuthChainGuard(owner, wallet.getPublicKeyHash(false), wallet.network)
    authchainIdentityOutputRecipient = authchainGuard.contract.getDepositAddress()
  }

  requests.push(
    new TokenSendRequest({ cashaddr: authchainIdentityOutputRecipient, value: 1000, tokenId: token.value.tokenId, commitment: binToHex(utf8ToBin('identity')) }),
  )

  let genesisTokenFields: TokenI = { tokenId: token.value.tokenId, amount: 0 }

  if (token.value.tokenType === 'fungible') {
    genesisTokenFields.amount = Number(token.value.amount)
  }

  if (token.value.tokenType === 'nonfungible') {
    genesisTokenFields.capability = token.value.capability
    genesisTokenFields.commitment = token.value.commitment
  }

  if (token.value.tokenType === 'hybrid') {
    genesisTokenFields.amount = Number(token.value.amount)
    genesisTokenFields.capability = token.value.capability
    genesisTokenFields.commitment = token.value.commitment
  }

  let genesisTokenRecipient = owner
  let genesisTokenRequest: (SendRequest | TokenSendRequest)[] = [new TokenSendRequest({ cashaddr: genesisTokenRecipient, value: 1000, ...genesisTokenFields })]
  if (token.value.tokenType === 'fungible' && token.value.amount && options.value.useMintingBaton) {
    const mintingCovenant = new MintingCovenant(token.value.tokenId, wallet.network)
    genesisTokenRecipient = mintingCovenant.contract.getDepositAddress()
    genesisTokenRequest = [
      new TokenSendRequest({ cashaddr: genesisTokenRecipient, tokenId: token.value.tokenId, value: 1000, amount: Number(token.value.amount) }),
      new TokenSendRequest({ cashaddr: owner, tokenId: token.value.tokenId, value: 1000, commitment: '0x00', amount: 0 })
    ]
  }
  requests.push(...genesisTokenRequest)
  if (options.value.publishIdentityOutput === true) {
    let contentHash = sha256.hash(utf8ToBin(JSON.stringify(registry.value)))
    requests.push(OpReturnData.fromArray(['BCMR', contentHash, registryUrl.value.replace('https://', '')]))
  }

  return requests
}

/**
 * Send the token genesis request
 */
const submitTokenGenesisTransaction = async () => {

  if (options.value.publishIdentityOutput && !registry.value) {
    return ui.setMessage({ type: 'error', text: 'Missing registry value. Did you forgot to load or create registry?', timeout: 5 })
  }

  ui.busy({ text: `Creating ${token.value.tokenType} token`, type: 'info' })
  if (creator.value) {

    const wallet = await getWalletClass().watchOnly(creator.value)

    // Prepare transaction and request signature
    let txSigningResult
    try {
      const tokenGenesisRequest = await prepareGenesisRequest(wallet)
      // use the selected utxo as genesis input
      const genesisInput = (await wallet.getAddressUtxos())
        .filter((val: UtxoI) => !val.token && val.vout === 0 && val.txid === token.value.tokenId)[0]

      const { encodedTransaction, sourceOutputs } = await wallet.encodeTransaction(
        tokenGenesisRequest,
        false,
        {
          tokenOperation: 'genesis',
          checkTokenQuantities: false,
          buildUnsigned: true,
          utxoIds: [genesisInput],
          ensureUtxos: [genesisInput]
        }
      )

      let decoded = decodeTransaction(encodedTransaction)

      if (typeof decoded === 'string') {
        return ui.setMessage({ type: 'error', text: decoded })
      }

      ui.busy({ type: 'info', text: 'Waiting for creator\'s signature' })

      txSigningResult = await window.paytaca.signTransaction({
        transaction: decoded,
        sourceOutputs: [...sourceOutputs],
        broadcast: false,
        userPrompt: `Create token genesis ${options.value.publishIdentityOutput ? '(With Baton)' : ''}`
      })

      if (!txSigningResult) {
        // User rejected(did not sign) do nothing
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

    // User signed, submit transaction
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tx = await wallet.submitTransaction(hexToBin(txSigningResult!.signedTransaction), true)
      ui.idle()
      ui.setMessage({ text: `Success! FT Created Tx = ${tx}`, type: 'success', timeout: 20 })

      await BCMR.buildAuthChain({ transactionHash: token.value.tokenId, network: wallet.network })

      router.push(`/token/view?tokenId=${token.value.tokenId}&creator=${creator.value}`)
    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
      return
    }

  } else {
    ui.idle()
    ui.setMessage({ type: 'error', text: 'Invalid owner address', timeout: 8 })
  }
}

</script>

