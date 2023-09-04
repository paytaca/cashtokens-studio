<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title>
        <slot name="title">Token Genesis</slot>

      </q-toolbar-title>
    </q-toolbar>
    <template v-if="genesisInput">
      <q-input :model-value="genesisInput.txid" label="Token ID(Category)" :filled="true" disable dense square />
      <q-input :model-value="authKey.token?.tokenId || authKey.txid" label="Auth Key" :filled="true" disable dense
        square />
      <template v-if="tokenType === 'ft' || tokenType === 'fnft'">
        <q-input v-model="genesisToken.amount" label="Maximum Supply" :filled="true" dense square>
          <template v-slot:append>
            <q-btn color="primary" dense flat @click="genesisToken.amount = MAX_FUNGIBLE_AMOUNT" label="Max" />
          </template>
        </q-input>
        <q-input v-model="genesisTokenMetadata.decimals" label="Decimals" :filled="true" dense square />
      </template>
      <template v-if="tokenType === 'nft' || tokenType === 'fnft'">
        <q-input v-model="genesisToken.commitment" label="Token Commitment" :filled="true" dense square />
        <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'">
          Capability <sup><code>{{ genesisToken.capability }}</code></sup>
          <q-option-group name="preferred_genre" v-model="genesisToken.capability" :options="[
            { value: NFTCapability.minting, label: 'Minting' },
            { value: NFTCapability.mutable, label: 'Mutable' },
            { value: NFTCapability.none, label: 'None' }
          ]" color="primary" inline />
        </div>
      </template>

      <q-input v-model="genesisTokenMetadata.symbol" label="Token Symbol" :filled="true" dense square />

      <q-uploader @uploaded="onTokenIconUpload" field-name="icon" label="Token Icon"
        :url="`api/tokens/icon/upload?tokenId=${genesisInput.txid}`" auto-upload flat dense square size="sm"
        style="width:100%" class="q-mx-xs" />
    </template>
    <div class="row justify-end q-my-lg">
      <BusyButton v-if="genesisInput" @click="createToken" :busy-label="cashToken?.processing" label="Create Token"
        :disable="!user.wallet || !genesisInput" color="primary" />
    </div>
  </q-form>
</template>
<script setup lang="ts">
import { NFTCapability, UtxoI, Wallet } from 'mainnet-js'
import { useQuasar } from 'quasar'
import { watch, onMounted, ref, computed } from 'vue'
import { useUser } from 'src/stores/user'
import { AuthKey, CashToken, MAX_FUNGIBLE_AMOUNT } from 'src/app'
import BusyButton from 'src/components/BusyButton.vue'
import shortenAddress from 'src/app/utils/shortenAddress'
import shortenTokenId from 'src/app/utils/shortenTokenId'
import { Bcmr } from 'src/app/bcmr/Bcmr'
import { BcmrStorageArtifact } from 'src/app/types'

const props = defineProps<{
  tokenType: 'ft' | 'nft' | 'fnft',
  genesisInput: UtxoI,
  authKey: AuthKey,
  /**
   * If true OR undefined, this operation will also create a new AuthKey.
   * authKey.utxo is used as genesis input for the AuthKey token genesis.
   * The cash token is then lock using the new AuthKey.
   * AuthKey.txid will be used as AuthGuard.
   *
   * If false (createAuthKey === false), AuthKey should be an existing token
   * The cash token will be locked using the AuthKey's.token.tokenId
   *
   */
  createAuthKey?: boolean,
  ownerWallet: Wallet
}>()

const genesisToken = ref<{
  tokenId: string,
  amount: string | number,
  capability: NFTCapability | undefined
  commitment: string | undefined
}>({
  amount: 0,
  tokenId: props.genesisInput.txid,
  capability: undefined,
  commitment: undefined
})

const genesisTokenMetadata = ref<{
  icon: string,
  symbol: string,
  decimals: number,
  iconUris: { https: string, ipfs: string }
}>({
  icon: '',
  symbol: '',
  decimals: 0,
  iconUris: {
    https: '',
    ipfs: ''
  }
})

const cashToken = ref<CashToken>()
const $q = useQuasar()
const user = useUser()

onMounted(() => {
  if (props.tokenType === 'nft') {
    genesisToken.value.capability = NFTCapability.minting
  }
})

const onTokenIconUpload = (info: any) => {
  try {
    const serverResponse = JSON.parse(info.xhr.responseText)
    genesisTokenMetadata.value.iconUris = serverResponse.iconUris
  } catch (error) {

  }
}

const createToken = async () => {
  try {

    // Store initial registry

    const bcmr = new Bcmr({
      version: { major: 0, minor: 1, patch: 0 },
      registryIdentity: genesisToken.value.tokenId,
      latestRevision: new Date().toISOString()
    })

    bcmr.setRegistryName(`Registry of ${genesisTokenMetadata.value.symbol || genesisToken.value.tokenId}`)
    bcmr.setTokenSymbol(genesisTokenMetadata.value.symbol)
    if (genesisTokenMetadata.value.decimals) {
      bcmr.setTokenDecimals(genesisTokenMetadata.value.decimals)
    }
    if (genesisTokenMetadata.value.iconUris.https) {
      bcmr.addIconUri(genesisTokenMetadata.value.iconUris.https)
    } else if (genesisTokenMetadata.value.iconUris.ipfs) {
      bcmr.addIconUri(genesisTokenMetadata.value.iconUris.ipfs)
    }

    cashToken.value = new CashToken({ ...props.genesisInput, authKey: props.authKey, ownerWallet: props.ownerWallet })
    cashToken.value.processing = 'Creating registry'

    let storageArtifact: BcmrStorageArtifact | undefined
    try {
      storageArtifact = await bcmr.storeRegistry()
    } catch (error) {
      console.log(error)
      // TODO, tell user that there was an error storing the BCMR, try again
      return
    }

    cashToken.value.processing = 'Registry created!'

    cashToken.value.registry = {
      uri: [storageArtifact!.uris.https, storageArtifact!.uris.ipfs],
      contentHash: storageArtifact!.contentHash
    }

    const tx = await cashToken.value.createGenesis({
      amount: genesisToken.value.amount,
      capability: genesisToken.value.capability,
      commitment: genesisToken.value.commitment,
      includeAuthKeyGenesis: props.createAuthKey === false ? false : true
    })
    if (tx) {
      // $q.notify({ type: 'positive', message: 'Success!Token created.Tx=' + shortenTokenId(tx) })
      $q.notify({ type: 'positive', message: 'Success!Token created.Tx=' + tx })
      if (!user.tokens) {
        user.tokens = []
      }
      user.tokens?.push(cashToken.value)
    }
  } catch (error: any) {
    $q.notify({ type: 'negative', message: 'Txn Failed!' + error.message })
  }
}
</script>
