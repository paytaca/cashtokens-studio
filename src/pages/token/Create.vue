<template>
  <q-page class="q-pa-lg" style="min-height: 100vh">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 col-lg-8">
        <div class="row justify-between items-end q-mb-sm">
          <q-toolbar>
            <q-icon name="token" size="md" flat round dense />
            <q-toolbar-title :class="$q.dark.isActive ? 'text-grey-4' : ''">
              Create Token
            </q-toolbar-title>
            <q-btn label="FT" color="warning" class="q-mr-sm" no-caps :outline="route.params.tokenType === 'fungible'"
              :flat="route.params.tokenType !== 'fungible'" dense @click="router.push('/token/create/fungible')" />
            <q-btn label="NFT" color="warning" class="q-mr-sm" no-caps :outline="route.params.tokenType === 'nonfungible'"
              :flat="route.params.tokenType !== 'nonfungible'" dense @click="router.push('/token/create/nonfungible')" />
            <q-btn label="FNFT" color="warning" no-caps :outline="route.params.tokenType === 'hybrid'"
              :flat="route.params.tokenType !== 'hybrid'" dense @click="router.push('/token/create/hybrid')" />
          </q-toolbar>
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
          <q-input class="row" :filled="true" dark:color="lime" v-model="creator" label="Creator" aria-disabled="true"
            disable dense square />
          <div class="row">
            <q-select class="col-12 ellipsis" :loading="user.updatingBalances" :filled="true" bottom-slots
              v-model="token.tokenId" :options="tokenIdOptions" label="Token ID"
              :disable="!tokenIdOptions || tokenIdOptions.length === 0" dense square hide-bottom-space>
              <template v-slot:loading>
                <q-spinner-facebook size="sm" color="primary" />
              </template>

            </q-select>
            <div class="col-12">
              <i class="text-caption">{{ tokenIdInputHint }}</i><q-btn size="xs" class="q-mx-sm text-caption"
                @click.stop="copyText(token.tokenId)" flat dense>COPY</q-btn>
            </div>
          </div>

          <q-input v-if="token.tokenType === 'fungible' || token.tokenType === 'hybrid'" class="row" :filled="true"
            dark:color="lime" v-model="token.amount" min="1" :max="constants.MAX_FUNGIBLE_AMOUNT" label="Genesis Supply"
            aria-disabled="true" dense square>
            <template v-slot:prepend>
              <q-icon name="pin"></q-icon>
            </template>
          </q-input>
          <q-select v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="q-mb-sm"
            :filled="true" bottom-slots v-model="token.capability" :options="['minting', 'mutable', 'none']"
            label="Capability" dense square hide-bottom-space>
          </q-select>

          <q-input v-if="token.tokenType === 'nonfungible' || token.tokenType === 'hybrid'" class="row q-mb-sm"
            :filled="true" dark:color="lime" v-model="token.commitment" type="text" label="Commitment" dense square>
          </q-input>

          <div v-if="token.tokenId" class="row items-center">
            <q-checkbox :filled="true" dark:color="lime" v-model="options.useMintingBaton" size="xs"
              label="Use Minting Baton">
            </q-checkbox>
            <q-btn href="https://github.com/mr-zwets/MBC-Token-Standard" :target="'_blank'" icon="help" size="xs"
              color="info" flat round>
              <q-tooltip>Click to view CHIP</q-tooltip>
            </q-btn>
          </div>

          <div v-if="token.tokenId" class="row items-center">
            <q-checkbox :filled="true" dark:color="lime" v-model="options.publishIdentityOutput" size="xs"
              label="Publish Registry">
            </q-checkbox>
            <q-btn size="xs" color="info" icon="help" flat round>
              <q-tooltip>Include a BCMR publication output</q-tooltip>
            </q-btn>
          </div>
          <div v-if="token.tokenId && options.publishIdentityOutput" class="row q-pa-md"
            style="border-style: solid; border-width: 1px; border-radius: 5px;">
            <div v-if="options.publishIdentityOutput" class="col-12 row justify-center">
              <div class="col-xs-12">
                <div class="row items-top q-col-gutter-none">
                  <div class="col-xs-12">
                    <q-input :filled="true" v-model="options.data.publishIdentityOutput.registryUrl" type="url"
                      :rules="[v => v.length > 7 || 'Invalid URL']" label="The BCMR's URL" dense square standout
                      hide-bottom-space></q-input>
                  </div>
                </div>
                <div class="row items-top q-col-gutter-none q-my-md">
                  <div class="col-xs-12">
                    <q-input :filled="true" v-model="options.data.publishIdentityOutput.contentHash" type="url"
                      label="The BCMR's content hash" dense square>
                    </q-input>
                  </div>
                  <div v-if="options.data.publishIdentityOutput.registryUrl" class="col-xs-12">
                    <q-btn color="primary" size="sm" icon="cloud_download"
                      label="Compute hash of the contents from the provided URL" no-caps flat dense
                      @click="() => computeBcmrHashFromRemote(options.data.publishIdentityOutput.registryUrl)"></q-btn>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="row justify-end">
            <q-btn color="primary" size="large" @click="submitTokenGenesisTransaction" :disable="!token.tokenId">
              Create Token
            </q-btn>
          </div>
        </q-form>
        <!-- Bcmr Create Form Wizard -->
        <!-- <div v-if="options.currentView === 'bcmr-wizard'" class="q-pa-sm">
          <i class="row text-h6 q-mb-sm">
            Create BCMR
          </i>
          <BcmrBasicFormWizard type="fungible" :token-id-options="token.idOptions" :bcmr="registry"
            :authbase="token.tokenId" @finish="onBcmrCreationFinish"
            @cancel="() => options.currentView = 'create-token'" />
        </div> -->
        <!-- <div v-if="options.currentView === 'bcmr-editor'" class="q-pa-sm">
          <div class="row justify-between">
            <i class="text-h6 q-mb-sm">Review BCMR</i>
            <q-btn icon="close" flat rounded size="sm" @click="options.currentView = 'create-token'"></q-btn>
          </div>
          <JsonEditor v-model="registry" :darkTheme="$q.dark.isActive" />
        </div> -->
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
// import JsonEditor from 'vue3-ts-jsoneditor'
import { onMounted, ref, computed, watch } from 'vue'
import { utf8ToBin, decodeTransaction, binToHex } from '@bitauth/libauth'
import { hexToBin, BCMR, OpReturnData, SendRequest, TokenSendRequest, UtxoI, TokenI, Wallet } from 'mainnet-js'

