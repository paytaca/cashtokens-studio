<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<template>
  <q-page class="justify-center q-mx-lg q-gutter-sm" style="min-height:100vh; max-width:100vw">
    <div class="row items-center q-gutter-lg">
      <div class="col">
        <q-skeleton v-if="!token.identity?.uris?.icon" type="QAvatar" size="8em"></q-skeleton>
        <q-avatar v-else class="col" size="8em">
          <img :src="token.identity?.uris?.icon" alt="">
        </q-avatar>
      </div>
      <div class="col">
        <div>Token: {{ token.identity?.name || 'Unknown' }}</div>
        <div>Symbol: {{ token.identity?.token?.symbol }}</div>
        <div class="ellipsis-2-lines">Id: {{ token.id?.replace(token.id.substring(15, 45), '...') }}</div>
        <div class="ellipsis-2-lines">Manager: {{
          token.creator?.replace(token.creator.substring(15, 35), '...') }}
        </div>
        <div v-if="token.identity?.uris">
          <div v-for="k, i in Object.keys(token.identity?.uris)" :key="i">
            {{ k }}: {{ token.identity?.uris[k] }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="token.identity?.description">
      <p>{{ token.identity.description }}</p>
    </div>
    <div class="row justify-end">
      <q-btn icon="settings" size="md">
        <q-menu>
          <q-list>
            <q-item clickable v-close-popup>Publish Registry Update</q-item>
            <q-item clickable v-close-popup>Transfer Ownership</q-item>
            <q-item clickable v-close-popup>Burn Identity</q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <q-separator></q-separator>
    <div v-if="menu == 'authchain-publish'" class="row justify-center">
      <div class="col-12 justify-start q-my-sm">
        <i class="text-h6">Publish Registry</i>
      </div>

      <q-input :filled="true" v-model="registryUrl" type="url" :rules="[v => v.length > 7 || 'Invalid URL']"
        label="Registry URL" class="col-12" dense square></q-input>
      <div class="row col-12">
        <q-btn color="primary" size="xs" class="q-mr-xs" outline @click="fetchRegistry">
          Fetch Registry
          <q-tooltip>Fetch an existing registry from the above URL</q-tooltip>
        </q-btn>
        <q-btn color="primary" size="xs" outline @click="() => { console.log('TODO') }">
          Create New Registry
          <q-tooltip>Create a new registry and publish the above URL </q-tooltip>
        </q-btn>
      </div>
      <div class="row col-12 justify-end">
        <q-btn size="lg" color="primary" :disable="!registry" @click="authchainPublishRegistry">Publish Update</q-btn>
      </div>
    </div>
    <!-- <div class="row q-my-xs justify-end">
      <q-btn icon="settings"></q-btn>
      <q-btn color="primary" size="md" @click.stop="authchainPublishRegistry">Update Registry</q-btn>
      <q-btn color="primary" size="md" @click.stop="authchainTransfer">Transfer Ownership</q-btn>
      <q-btn color="primary" size="md" @click.stop="authchainBurn">Burn</q-btn>
    </div> -->
  </q-page>
</template>

<script setup lang="ts">

import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { hexToBin } from 'mainnet-js'
import { binToUtf8 } from '@bitauth/libauth'
import { Registry as Bcmr, IdentitySnapshot, URIs } from 'src/interfaces/bcmr-v2.schema'
import useStore from 'src/composables/useStore'
import getWalletClass from 'src/utils/getWalletClass'
import AuthChainGuard from 'src/classes/AuthChainGuard'
import fetchAuthhead from 'src/utils/fetchAuthhead'

defineOptions({ name: 'ViewFt' })

const WalletClass = getWalletClass()
const { user, ui } = useStore()
const route = useRoute()
const authChainGuard = ref<AuthChainGuard | null>(null)

const token = ref<{ id?: string, creator?: string, identity?: IdentitySnapshot | null }>({})
const registry = ref<Bcmr | null>(null)
const registryUrl = ref<string>('')
const menu = ref<'authchain-publish' | 'authchain-transfer' | 'authchain-burn'>('authchain-publish')

watch(() => registry.value, (r) => {
  if (r) {
    // parse registry and populate page
    console.log('REGISTRY', r)
    let identityHistory
    if (token.value?.id && r.identities) {
      identityHistory = r.identities[token.value.id]
      if (identityHistory) {
        let identityHistories = Object.keys(identityHistory)
        token.value.identity = r.identities[token.value.id][identityHistories[identityHistories.length - 1]] // always get the last history
      }
    }
  }
})

onMounted(async () => {
  const { creator, tokenId } = route.query
  token.value.id = tokenId as string
  token.value.creator = creator as string

  try {
    if (token.value.id) {
      let authheadResponse: Response = await fetchAuthhead(token.value.id, user.walletNetworkType)
      let authheadJson: { data: { transaction: [{ authchains: [{ migrations: [{ transaction: [{ hash: string, inputs: [any], outputs: [{ output_index: string, locking_bytecode: string }] }] }] }] }] } } = await authheadResponse.json()
      let authhead = authheadJson.data?.transaction[0].authchains[0].migrations[0].transaction[0].outputs[0]
      const op_returnAndBCMR = '\\x6a0442434d5220'
      const registryHash = authhead.locking_bytecode.replace(op_returnAndBCMR, '').slice(0, 64)
      let uris: string[] | string = authhead.locking_bytecode.replace(op_returnAndBCMR + registryHash, '')
      uris = uris.substring(4, uris.length) // Remove the first 2 bytes, this is just the length of the uris
      uris = uris.split('20') // split by spaces(20 = byte representation of space)
      if (authhead) {
        let tokenRegistryUri = binToUtf8(hexToBin(uris[0])) // 73 start index of URI's
        if (tokenRegistryUri) {
          // dirty, assumes uri is valid, and only assumes https://
          // TODO: improve, handle other URI protocol
          let url = 'https://' + tokenRegistryUri
          // TODO: add check if url is valid or check pre-flight stats
          let registryFetchResponse = await fetch(url)
          registry.value = await registryFetchResponse.json()
          // TODO: Update token page, based on this loaded registry, added error handled
        }
      }
    }

  } catch (error) {
    console.log('Error fetching authhead from chaingraph', error)
  }

  await initAuthChainGuard()
})

/**
 * Create an instance of AuthChainGuard
 */
const initAuthChainGuard = async () => {
  if (!authChainGuard.value) {
    const creatorWallet = await WalletClass.watchOnly(user.connectedPaytacaAddress as string)
    authChainGuard.value = new AuthChainGuard(user.connectedPaytacaAddress as string, creatorWallet.getPublicKeyHash(false), creatorWallet.network)
  }
}

// methods
const authchainPublishRegistry = async () => {
  console.log('Publishing registry')
  authChainGuard.value
  if (!registry.value) {
    return ui.setMessage({ text: 'Invalid BCMR', type: 'error', timeout: 10 })
  }
  try {
    ui.busy({ text: 'Publishing registry', type: 'info' })
    const tx = await authChainGuard.value?.publish(JSON.stringify(registry.value), registryUrl.value)
    ui.idle()
    ui.setMessage({ text: 'Registry publication success, tx:' + tx, type: 'success', timeout: 5 })
  } catch (error) {
    ui.idle()
    console.log(error)
    ui.setMessage({ text: 'Error publishing registry', type: 'error', timeout: 10 })
  }

}

const authchainTransfer = async () => { console.log('TODO') }
const authchainBurn = async () => { console.log('TODO') }

const fetchRegistry = async () => {
  try {
    ui.busy({ text: `Fetching registry from ${registryUrl.value}`, type: 'info' })
    const r = await fetch(registryUrl.value)
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
</script>

