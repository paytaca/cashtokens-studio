<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<template>
  <q-page class="q-pt-xl">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 col-lg-8">
        <div class="row items-center q-gutter-lg">
          <div class="col">
            <!-- if offchain registry identity -->
            <!-- if onchain registry identity-->
            <div v-if="typeof (registryIdentity) === 'string' || loading" class="row">
              <div class="col-xs-12 col-sm-2 row items-center justify-center">
                <q-card v-if="identitySnapshot?.uris?.icon || loading">
                  <q-skeleton v-if="loading" size="6em" type="QAvatar" round>
                  </q-skeleton>
                  <q-avatar v-else size="6em">
                    <img :src="identitySnapshot?.uris?.icon" alt="">
                  </q-avatar>
                </q-card>
              </div>

              <!-- TokenCategory -->
              <div v-if="identitySnapshot?.token" class="col-xs-12 col-sm-10 q-pa-sm q-pl-xl items-center">
                <div>
                  Category:
                  <q-skeleton v-if="loading" type="text" width="60%"></q-skeleton>
                  <code>{{ identitySnapshot.token.category.replace(identitySnapshot.token.category.substring(5, 59), '...') }}</code>
                  <q-btn icon="content_copy" size="xs" @click.stop="() => console.log('copying')" rounded flat dense>
                  </q-btn>
                </div>
                <div>
                  Symbol:
                  <q-skeleton v-if="loading" type="text" width="60%"></q-skeleton>
                  <q-chip color="orange" outline>
                    <strong>{{ identitySnapshot.token.symbol }}</strong>
                  </q-chip>
                </div>
                <div>
                  Decimals:
                  <q-skeleton v-if="loading" type="text" width="60%"></q-skeleton>
                  {{ identitySnapshot.token.decimals || 0 }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row justify-end">
          <q-btn icon="more_vert" size="sm" round flat>
            <q-menu>
              <q-list>
                <q-item clickable v-close-popup @click="menu = 'authchain-publish'">Publish Registry Update</q-item>
                <q-item clickable v-close-popup @click="menu = 'authchain-transfer'">Transfer Ownership</q-item>
                <q-item clickable v-close-popup @click="menu = 'authchain-burn'">Burn Identity Output</q-item>
                <q-item clickable v-close-popup @click="menu = 'authchain-release'">Release Identity Output</q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
        <q-separator></q-separator>
        <!-- Token Registry Action Pane -->
        <div v-if="menu == ''" class="row justify-center q-gutter-sm">
          <!-- display complete registry details -->
          <div class="col-xs-12 text-left q-py-sm">{ BCMR }</div>
          <q-markup-table class="col-xs-12" flat bordered dense>
            <thead>
              <tr>
                <th class="text-left">Registry Identity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
                  {{ registryIdentity }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
          <q-markup-table class="col-xs-12" flat bordered dense>
            <thead>
              <tr>
                <th class="text-left" aria-colspan="2" colspan="2">Identity Snapshot</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Timestamp</td>
                <td>
                  <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
                  {{ identitySnapshotHistoryTimestamp }}
                </td>

              </tr>
              <tr>
                <td>Name</td>
                <td>
                  <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
                  {{ identitySnapshot?.name }}
                </td>
              </tr>
              <tr>
                <td>Description</td>
                <td>
                  <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
                  {{ identitySnapshot?.description }}
                </td>

              </tr>
              <tr v-if="identitySnapshot?.uris">
                <td>URIs</td>
                <td>
                  <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
                  <a v-for="uriName, i in Object.keys(identitySnapshot?.uris || {})"
                    :href="identitySnapshot?.uris[uriName]" target="_blank" :key="'uri-name-' + i" class="q-mr-sm">
                    {{ uriName }}
                  </a>

                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>

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
        <div v-if="menu == 'authchain-release'" class="row justify-center">
          <div class="col-12 justify-start q-my-lg">
            <p>All tokens created in Cashtokens Studio creates an authchain identity output locked with an
              <code>AuthChainGuard</code> contract. This is to avoid accidental misuse of the identity output(utxo)
              thereby breaking the
              token's authchain.
            </p>
            <i>
              If you are sure you want to release the token's identity output from the <code>AuthChainGuard</code>
              contract, enter a recipient address to "release" it to, then click 'Release'.
            </i>
          </div>
          <q-input :filled="true" v-model="newOwnerAddress" type="url" :rules="[v => v.length > 49 || 'Invalid Address']"
            label="Recipient token address" class="col-12" dense square></q-input>
          <div class="row col-12 justify-end q-gutter-sm">
            <q-btn size="lg" color="negative" @click="() => { menu = '' }">
              Cancel
            </q-btn>
            <q-btn size="lg" color="secondary" @click="authchainRelease">
              Release
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
import { Registry as Bcmr, IdentitySnapshot, OffChainRegistryIdentity, URIs } from 'src/interfaces/bcmr-v2.schema'
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

const menu = ref<'' | 'authchain-publish' | 'authchain-transfer' | 'authchain-burn' | 'authchain-release'>('')
const loading = ref<boolean>(true)

const registryIdentity = computed<OffChainRegistryIdentity | string | undefined>(() => registry.value?.registryIdentity)

/**
 * This might be too expensive we should only concern ourselves with the IdentitySnapshot of the registryIdentity
 */
const identities = computed<Bcmr['identities'] | null>(() => {
  if (typeof (registryIdentity.value) === 'string' && registry.value?.identities) {
    return registry.value.identities
  }
  return null
})

const identitySnapshotHistoryTimestamp = computed<string | null>(() => {
  if (identities.value && typeof (registryIdentity.value) === 'string') {
    return Object.keys(identities.value[registryIdentity.value])[0]
  }
  return null
})

const identitySnapshot = computed<IdentitySnapshot | null>(() => {
  if (identities.value && identitySnapshotHistoryTimestamp.value && typeof (registryIdentity.value) === 'string') {
    return identities.value[registryIdentity.value][identitySnapshotHistoryTimestamp.value]
  }
  return null
})

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


watch(menu, (selectedMenu) => {
  if (selectedMenu === 'authchain-release' && user.connectedPaytacaAddress) {
    // make the connected user the default recipient, when releasing authchain
    newOwnerAddress.value = user.connectedPaytacaAddress
  }
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
      // ui.busy({ text: 'Loading token details from registry...', type: 'info' })
      $q.notify({ message: 'Loading token details...', color: 'info', spinner: true })
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

const authchainRelease = async () => {
  console.log('Releasing')
  let dismiss
  try {
    if (!newOwnerAddress.value) {
      return $q.notify({ message: 'Recipient required!', color: 'negative', timeout: 2000 })
    }
    const recipientWallet = await getWalletClass().watchOnly(newOwnerAddress.value)

    dismiss = $q.notify({ spinner: true, message: 'Releasing token\'s identity output from authchain guard...', color: 'info', timeout: 0 })
    const tx = await authChainGuard.value?.release(token.value.id as string, recipientWallet.tokenaddr as string)
    if (tx) {
      $q.notify({ color: 'positive', message: 'Authchain identity output released to: ' + newOwnerAddress.value })
      $q.notify({ color: 'info', message: 'Tx: ' + tx })
      router.push('/token/browse')
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error releasing identity output!' })
    console.log(error)
  } finally {
    if (dismiss) {
      dismiss()
    }
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