import { TokenType } from 'src/types'
import useStore from 'src/composables/useStore'
import getWalletClass from 'src/utils/getWalletClass'
import { Registry as BcmrRegistry } from 'src/interfaces'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import MintingCovenant from 'src/contracts/MintingCovenant'
import { useQuasar } from 'quasar';
import fetchBcmrContentHash from 'src/bcmr/fetchBcmrContentHash';
import copyText from 'src/utils/copyText';
import constants from 'src/constants'

defineOptions({ name: 'TokenCreate' })
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const { user, ui } = useStore()
const creator = computed(() => user.connectedPaytacaAddress)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion

const registry = ref<BcmrRegistry | null>(null)
const tokenIdOptions = computed(() => user.genesisInputs?.filter((u: UtxoI) => !u.token && u.vout === 0).map((u: UtxoI) => u.txid).slice(0, 5))
const tokenIdInputHint = computed(() => tokenIdOptions.value && tokenIdOptions.value.length > 0 ? 'Select token id from suitable UTXOs' : 'No suitable UTXO, please consolidate your UTXOs and try again.')
const token = ref<{
  tokenType: TokenType,
  tokenId: string,
  amount: number | string,
  capability: undefined | 'none' | 'mutable' | 'minting',
  commitment: undefined | string
}>({
  tokenType: 'fungible',
  tokenId: '',
  amount: constants.MAX_FUNGIBLE_AMOUNT,
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
  useMintingBaton: boolean,
  data: {
    publishIdentityOutput: {
      registryUrl: string,
      contentHash: string
    }
  }
}>({
  currentView: 'create-token',
  displayRegistryCreateWizard: false,
  displayFetchOrCreateDialog: false,
  displayBcmrEditor: false,
  publishIdentityOutput: true,
  useAuthChainGuard: true,
  useMintingBaton: true,
  data: {
    publishIdentityOutput: {
      registryUrl: '',
      contentHash: ''
    }
  }
})

watch(() => route.params.tokenType, (tokenType) => {
  token.value.tokenType = tokenType as TokenType
})

onMounted(async () => {
  token.value.tokenType = route.params?.tokenType as TokenType
  if (tokenIdOptions.value) {
    token.value.tokenId = tokenIdOptions.value[0]
  }
})

/**
 * Get's the content
 */
const initBcmrContentHashFromRemote = async (url: string) => {
  try {
    options.value.data.publishIdentityOutput.contentHash = await fetchBcmrContentHash(url) || ''
  } catch (error) {
    console.log(error)
  }
}

const computeBcmrHashFromRemote = (url: string) => {
  const end = $q.notify({ message: 'Checking contents of BCMR from URL', timeout: 0, color: 'info' })
  initBcmrContentHashFromRemote(url).then(() => { end() }).catch(() => { end() })
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
    authchainGuard = new AuthChainGuard(owner, wallet.getPublicKeyHash(false), wallet.network, $q.notify)
    authchainIdentityOutputRecipient = authchainGuard.contract.getTokenDepositAddress()
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
    const mintingCovenant = new MintingCovenant(token.value.tokenId, wallet.network, $q.notify)
    genesisTokenRecipient = mintingCovenant.contract.getTokenDepositAddress()
    genesisTokenRequest = [
      new TokenSendRequest({ cashaddr: genesisTokenRecipient, tokenId: token.value.tokenId, value: 1000, amount: Number(token.value.amount) }), // FT Reserves
      new TokenSendRequest({ cashaddr: user.wallet!.getTokenDepositAddress(), tokenId: token.value.tokenId, value: 1000, commitment: '00', amount: 0 }) // Minting Baton NFT
    ]
  }
  requests.push(...genesisTokenRequest)
  if (options.value.publishIdentityOutput === true) {
    requests.push(OpReturnData.fromArray(['BCMR', options.value.data.publishIdentityOutput.contentHash, options.value.data.publishIdentityOutput.registryUrl.replace('https://', '')]))
  }

  return requests
}

