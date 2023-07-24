<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<template>
  <q-page>
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 col-lg-8">
        <div class="row inline items-center q-gutter-lg">
          <div class="items-center justify-center q-px-xl">
            <q-skeleton v-if="!token.identity?.uris?.icon" type="QAvatar" size="8em"></q-skeleton>
            <q-avatar v-else size="8em">
              <img :src="token.identity?.uris?.icon" alt="">
            </q-avatar>
          </div>
          <div>
            <div>
              <q-skeleton v-if="loading" type="text" height="3em"></q-skeleton>
              <span v-else>Token: {{ token.identity?.name || 'Unknown' }}</span>
            </div>
            <div>
              <q-skeleton v-if="loading" type="text" height="3em"></q-skeleton>
              <span v-else>Symbol: <q-badge outline color="orange" :label="token.identity?.token?.symbol" /></span>
            </div>
            <div>
              <q-skeleton v-if="loading" type="text" height="3em"></q-skeleton>
              <span v-else>Decimals: {{ token.identity?.token?.decimals }}</span>
            </div>
            <div>
              <q-skeleton v-if="loading" type="text" height="3em"></q-skeleton>
              <span v-else>
                Category (Token Id): {{ token.id?.replace(token.id.substring(15, 45), '...') }}
              </span>
            </div>
            <!-- <div class="ellipsis-2-lines">
              Manager: {{
                token.creator?.replace(token.creator.substring(15, 35), '...') }}
            </div> -->
            <div v-if="token.identity?.uris">
              <div v-for="k, i in Object.keys(token.identity?.uris)" :key="i">
                <div v-if="k === 'icon'">
                  Icon: <q-avatar size="sm">
                    <img :src="token.identity?.uris[k]" />
                  </q-avatar>
                </div>
                <span v-else>
                  {{ k }}: {{ token.identity?.uris[k] }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="token.identity?.description">
          <q-banner rounded dense>
            <p>{{ token.identity.description }}</p>
          </q-banner>
        </div>
        <div class="row justify-end">
          <q-btn icon="settings" size="md">
            <q-menu>
              <q-list>
                <q-item clickable v-close-popup @click="menu = 'authchain-publish'">Publish Registry Update</q-item>
                <q-item clickable v-close-popup @click="menu = 'authchain-transfer'">Transfer Ownership</q-item>
                <q-item clickable v-close-popup @click="menu = 'authchain-burn'">Burn Identity</q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
        <q-separator></q-separator>
        <div v-if="menu == 'authchain-publish'" class="row justify-center">
          <div class="col-12 justify-start q-my-sm">
            <i class="text-h6">Publish Registry</i>
          </div>
          <div class="col-12 justify-start">Current Registry</div>
          <q-input :filled="true" v-model="registryUrl" type="url" :rules="[v => v.length > 7 || 'Invalid URL']"
            label="Registry URL" class="col-12" dense square></q-input>
          <q-input v-if="registry" :filled="true"
            :model-value="binToHex(sha256.hash(utf8ToBin(JSON.stringify(registry))))" type="url" label="Content Hash"
            class="col-12" dense square disable></q-input>
          <div v-if="registryModified" class="col-12 justify-start q-mt-lg">Registry Modified (New Value)</div>
          <q-input v-if="registryModified" :filled="true"
            :model-value="binToHex(sha256.hash(utf8ToBin(JSON.stringify(bcmrStore.value))))" type="url"
            label="New Content Hash" class="col-12" dense square disable></q-input>
          <div class="row col-12">
            <q-btn size="xs" icon="cloud_download" round @click="fetchRegistry">
              <q-tooltip>Fetch and load a new or updated registry from the above remote URL</q-tooltip>
            </q-btn>
            <q-btn v-if="registry" icon="edit" size="xs" round @click="editRegistry">
              <q-tooltip>Edit the currently loaded registry</q-tooltip>
            </q-btn>
            <q-btn v-if="registry" icon="delete" size="xs" color="red" round @click="registry = null">
              <q-tooltip>Delete the loaded registry</q-tooltip>
            </q-btn>
            <q-btn type="a" :href="registryDownloadHref" download="bitcoin-cash-metadata-registy.json" icon="download"
              size="xs" round>
              <q-tooltip>Download the currently loaded registry to your computer so you can upload it to a
                server</q-tooltip>
            </q-btn>
          </div>
          <div class="row col-12 justify-end">
            <q-btn size="lg" color="primary" :disable="!registry || !registryUrl" @click="authchainPublishRegistry">
              Publish
            </q-btn>
          </div>
        </div>
        <div v-if="menu == 'authchain-transfer'" class="row justify-center">
          <div class="col-12 justify-start q-my-sm">
            <i class="text-h6">Transfer Authchain Ownership</i>
          </div>
          <q-input :filled="true" v-model="newOwnerAddress" type="url" :rules="[v => v.length > 49 || 'Invalid Address']"
            label="New owner's address" class="col-12" dense square></q-input>
          <div class="row col-12 justify-end">
            <q-btn size="lg" color="primary" :disable="!newOwnerAddress" @click="authchainTransfer">
              Confirm Transfer
            </q-btn>
          </div>
        </div>
        <div v-if="menu == 'authchain-burn'" class="row justify-center">
          <div class="col-12 justify-start q-my-sm">
            <i class="text-h6">Are you sure you want to burn this token's authchain?</i>
          </div>
          <div class="row col-12 justify-end q-gutter-sm">
            <q-btn size="lg" color="negative" @click="() => { menu = '' }">
              No
            </q-btn>
            <q-btn size="lg" color="secondary" @click="authchainBurn">
              Yes
            </q-btn>
          </div>
        </div>
      </div>
    </div>

  </q-page>
</template>

<script setup lang="ts">

import { useQuasar } from 'quasar'
import { ref, onMounted, watch, computed, toValue } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { BCMR, Network, hexToBin } from 'mainnet-js'
import { utf8ToBin, binToHex, sha256 } from '@bitauth/libauth'
import { Registry as Bcmr, IdentitySnapshot } from 'src/interfaces/bcmr-v2.schema'
import useStore from 'src/composables/useStore'
import getWalletClass from 'src/utils/getWalletClass'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import fetchAuthChainAuthheadFromChaingraph from 'src/utils/fetchAuthChainAuthheadFromChaingraph'

defineOptions({ name: 'ViewFt' })

const WalletClass = getWalletClass()
const $q = useQuasar()
const { user, ui, bcmr: bcmrStore } = useStore()
const route = useRoute()
const router = useRouter()
const authChainGuard = ref<AuthChainGuard | null>(null)

const registry = ref<Bcmr | null>(null)
const registryUrl = ref<string>('')
const newOwnerAddress = ref<string>('')

const menu = ref<'' | 'authchain-publish' | 'authchain-transfer' | 'authchain-burn'>('authchain-publish')
const loading = ref<boolean>(true)

const token = computed<{ id?: string, creator?: string, identity?: IdentitySnapshot | null }>(() => {
  const { creator, tokenId } = route.query
  let _token: { id: string, creator: string, identity?: IdentitySnapshot | null } = {
    id: tokenId as string,
    creator: creator as string
  }
  if (tokenId && registry.value) {
    if (registry.value.identities) {
      let identityHistory = registry.value.identities[_token.id]
      let identityHistories = Object.keys(identityHistory)
      _token.identity = registry.value.identities[_token.id][identityHistories[identityHistories.length - 1]]
    }
  }
  return _token
})


const registryDownloadHref = computed(() => {
  if (bcmrStore.value) {
    return `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(bcmrStore.value))}`
  }
  return `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(registry))}`
})

const registryModified = computed(() => {
  return bcmrStore.value && binToHex(sha256.hash(utf8ToBin(JSON.stringify(bcmrStore.value)))) != binToHex(sha256.hash(utf8ToBin(JSON.stringify(registry))))
})

onMounted(async () => {

  // if (ui.loadedRegistry && ui.loadedRegistryUpdated) {
  //   console.log('UI', ui.loadedRegistry)
  //   // registry.value = Object.assign({}, ui.loadedRegistry)
  //   let r = Object.assign({}, JSON.parse(JSON.stringify(ui.loadedRegistry)))
  //   console.log(r)
  //   registry.value = r
  //   return
  // }

  const { creator, tokenId } = route.query
  token.value.id = tokenId as string
  token.value.creator = creator as string

  try {
    if (token.value.id) {
      ui.busy({ text: 'Loading token details from registry...', type: 'info' })
      const authhead = await fetchAuthChainAuthheadFromChaingraph({ chaingraphUrl: 'https://gql.chaingraph.pat.mn/v1/graphql', transactionHash: tokenId as string, network: 'chipnet' })
      // console.log(authchain) // TODO USE THIS, IT'S ALREADY PARSED
      // let authheadResponse: Response = await fetchAuthhead(token.value.id, user.walletNetworkType)
      // let authheadJson: { data: { transaction: [{ authchains: [{ migrations: [{ transaction: [{ hash: string, locktime: string, version: string, inputs: [any], outputs: [{ output_index: string, locking_bytecode: string }] }] }] }] }] } } = await authheadResponse.json()
      // let authhead = authheadJson.data?.transaction[0].authchains[0].migrations[0].transaction[0].outputs[0]
      // console.log('AUTHHEAD', authheadJson)
      // // \x6a0442434d52 + 40 + <32 bytes = 64 chars>
      // let uris: string[] | string = binToUtf8(hexToBin(authhead.locking_bytecode).slice(8 + 2 + 64))
      // uris = uris.split(' ')
      // if (authhead) {
      //   let tokenRegistryUri = uris[0] // 73 start index of URI's
      //   if (tokenRegistryUri) {
      //     console.log(tokenRegistryUri)
      //     // dirty, assumes uri is valid, and only assumes https://
      //     // TODO: improve, handle other URI protocol
      //     let url = 'https://' + tokenRegistryUri
      //     // TODO: add check if url is valid or check pre-flight stats
      //     let registryFetchResponse = await fetch(url)
      //     registry.value = await registryFetchResponse.json()
      //     // TODO: Update token page, based on this loaded registry, added error handled
      //   }
      // }
      if (authhead[0] && authhead[0].httpsUrl) {
        let registryReqResp = await fetch(authhead[0].httpsUrl)
        registry.value = await registryReqResp.json()
        registryUrl.value = authhead[0].httpsUrl
        console.log('authhead', authhead[0])
      }
    }
    loading.value = false
    ui.idle()
  } catch (error) {
    console.log('Error fetching authhead from chaingraph', error)
  }
  await initAuthChainGuard()
})

onBeforeRouteLeave((to) => {
  if (!String(to.name).startsWith('registry')) {
    delete ui.loadedRegistry
    delete ui.loadedRegistryUpdated
    bcmrStore.value = null
  }
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
const editRegistry = () => {
  if (registry.value) {
    bcmrStore.value = registry.value
    router.push({ name: 'registry-edit', query: { callback: String(route.name), tokenId: token.value.id } })
  }
}

const authchainPublishRegistry = async () => {
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

const authchainTransfer = async () => {
  if (!registry.value) {
    return ui.setMessage({ text: 'Invalid BCMR', type: 'error', timeout: 10 })
  }
  try {
    ui.busy({ text: 'Publishing registry', type: 'info' })
    console.log(authChainGuard.value)
    const tx = await authChainGuard.value?.transfer(newOwnerAddress.value)
    ui.idle()
    ui.setMessage({ text: 'Registry publication success, tx:' + tx, type: 'success', timeout: 5 })
  } catch (error) {
    ui.idle()
    console.log(error)
    ui.setMessage({ text: 'Error publishing registry', type: 'error', timeout: 10 })
  }
}

const authchainBurn = async () => {
  try {

    const dismiss = $q.notify({ spinner: true, message: 'Burning token\'s identity output...', color: 'info', timeout: 0 })
    const tx = await authChainGuard.value?.burn(token.value.id as string)
    dismiss()
    if (tx) {
      $q.notify({ color: 'positive', message: 'Token identity output burned! ' + tx })
      router.push('/token/browse')
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error burning identity output!' })
    console.log(error)
  }

}

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

