<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <q-page>
    <div class="row justify-left q-gutter-md q-ma-md">
      <q-card v-for="ft, i in createdFtsComputed" :key="i" class="token-card col-xs-12 col-sm-6 col-md-4 col-lg-2">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span><strong>Token </strong></span>{{ i }}</q-toolbar-title>
        </q-toolbar>
        <q-card-section>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Id: </span>
            <span class="token-id text-weight-thin">{{
              ft.token?.tokenId.replace(ft.token?.tokenId.substring(8, ft.token?.tokenId.length - 4), '...') }}
            </span>
          </div>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Amount: </span><span>{{ ft.token?.amount }}</span>
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn color="primary"
            @click="$router.push(`/token/view?tokenId=${ft.token!.tokenId}&creator=${user.connectedPaytacaAddress}`)">View
            Details</q-btn>
        </q-card-actions>
      </q-card>
      {{ tokenThumbnails }}
      <TokenThumbnail v-for="r, i in tokenThumbnails" :icon="r.icon" :key="i"></TokenThumbnail>
      <TokenThumbnailSkeleton v-if="loadingRegistries" />
      <q-card class="token-card col-xs-12 col-sm-6 col-md-4 col-lg-2" style="font-size:xx-large;cursor:pointer"
        @click="router.push('/token/create')">
        <q-card-section class="justify-center">
          + Create New
        </q-card-section>
      </q-card>
      <!-- {{createdFts}} -->
    </div>
  </q-page>
</template>

<style scoped lang="scss">
.token-id {
  background-color: $grey-10;
  border-radius: 25px;
  padding: .5em;
}

.token-card {
  max-width: 20em;
}
</style>

<script setup lang="ts">

import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AuthChainElement, UtxoI } from 'mainnet-js'
import { Registry as Bcmr } from 'src/interfaces/bcmr-v2.schema'
import getWalletClass from 'src/utils/getWalletClass'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import useStore from 'src/composables/useStore'
import fetchAuthChainAuthheadFromChaingraph from 'src/utils/fetchAuthChainAuthheadFromChaingraph'
import TokenThumbnailSkeleton from 'src/components/skeletons/TokenThumbnail.vue'

defineOptions({ name: 'BrowseTokens' })

const router = useRouter()
const { user, ui } = useStore()
const loadingRegistries = ref<boolean>(false)
const tokenIdentities = ref<AuthChainElement[]>([])
const tokenRegistries = ref<Bcmr[]>([])
const createdFts = ref([] as UtxoI[])
const createdFtsComputed = computed<UtxoI[]>(() => {
  return createdFts.value
})

const tokenThumbnails = computed(() => {
  type t = { icon?: string, name: string, symbol?: string }
  let thumbs: t[] = []
  tokenRegistries.value.forEach((r: Bcmr) => {
    let tt: t = { name: '' }
    let identity: any = r.registryIdentity
    if (typeof (r.registryIdentity) === 'string') { // is authbase
      if (r.identities) {
        let identitySnapshot = r.identities[r.registryIdentity]
        if (identitySnapshot) {
          let identityHistory = Object.keys(identity)[0]
          if (identityHistory) {
            identity = r.identities[r.registryIdentity][identityHistory]
          }
        }
      }
    }
    tt.name = identity.name
    tt.symbol = identity.token?.symbol
    tt.icon = identity.uris?.icon
    thumbs.push(tt)
  })
  return thumbs
})

watch(() => user.connectedPaytacaAddress as string, (address: string) => {
  if (address.length > 0) {
    loadCreatedFts(address)
  } else {
    createdFts.value = [] as UtxoI[]
  }
})

onMounted(async () => {
  console.log('USER', user.connectedPaytacaAddress)
  if (user.connectedPaytacaAddress) {
    // Load from store, then try to refresh
    createdFts.value.push(...user.createdFts)
    ui.busy({ type: 'info', text: 'Loading manageable FTs' })
    loadTokenIdentityOutputs(user.connectedPaytacaAddress)
    // loadCreatedFts(user.connectedPaytacaAddress)
  }
})