/**
 * Send the token genesis request
 */
const submitTokenGenesisTransaction = async () => {

  if (options.value.publishIdentityOutput
    && (!options.value.data.publishIdentityOutput.registryUrl
      || !options.value.data.publishIdentityOutput.contentHash)) {
    return $q.notify({ message: 'Error!Registry URL and content hash required when publishing identity output', color: 'negative', timeout: 1000 })
  }

  if (!creator.value) {
    return $q.notify({ message: 'Not a valid creator address', color: 'negative', timeout: 1000 })
  }

  if (!user.genesisInputs) {
    return $q.notify({ message: 'No suitable token genesis input', color: 'negative', timeout: 1000 })
  }

  let closeNotif = $q.notify({ message: `Creating new ${token.value.tokenType} token`, color: 'info', timeout: 0 })

  const wallet = await getWalletClass().watchOnly(creator.value)
  // Prepare transaction and request signature
  let txSigningResult
  try {
    const tokenGenesisRequest = await prepareGenesisRequest(wallet)
    // use the selected utxo as genesis input
    const genesisInput = user.genesisInputs?.filter((val: UtxoI) => !val.token && val.vout === 0 && val.txid === token.value.tokenId)[0]

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
      return $q.notify({ message: 'Error!' + decoded, color: 'error', timeout: 3000 })
    }


    closeNotif()
    closeNotif = $q.notify({ message: 'Waiting for signature', color: 'info', timeout: 0 })
    txSigningResult = await window.paytaca.signTransaction({
      transaction: decoded,
      sourceOutputs: [...sourceOutputs],
      broadcast: false,
      userPrompt: `Create token genesis ${options.value.publishIdentityOutput ? '(With Baton)' : ''}`
    })

    if (!txSigningResult) {
      // User rejected(did not sign) do nothing
      closeNotif()
      return
    }

  } catch (error) {
    console.log(error)
    if (error instanceof Error) {
      console.log(error)
      closeNotif()
      $q.notify({ message: 'Error signing request', color: 'negative', timeout: 2000 })
    }
    return
  }
  closeNotif()
  // User signed, submit transaction
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tx = await wallet.submitTransaction(hexToBin(txSigningResult!.signedTransaction), true)
    $q.notify({ message: `Success! Token Created. Tx = ${tx}`, type: 'success', timeout: 15000 })
    closeNotif = $q.notify({ message: 'Trying to build authchain in chaingraph for this token', color: 'info', timeout: 0 })
    const ac = await BCMR.buildAuthChain({ transactionHash: token.value.tokenId, network: wallet.network })
    if (ac) {
      closeNotif()
      $q.notify({ message: 'Authchain successfully built for this token', type: 'success', timeout: 2000 })
    }
  } catch (error) {
    console.log('Error creating FT Token during submission of txn', error)
  } finally {
    closeNotif()
  }

  if (closeNotif) {
    closeNotif()
  }
}

</script>

