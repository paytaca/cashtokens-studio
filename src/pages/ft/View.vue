<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<template>
  <q-page class="q-pa-md q-ma-sm" style="min-height: 100vh">
    <div>
      <div class="text-h6 q-mb-md">Viewing FT</div>
      <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify">
        <q-tab name="token" label="Token Details" />
        <q-tab v-if="enableBcmrEditor" name="bcmr" label="BCMR" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="token">
          <div class="row q-my-lg">
            <div class="col">
              <div class="col">
                <q-input :filled="true" dark:color="lime" v-model="token.tokenId" label="Token Id" disable></q-input>
              </div>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" dark:color="lime" v-model="token.creatorAddress" label="Creator's address"
                disable></q-input>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col q-gutter-sm">
              <q-btn color="primary" size="md" @click.stop="openBcmrFetchOrCreateDialog = true">Update Bcmr</q-btn>
              <q-btn color="primary" size="md" @click.stop="authchainTransfer">Transfer Ownership</q-btn>
              <q-btn color="primary" size="md" @click.stop="authchainBurn">Burn</q-btn>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="bcmr">
          <div class="row text-h5 q-mb-md">
            <div class="col">
              <div>BCMR</div>
              <q-btn @click="authchainPublish">Publish Update</q-btn>
            </div>
          </div>

          <JsonEditor v-model="bcmr" :darkTheme="$q.dark.isActive" />
        </q-tab-panel>
      </q-tab-panels>
    </div>
    <q-dialog v-model="openBcmrFetchOrCreateDialog" @hide="openBcmrFetchOrCreateDialog = false">
      <q-card style="width: 80vw;">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span class="text-weight-bold">Fetch</span> or Create?</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-card-section>
          <div class="row">
            <div class="col">
              <div class="row">
                <div class="col">
                  <q-input color="lime" :filled="true" standout bottom-slots v-model="bcmrCreationOption.fetchURL"
                    label="Enter BCMR URL" clearable></q-input>
                </div>
              </div>
              <div class="row justify-end">
                <div class="col-12 text-right q-gutter-sm q-pt-xs">
                  <q-btn color="primary" size="sm" @click="fetchBcmr">Fetch Updated BCMR</q-btn>
                  <q-btn color="primary" size="sm" @click="createBcmr">Create New</q-btn>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">

import JsonEditor from 'vue3-ts-jsoneditor'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Registry as Bcmr } from 'src/interfaces/bcmr-v2.schema'
import { useUserStore } from 'src/stores/user';
import { useUIStore } from 'src/stores/ui'
import getWalletClass from 'src/utils/getWalletClass'
import bcmrTemplate from 'src/resources/bcmr'
import AuthChainGuard from 'src/classes/AuthChainGuard'

defineOptions({ name: 'ViewFt' })

const WalletClass = getWalletClass()
const user = useUserStore()
const route = useRoute()
const ui = useUIStore()
const authChainGuard = ref<AuthChainGuard | null>(null)

const token = ref<{
  tokenId: string,
  creatorAddress: string,
}>({
  tokenId: '',
  creatorAddress: '',
})

const tab = ref('token')
const bcmr = ref<Bcmr>(bcmrTemplate)
const bcmrCreationOption = ref<{ option: 'fetch' | 'create', fetchURL?: string }>({ option: 'fetch', fetchURL: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json' })
const enableBcmrEditor = ref(false)
const openBcmrFetchOrCreateDialog = ref(false) // ?? this should be a wizard

onMounted(async () => {
  const { creator, tokenId } = route.query
  token.value.creatorAddress = String(creator)
  token.value.tokenId = String(tokenId)
  bcmrCreationOption.value.fetchURL = 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
  await initAuthChainGuard()
})

/**
 * Create an instance of AuthChainGuard
 */
const initAuthChainGuard = async () => {
  if (!authChainGuard.value) {
    const creatorWallet = await WalletClass.watchOnly(user.connectedPaytacaAddress)
    authChainGuard.value = new AuthChainGuard(user.connectedPaytacaAddress, creatorWallet.getPublicKeyHash(false), creatorWallet.network)
  }
}

// methods

const authchainPublish = async () => {
  ui.busy({ text: 'Updating BCMR', type: 'info' })
  const creatorWallet = await WalletClass.watchOnly(user.connectedPaytacaAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)
  const authChainGuard = new AuthChainGuard(user.connectedPaytacaAddress, creatorWalletPkh, creatorWallet.network)
  const bcmrRawString = JSON.stringify(bcmr.value);
  let bcmrUrl = 'https://'
  if (typeof (bcmr.value.registryIdentity) !== 'string') {
    bcmrUrl = bcmr.value.registryIdentity.uris?.registry || ''
  }
  try {
    const tx = await authChainGuard.publish(bcmrRawString, bcmrUrl)
    if (tx) {
      ui.idle()
      ui.setMessage({ type: 'success', text: `Bcmr Update Success! tx: ${tx}`, timeout: 5000 })
    }

  } catch (error) {
    console.log(error)
  }
}

const authchainTransfer = async () => { console.log('TODO') }
const authchainBurn = async () => { console.log('TODO') }

const fetchBcmr = async () => {
  try {
    ui.busy({ text: `Fetching BCMR from ${bcmrCreationOption.value.fetchURL}`, type: 'info' })
    const r = await fetch(bcmrCreationOption.value.fetchURL!)
    bcmr.value = await r.json()
    enableBcmrEditor.value = true
    openBcmrFetchOrCreateDialog.value = false
    ui.idle()
    ui.setMessage({ text: 'BCMR download success, check the BCMR Tab', type: 'success', timeout: 5 })
    tab.value = 'bcmr'
  } catch (error) {
    ui.idle()
    ui.setMessage({ text: 'Failed to fetch BCMR, make sure the URL is correct', type: 'error', timeout: 5 })
    console.log(error)
    enableBcmrEditor.value = false
    openBcmrFetchOrCreateDialog.value = false
  }
}

const createBcmr = async () => {
  enableBcmrEditor.value = true
  bcmr.value = bcmrTemplate
  tab.value = 'bcmr'
  openBcmrFetchOrCreateDialog.value = false
}
</script>

