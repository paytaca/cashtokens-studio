<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <q-page>
    <div class="row justify-center q-gutter-md q-mx-sm q-pa-sm">
      <TokenThumbnail v-for="t, i in tokenThumbnails" :token-id="t.tokenId" :icon="t.icon" :name="t.name"
        :symbol="t.symbol" :key="i" class="col-xs-12 col-sm-3 col-md-2">
      </TokenThumbnail>
      <TokenThumbnailSkeleton v-if="loadingRegistries" class="col-xs-12 col-md-2 col-lg-2" />
      <TokenCreateThumbnail path="/token/create" class="col-xs-12 col-md-2 col-lg-2" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { AuthChainElement, UtxoI } from 'mainnet-js'
import { Registry as Bcmr } from 'src/interfaces/bcmr-v2.schema'
import getWalletClass from 'src/utils/getWalletClass'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import useStore from 'src/composables/useStore'
import fetchAuthChainAuthheadFromChaingraph from 'src/utils/fetchAuthChainAuthheadFromChaingraph'
import TokenThumbnail from 'src/components/TokenThumbnail.vue'
import TokenCreateThumbnail from 'src/components/TokenCreateThumbnail.vue'
import TokenThumbnailSkeleton from 'src/components/skeletons/TokenThumbnail.vue'
import unresolvedBcmrTemplate from 'src/bcmr/unresolved.js'

defineOptions({ name: 'BrowseTokens' })

const { user, ui } = useStore()
const loadingRegistries = ref<boolean>(false)
const tokenIdentities = ref<AuthChainElement[]>([])
const tokenRegistries = ref<Bcmr[]>([])
const tokenThumbnails = computed(() => {
  type t = { tokenId: string, icon?: string, name: string, symbol?: string }
  let thumbs: t[] = []
  tokenRegistries.value.forEach((r: Bcmr) => {
    let tt: t = { tokenId: '', name: '' }
    let identity: any = r.registryIdentity
    if (typeof (r.registryIdentity) === 'string') { // is authbase
      tt.tokenId = r.registryIdentity
      if (r.identities) {
        let identitySnapshot = r.identities[r.registryIdentity]
        if (identitySnapshot) {
          let identityHistory = Object.keys(identitySnapshot)[0]
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

onMounted(async () => {
  if (user.connectedPaytacaAddress) {
    // Load from store, then try to refresh
    loadTokenIdentityOutputs(user.connectedPaytacaAddress)
  }
})

const loadTokenIdentityOutputs = async (creatorAddress: string) => {
  ui.busy({ type: 'info', text: 'Loading tokens...' })
  loadingRegistries.value = true
  const IDENTITY = '6964656e74697479'
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(creatorAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)
  const authChainGuard = new AuthChainGuard(user.connectedPaytacaAddress as string, creatorWalletPkh, creatorWallet.network)
  const authchainGuardContract = authChainGuard.contract
  const autchainGuardWallet = await WalletClass.watchOnly(authchainGuardContract.getDepositAddress())
  const identities = (await autchainGuardWallet.getAddressUtxos()).filter((u: UtxoI) => Boolean(u.token?.tokenId) && u.token?.commitment == IDENTITY)
  const tokenIdentitiesLoaded = new Promise((res) => {
    let counter = 0
    identities.forEach(async (i: UtxoI) => {
      let authchain: AuthChainElement[] = await fetchAuthChainAuthheadFromChaingraph({
        chaingraphUrl: 'https://gql.chaingraph.pat.mn/v1/graphql',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        transactionHash: i.token!.tokenId!,
        network: user.walletNetworkType
      })
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
  const tokenRegistriesLoaded = new Promise((res) => {
    let counter = 0
    tokenIdentities.value.forEach(async (i: AuthChainElement) => {
      try {
        let resp = await fetch(i.httpsUrl)
        let reg: Bcmr = await resp.json()
        tokenRegistries.value?.push(reg)
      } catch (error) {
        console.log(error)
        let id = identities.find(id => id.txid === i.txHash)
        let fillerTokenId = 'na'
        if (id?.token?.tokenId) {
          fillerTokenId = id.token.tokenId
        }
        let filler: Bcmr = unresolvedBcmrTemplate
        filler.registryIdentity = fillerTokenId as string
        if (filler.identities && fillerTokenId !== 'na') {
          // filling token id
          filler.identities[fillerTokenId] = filler.identities['na']
          filler.identities[fillerTokenId][new Date().toISOString()] = filler.identities['na']['latestRevision']
          delete filler.identities['na']['latestRevision']
        }
        tokenRegistries.value?.push(filler)
      }
      counter++
      if (counter >= tokenIdentities.value.length) {
        res(true)
      }
    })
  })

  await tokenRegistriesLoaded
  loadingRegistries.value = false
  ui.idle()
}

</script>