// methods
const loadCreatedFts = async (creatorAddress: string) => {
  ui.busy({ type: 'info', text: 'Loading connected wallet\'s manageable FTs' })
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(creatorAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)

  const authChainGuard = new AuthChainGuard(user.connectedPaytacaAddress as string, creatorWalletPkh, creatorWallet.network)
  const authchainGuardContract = authChainGuard.contract
  const autchainGuardWallet = await WalletClass.watchOnly(authchainGuardContract.getDepositAddress())
  // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain, @typescript-eslint/no-non-null-assertion
  const creatorFts = (await creatorWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(utxo.token) && utxo.token?.amount! > 0)
  if (creatorFts.length === 0) {
    ui.idle()
    return
  }

  console.log('A', await autchainGuardWallet.getAddressUtxos())

  const authchainIdentityOutputs = (await autchainGuardWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token))
  let createdFtsFresh: any[] = []
  let creatorFtsTokenIdsSet = new Set(creatorFts.map((utxo: UtxoI) => utxo.token?.tokenId))
  let authchainIdentityOutputsSet = new Set(authchainIdentityOutputs.map((utxo: UtxoI) => utxo.txid))

  console.log(creatorFtsTokenIdsSet)
  console.log(authchainIdentityOutputs)
  let ftsLoaded = new Promise((res) => {
    let counter = 0
    creatorFtsTokenIdsSet.forEach(async (tokenId) => {
      const response = await fetch(
        'https://gql.chaingraph.pat.mn/v1/graphql',
        {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            operationName: null,
            variables: {},
            // eslint-disable-next-line quotes
            /* chaingraph authhead query*/
            // eslint-disable-next-line quotes
            query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%chipnet%\"}}}}){hash authchains{authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          })
        })

      let responseJson = await response.json()

      if (responseJson) {
        const thisTokenIdsAuthChain = responseJson.data?.transaction?.find((tx: any) => tx.hash.toString().replace('\\x', '') === tokenId)
        console.log('authchain', thisTokenIdsAuthChain)
        if (thisTokenIdsAuthChain) {
          let authchain = thisTokenIdsAuthChain.authchains[0]
          let authhead
          if (authchain.migrations && authchain.migrations[0]) {
            authhead = authchain.migrations[0]
            // if the tx of this authhead is in our authchain guards utxo set we can manage it
            let copy = new Set(authchainIdentityOutputsSet)
            copy.add(authhead.transaction[0]?.hash?.replace('\\x', ''))
            if (copy.size === authchainIdentityOutputsSet.size) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              let created = creatorFts.find((utxo: UtxoI) => utxo.token!.tokenId === tokenId)
              if (created) {
                createdFtsFresh.push(created)
                console.log('created fts fresh', createdFtsFresh)
              }
            }
          }
        }
      }
      counter++
      if (counter >= creatorFtsTokenIdsSet.size) {
        res(true)
      }
    })
  })

  await ftsLoaded
  console.log(createdFtsFresh)
  if (createdFtsFresh.length > 0) {

    createdFts.value.splice(0, createdFts.value.length)
    createdFts.value.push(...createdFtsFresh)
  }

  user.createdFts = createdFtsFresh
  ui.idle()

}

const loadTokenIdentityOutputs = async (creatorAddress: string) => {
  loadingRegistries.value = true
  const IDENTITY = '6964656e74697479'
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(creatorAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)
  const authChainGuard = new AuthChainGuard(user.connectedPaytacaAddress as string, creatorWalletPkh, creatorWallet.network)
  const authchainGuardContract = authChainGuard.contract
  const autchainGuardWallet = await WalletClass.watchOnly(authchainGuardContract.getDepositAddress())
  const identities = (await autchainGuardWallet.getAddressUtxos()).filter((u: UtxoI) => Boolean(u.token?.tokenId) && u.token?.commitment == IDENTITY)
  console.log(identities)
  const tokenIdentitiesLoaded = new Promise((res) => {
    let counter = 0
    identities.forEach(async (i: UtxoI) => {
      let authchain: AuthChainElement[] = await fetchAuthChainAuthheadFromChaingraph({
        chaingraphUrl: 'https://gql.chaingraph.pat.mn/v1/graphql',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        transactionHash: i.token!.tokenId!,
        network: user.walletNetworkType
      })
      console.log(authchain)
      if (authchain) {
        tokenIdentities.value.push(authchain[0])
      }
      counter++
      if (counter >= identities.length) {
        res(true)
      }
    })
  })

  await tokenIdentitiesLoaded
  console.log(tokenRegistries)
  const tokenRegistriesLoaded = new Promise((res) => {
    let counter = 0
    tokenIdentities.value.forEach(async (i: AuthChainElement) => {
      let resp = await fetch(i.httpsUrl)
      let reg: Bcmr = await resp.json()
      tokenRegistries.value?.push(reg)
      counter++
      if (counter >= tokenIdentities.value.length) {
        res(true)
      }
    })
  })

  await tokenRegistriesLoaded
  loadingRegistries.value = false

}

</script>
