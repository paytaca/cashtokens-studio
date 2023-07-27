<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <q-page class="q-pa-lg" style="position:relative;">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 col-lg-8">
        <div v-if="!ui.innerLoader.show" class="row justify-center q-gutter-md q-mx-sm q-mb-lg">
          <q-btn v-for="f, i in ['fungible', 'nonfungible', 'hybrid']" :key="'browser-filter-' + i"
            :outline="filter == f ? false : true" color="primary" size="sm" rounded @click="() => onFilter(f)">
            {{ f }}
          </q-btn>
        </div>
        <div v-if="!ui.innerLoader.show && identityOutputs.length === 0" class="row justify-center q-gutter-md q-mx-sm">
          Your address has no token identity UTXO...
        </div>
      </div>
      <div v-for="iot, i in identityOutputThumbnails" :key="'identity-output-' + i" class="q-ma-sm">
        <IdentityOutputThumbnail v-if="iot.tokenId" :token-id="iot.tokenId" :icon="iot.icon" :symbol="iot.symbol"
          :loading="iot.loading" />
      </div>
    </div>
    <q-inner-loading :showing="ui.innerLoader.show" :label="ui.innerLoader.label" label-class="text-teal"
      label-style="font-size: 1.1em" />
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AuthChainElement, UtxoI } from 'mainnet-js'
import { Registry as Bcmr } from 'src/bcmr/bcmr-v2.schema'
import getWalletClass from 'src/utils/getWalletClass'
import AuthChainGuard from 'src/contracts/AuthChainGuard'
import useStore from 'src/composables/useStore'
import fetchAuthChainAuthheadFromChaingraph from 'src/utils/fetchAuthChainAuthheadFromChaingraph'
import IdentityOutputThumbnail from 'src/components/IdentityOutputThumbnail.vue'
import constants from 'src/constants'
import { TokenType } from 'src/types'

defineOptions({ name: 'TokenIdentities' })

const { user, ui } = useStore()
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const filter = ref<TokenType>(route.params.tokenType as TokenType)
const identityOutputs = ref<UtxoI[]>([] as UtxoI[])
const identityOutputThumbnails = ref<{ tokenId: string, icon?: string, symbol?: string, loading?: boolean }[]>()
const identityOutputThumbnailsLength = computed<number>(() => {
  if (identityOutputThumbnails.value) {
    return identityOutputThumbnails.value.length
  }
  return 0
})
const authheads = ref<AuthChainElement[]>([])

/**
 * After scanning for identity outputs, check for registry publications of each tokenId.
 */
watch(identityOutputThumbnailsLength, async (newV) => {
  if (newV && newV === identityOutputs.value.length) {
    // Get the identity output's authhead (not really authhead but last publication)
    await downloadAuthheads()
    await downloadRegistriesAndUpdateThumbnails()
  }
})

onMounted(async () => {
  if (user.connectedPaytacaAddress) {
    scanUserWalletForIdentityOutputs()
  }
})

/**
 * Checks and downloads registry publications for each identity outputs.
 */
const downloadAuthheads = async () => {
  const authHeadPromise = new Promise((res) => {
    // When all thumbnails are created, try to load the icons and symbols
    let ctr = 0
    identityOutputs.value.forEach(async (u: UtxoI) => {
      let authchain: AuthChainElement[] = await fetchAuthChainAuthheadFromChaingraph({
        chaingraphUrl: 'https://gql.chaingraph.pat.mn/v1/graphql',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        transactionHash: u.token!.tokenId!,
        network: user.walletNetworkType
      })
      if (authchain[0]) { // authhead with OP_RETURN found
        authheads.value.push(authchain[0])
      }
      ctr++
      if (ctr === identityOutputs.value.length) {
        res(true)
      }
    })
  })
  await authHeadPromise
}

/**
 * Updates some values on the thumbnails
 */
const updateIdentityOutputThumbnail = (param: { tokenId: string, icon?: string, symbol?: string }) => {
  let t = identityOutputThumbnails.value?.find(iot => iot.tokenId === param.tokenId)
  if (t) {
    t.icon = param.icon
    t.symbol = param.symbol
    t.loading = false
  }
}

const downloadRegistriesAndUpdateThumbnails = async () => {
  identityOutputs.value.forEach(async (u) => {
    if (u.token?.tokenId) {
      let authhead = authheads.value.find((a: AuthChainElement) => a.txHash === u.txid)
      if (authhead) {
        try {
          let r = await fetch(authhead.httpsUrl)
          let rJson: any = await r.json()
          let { icon, symbol } = parseBcmr(rJson as Bcmr)
          return updateIdentityOutputThumbnail({ tokenId: u.token?.tokenId, icon, symbol })
        } catch (error) {
          console.log(`Error fetching registry from ${authhead.httpsUrl}`)
          console.log(error)
        }
      }
      updateIdentityOutputThumbnail({ tokenId: u.token?.tokenId })
    }
  })
}

/**
 * A thumbnail for each identity output
 */
const createIdentityOutputThumbnails = (identityOutputs: UtxoI[]) => {
  identityOutputs.forEach((u) => {
    if (!identityOutputThumbnails.value) {
      identityOutputThumbnails.value = []
    }
    if (u.token) {
      identityOutputThumbnails.value.push({ tokenId: u.token.tokenId, loading: true }) // loading because we have yet to fetch the icons and symbol
    }
  })
}
/**
 * Checks wallet if there are identity output utxos that's made by cashtokens studio
 */
const scanUserWalletForIdentityOutputs = async () => {
  ui.showInnerLoader('Scanning your address for token identity outputs...')
  if (user.wallet) {
    const creatorPkh = user.wallet?.getPublicKeyHash(false)
    const authChainGuard = new AuthChainGuard(user.connectedPaytacaAddress as string, creatorPkh, user.wallet.network)
    const autchainGuardWallet = await getWalletClass().watchOnly(authChainGuard.contract.getTokenDepositAddress())
    identityOutputs.value = (await autchainGuardWallet.getAddressUtxos()).filter((u: UtxoI) => Boolean(u.token?.tokenId) && u.token?.commitment == constants.IDENTITY)
    if (identityOutputs.value.length === 0) {
      return $q.notify({ message: 'No token identity output found on your address!', color: 'warning', timeout: 0 })
    }
    createIdentityOutputThumbnails(identityOutputs.value)
  }
  ui.hideInnerLoader()
}


/**
 * Parse the bcmr for some values.
 * @dev Just add values to parse if needed in the future
 */
const parseBcmr = (r: Bcmr): { icon?: string, symbol?: string } => {
  let v: { icon?: string, symbol?: string } = {}
  let identity: any = r.registryIdentity
  if (typeof (r.registryIdentity) === 'string') { // is authbase
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
  // TODO: handle if r.registryIdentity is an offchain registry
  v.icon = identity.uris?.icon
  v.symbol = identity.token?.symbol
  return v
}

const onFilter = (f: TokenType) => {
  filter.value = f
  router.push(`/token/browse/${f}`)
}
</script>
