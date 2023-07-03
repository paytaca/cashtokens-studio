<template>
  <q-page class="q-pa-md q-ma-sm" style="min-height: 100vh">
    <div>
      <div class="text-h6 q-mb-md">Viewing FT</div>
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
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
              <q-input :filled="true" dark:color="lime" v-model="token.creatorAddress" label="Creator's address" disable></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col q-gutter-sm">
              <q-btn color="primary" size="md" @click.stop="updateBcmr">Transfer Ownership</q-btn>
              <q-btn color="primary" size="md" @click.stop="openBcmrFetchOrCreateDialog = true">Update Bcmr</q-btn>
              <q-btn color="primary" size="md" @click.stop="updateBcmr">Burn</q-btn>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="bcmr">
          <div class="row text-h5 q-mb-md">
            <div class="col">
              <div>BCMR</div>
              <q-btn @click="publishBcmrUpdate">Publish Update</q-btn>
            </div>
          </div>

          <JsonEditor v-model="bcmr" :darkTheme="$q.dark.isActive"/>
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
                  <q-input color="lime" :filled="true" standout bottom-slots v-model="bcmrCreationOption.fetchURL" label="Enter BCMR URL" clearable></q-input>
                </div>
              </div>
              <div class="row justify-end">
                <div class="col-12 text-right q-gutter-sm q-pt-xs">
                  <q-btn color="primary" size="sm" @click="fetchBcmr">Fetch Updated BCMR</q-btn>
                  <q-btn color="primary" size="sm" @click="createBcmr">Create New</q-btn>
                </div>
                <!-- <q-btn color="primary" size="xs">Fetch</q-btn>
                <q-btn color="primary" size="xs">Create New</q-btn> -->
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">

import { sha256, utf8ToBin, binToHex, } from '@bitauth/libauth'
import { hexToBin, OpReturnData } from 'mainnet-js'
import JsonEditor from 'vue3-ts-jsoneditor'
import { ref, onMounted} from 'vue'
import { useRoute } from 'vue-router'
// import { UtxoI } from 'mainnet-js'
import { SignatureTemplate } from 'cashscript';

import { Registry as Bcmr} from 'src/interfaces/bcmr-v2.schema'
import getWalletClass from 'src/utils/getWalletClass'
// import { useUserStore } from 'src/stores/user'
import bcmrTemplate from 'src/resources/bcmr'
import { useUIStore } from 'src/stores/ui'
import createAuthChainGuardContract from 'src/utils/createAuthChainGuardContract'
import toCashScript from 'src/utils/toCashScript'

defineOptions({name: 'ViewFt'})

const route = useRoute()
// const user = useUserStore()
const ui = useUIStore()

const token = ref<{
  tokenId: string,
  creatorAddress: string,
  }>({
  tokenId: '',
  creatorAddress: '',
})

const tab = ref('token')
const bcmr = ref<Bcmr>(bcmrTemplate)
const bcmrCreationOption = ref<{option: 'fetch' | 'create', fetchURL?:string }>({option: 'fetch', fetchURL:'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'})
const enableBcmrEditor = ref(false)
// const openBcmrCreatorWizard = ref(false)
const openBcmrFetchOrCreateDialog = ref(false)


onMounted(async () => {
  const { creator, tokenId } = route.query
  token.value.creatorAddress = String(creator)
  token.value.tokenId = String(tokenId)
  bcmrCreationOption.value.fetchURL = 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
})

// methods
const publishBcmrUpdate = async () => {
  ui.busy({text: 'Updating BCMR', type: 'info'})
  let bcmrText = JSON.stringify(bcmr.value);
  let contentHash = sha256.hash(utf8ToBin(bcmrText))
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(token.value.creatorAddress!)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)
  const contract = createAuthChainGuardContract({
    ownerPubKey: creatorWalletPkh,
    network: creatorWallet.network,
  })

  const func = contract.getContractFunction("TransferOrUpdateOrBurn");
  let contractUtxos = (await contract.getUtxos()).filter(val => val.token?.tokenId === token.value.tokenId).map(toCashScript);
  let contractInput = contractUtxos[0];

  const ownerUtxo = (await creatorWallet.getAddressUtxos()).filter(val => !val.token && val.satoshis > 2000).map(toCashScript);
  const ownerInput = ownerUtxo[0]
  if (!ownerUtxo) {
    ui.setMessage({type: 'error', text: 'No suitable utxos found to fund transaction', timeout:10000})
    return;
  }

  const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
  
  let transaction
  let minerFee = 1000
  try{
    transaction = func(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)))
        .from(contractInput)
        // .fromP2PKH(ownerInput, sig)
    // // .from(contractInput)
    // // .fromP2PKH(ownerUtxo, sig)
        .to([
          // contract pass-by
          {
            to: contract.getTokenDepositAddress(),
            amount: contractInput.satoshis,
            token: contractInput.token,
          },
          ])
          .withOpReturn([
            "BCMR",
            binToHex(contentHash), // sha256 of the contents from the uri below
            bcmr.registryIdentity!.uris.registry.replace("https://", "")
          ])
          .to([{
            to: token.value.creatorAddress,
            amount: ownerUtxo.satoshis - BigInt(minerFee)
          }])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

  } catch {
    ui.setMessage({type: 'error', text: 'Failed to build withdraw transaction', timeout:10000})
    return;
  }
}

const fetchBcmr = async () => {
  try {
    ui.busy({text: `Fetching BCMR from ${bcmrCreationOption.value.fetchURL}`, type:'info'})
    const r = await fetch(bcmrCreationOption.value.fetchURL!)  
    bcmr.value = await r.json()
    enableBcmrEditor.value = true
    openBcmrFetchOrCreateDialog.value = false
    ui.idle()
    ui.setMessage({text: 'BCMR download success, check the BCMR Tab', type: 'success', timeout: 5})
    tab.value = 'bcmr'
  } catch (error) {
    ui.idle()
    ui.setMessage({text: 'Failed to fetch BCMR, make sure the URL is correct', type: 'error', timeout: 5})
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

