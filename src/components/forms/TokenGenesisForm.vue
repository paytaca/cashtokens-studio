<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title>
        <slot name="title">Token Genesis</slot>
      </q-toolbar-title>
    </q-toolbar>
    <template v-if="genesisInput">
      <q-input :model-value="genesisInput.txid" label="Token ID(Category)" :filled="true" disable dense />
      <q-input :model-value="authKey.token?.tokenId || authKey.txid" label="Auth Key" :filled="true" disable dense />
      <template v-if="tokenType === 'ft' || tokenType === 'fnft'">
        <q-input v-model="genesisToken.amount" label="Maximum Supply" :filled="true" dense bottom-slots>
          <template v-slot:append>
            <q-btn color="warning" dense flat @click="genesisToken.amount = MAX_FUNGIBLE_AMOUNT" label="Max" />
          </template>
          <template v-slot:hint>
            <div class="row justify-end text-italic" :class="isValidTokenAmount ? 'text-primary' : 'text-negative'">
              {{ tokenAmountWithDecimal }}
              {{ !isValidTokenAmount ? 'Invalid amount' : '' }}
            </div>
          </template>
        </q-input>
        <q-input v-model="genesisTokenMetadata.decimals" label="Decimals" :filled="true" dense />
      </template>
      <template v-if="tokenType === 'nft' || tokenType === 'fnft'">
        <q-input v-model="genesisToken.commitment" label="Token Commitment" :filled="true" dense />
        <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'">
          Capability <sup><code>{{ genesisToken.capability }}</code></sup>
          <q-option-group name="preferred_genre" v-model="genesisToken.capability" :options="[
            { value: NFTCapability.minting, label: 'Minting' },
            { value: NFTCapability.mutable, label: 'Mutable' },
            { value: NFTCapability.none, label: 'None' }
          ]" color="primary" inline />
        </div>
      </template>

      <q-input v-model="genesisTokenMetadata.name" label="Token Name" :filled="true" dense />
      <q-input v-model="genesisTokenMetadata.description" label="Description" :filled="true" dense />
      <q-input v-model="genesisTokenMetadata.symbol" label="Token Symbol" :filled="true" input-class="text-uppercase"
        :rules="[v => /^[A-Z0-9]+[-A-Z0-9]*$/.test(v.toUpperCase()) || 'Invalid symbol, value must be allcaps and starts with a letter (A to Z 0 to 9 and -)']"
        dense>
      </q-input>
      <q-uploader @uploaded="onTokenIconUpload" field-name="icon" label="Token Icon"
        :url="`api/tokens/icon/upload?tokenId=${genesisInput.txid}`" auto-upload flat dense size="sm"
        style="width:100%;max-width: 100%;" class="q-mx-xs" />
      <div v-if="genesisTokenMetadata.iconUris.https" class="row justify-end">
        <q-btn :href="genesisTokenMetadata.iconUris.https" label="View Icon Location" target="_blank" dense flat no-caps
          color="secondary" icon="preview" />
      </div>
      <div v-if="bcmrStorageArtifact?.uris" class="row justify-end">
        <q-btn :href="bcmrStorageArtifact.uris.https" label="View Registry" target="_blank" dense flat no-caps
          color="secondary" icon="preview" />
        <q-btn label="Download Registry" type="a" dense flat no-caps color="secondary" icon="cloud_download"
          @click="downloadBcmr" />
      </div>
    </template>
    <div class="row justify-end q-my-lg">
      <BusyButton v-if="genesisInput" @click="createToken" :busy-label="cashToken?.processing" label="Create Token"
        :disable="!user.wallet || !genesisInput || cashToken?.processing || !isValidTokenAmount" color="primary" />
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
import bcmrV2Sample from 'src/app/bcmr/bcmr-v2.sample'

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
  amount: string | number,   // actual  amount that will be sent 
  capability: NFTCapability | undefined
  commitment: string | undefined,
}>({
  amount: props.tokenType === 'ft' ? 1 : 0,
  tokenId: props.genesisInput.txid,
  capability: undefined,
  commitment: undefined
})

const genesisTokenMetadata = ref<{
  name: string,
  description: string,
  icon: string,
  symbol: string,
  decimals: number,
  iconUris: { https: string, ipfs: string }
}>({
  name: '',
  description: '',
  icon: '',
  symbol: '',
  decimals: 0,
  iconUris: {
    https: '',
    ipfs: ''
  }
})

const bcmr = ref<Bcmr>()
const bcmrStorageArtifact = ref<BcmrStorageArtifact>()


const tokenAmountWithDecimal = computed<string>(() => {
  if (Number(genesisTokenMetadata.value.decimals) > 0) {
    return `${genesisToken.value.amount.toString()}.`.padEnd(`${genesisToken.value.amount.toString()}`.length + Number(genesisTokenMetadata.value.decimals) + 1, '0')
  }
  return `${genesisToken.value.amount.toString()}`
})

const isValidTokenAmount = computed<boolean>(() => {
  if (!tokenAmountWithDecimal.value) {
    return false
  }
  if (tokenAmountWithDecimal.value.replace('.', '').length > 19) {
    return false
  }
  if (Number(tokenAmountWithDecimal.value.replace('.', '')) > Number(MAX_FUNGIBLE_AMOUNT)) {
    return false
  }
  if (Number(tokenAmountWithDecimal.value) <= 0) {
    return false
  }
  return true
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
    console.log(error)
  }
}

const createToken = async () => {
  try {

    // Store initial registry

    bcmr.value = new Bcmr({
      version: { major: 0, minor: 1, patch: 0 },
      registryIdentity: genesisToken.value.tokenId,
      latestRevision: new Date().toISOString()
    })

    bcmr.value.setRegistryName(genesisTokenMetadata.value.name || `Registry of ${genesisTokenMetadata.value.symbol || genesisToken.value.tokenId}`)
    bcmr.value.setRegistryDescription(genesisTokenMetadata.value.description)
    bcmr.value.setTokenSymbol(genesisTokenMetadata.value.symbol)
    if (genesisTokenMetadata.value.decimals) {
      bcmr.value.setTokenDecimals(genesisTokenMetadata.value.decimals)
    }
    if (genesisTokenMetadata.value.iconUris.https) {
      bcmr.value.addIconUri(genesisTokenMetadata.value.iconUris.https)
    } else if (genesisTokenMetadata.value.iconUris.ipfs) {
      bcmr.value.addIconUri(genesisTokenMetadata.value.iconUris.ipfs)
    }

    cashToken.value = new CashToken({ ...props.genesisInput, authKey: props.authKey, ownerWallet: props.ownerWallet })
    cashToken.value.processing = 'Creating registry'

    console.log('BCMR', bcmr.value.getContent())
    // let storageArtifact: BcmrStorageArtifact | undefined
    try {
      bcmrStorageArtifact.value = await bcmr.value.storeRegistry()
      console.log('storage artifact:', bcmrStorageArtifact.value)
    } catch (error) {
      console.log(error)
      $q.notify({ type: 'negative', message: 'Failed to create registry.Please try again later!' })
      return
    }

    cashToken.value.processing = 'Registry created!'

    cashToken.value.registry = {
      uri: [bcmrStorageArtifact.value!.uris.https, bcmrStorageArtifact.value!.uris.ipfs],
      contentHash: bcmrStorageArtifact.value!.contentHash
    }

    const tx = await cashToken.value.createGenesis({
      amount: Number(tokenAmountWithDecimal.value.replace('.', '')),
      capability: genesisToken.value.capability,
      commitment: genesisToken.value.commitment,
      includeAuthKeyGenesis: props.createAuthKey === false ? false : true
    })
    if (tx) {
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

/**
 * Downloads the bcmr to users computer.
 * @dev This does not actually get the bcmr from the upload location, instead, 
 *      this just re-uses the bcmr content that was used during upload. To save
 *      on network request.
 *      
 */
const downloadBcmr = async () => {
  if (bcmrStorageArtifact.value?.uris.https && bcmr.value) {
    const blob = new Blob([bcmr.value.getContent()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bitcoin-cash-metadata-registry.json'; // Specify the desired file name with the appropriate extension
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

</script>
