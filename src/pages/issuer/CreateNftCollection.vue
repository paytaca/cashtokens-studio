<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 flex justify-center q-pt-lg">
        <div class="text-h4 text-center">Let's personalize your NFT collection</div>
      </div>
      <div class="col-xs-12 col-sm-8 col-md-6 q-mt-lg">
        <div class="row text-right">
          <div class="col-xs-12 q-mb-lg">
            Token Id
            <TokenCategory v-if="tokenGenesisInputUtxo" :token-id="tokenGenesisInputUtxo?.txid" />
            <span v-else>
              <BusyButton :busy-label="tokenGenesisInput?.processing" label="Create Genesis Input"
                @click="generateTokenGenesisInput" color="negative" size="md" dense no-caps />
              <q-icon name="info" class="q-ml-sm" @click.stop="tokenGenesisInputUtxoHelp" color="info">
                <q-tooltip>
                  Will create a suitable input for your token's genesis. Click for more info.
                </q-tooltip>
              </q-icon>
            </span>
          </div>
          <div class="col-xs-12 q-mb-lg">
            AuthKey Id
            <TokenCategory v-if="authKeyGenesisInputUtxo" :token-id="authKeyGenesisInputUtxo?.txid" size="sm" />
            <span v-else>
              <BusyButton :busy-label="authKeyGenesisInput?.processing" label="Create Genesis Input"
                @click="generateAuthKeyGenesisInput" color="negative" size="md" dense no-caps />
              <q-icon name="info" class="q-ml-sm" @click.stop="authKeyGenesisInputUtxoHelp" color="info">
                <q-tooltip>
                  Will create a suitable input for your token's AuthKey's genesis. Click for more info.
                </q-tooltip>
              </q-icon>
            </span>
          </div>
        </div>
        <div class="row" :class="disable ? 'disabled' : ''">
          <div class="col-xs-12 q-mb-lg">
            <q-uploader id="icon-uploader" ref="iconUploader" style="width:100%;" flat @uploaded="onTokenIconUpload"
              field-name="icon"
              :label="iconUploader?.uploadProgressLabel === '100.00%' ? 'Icon Uploaded' : 'Upload NFT Icon'"
              :url="`api/tokens/icon/upload?tokenId=1`" auto-upload size="lg" :disable="!tokenGenesisInputUtxo" />
          </div>

          <div class="col-xs-12">
            <div class="row items-center flex justify-between">
              <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                <label>Token Name</label>
                <q-input v-model="identitySnapshot.name" outlined></q-input>
              </div>
              <div class="col-xs-12 col-md-3 q-mb-lg q-gutter-y-sm items-center">
                <label>Token Symbol</label>
                <q-input v-model="identitySnapshot.token!.symbol" outlined></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm">
                <label>Description</label>
                <q-input v-model="identitySnapshot.description" label="Describe your NFT collection" outlined></q-input>
              </div>
              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center">
                <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'"
                  style="width:100%">
                  Capability <sup><code class="text-caption">{{ token.capability }}</code></sup>
                  <q-option-group name="preferred_genre" v-model="token.capability" :options="[
                    { value: NFTCapability.minting, label: 'Minting' },
                    { value: NFTCapability.mutable, label: 'Mutable' },
                    { value: NFTCapability.none, label: 'None' }
                  ]
                    " color="primary" inline :disable="Boolean(cashToken?.processing)" />
                </div>
              </div>

              <div class="col-xs-12 q-mb-lg q-gutter-y-sm items-center">
                <label class="text-h5">URIs</label>
                <div class="row">
                  <div v-if="identitySnapshot.uris!.icon" class="col-xs-12 q-mb-lg q-gutter-y-sm">
                    <label>Icon</label>
                    <q-input v-model="identitySnapshot.uris!.icon" outlined disable></q-input>
                  </div>
                  <div class="col-xs-12 q-mb-lg q-gutter-y-sm">
                    <label>Web</label>
                    <q-input v-model="identitySnapshot.uris!.web" outlined></q-input>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-xs-12 text-right">
            <!-- <q-btn color="primary" size="xl">Create NFT</q-btn> -->
            <BusyButton v-if="tokenGenesisInputUtxo" @click="createToken" :busy-label="cashToken?.processing"
              label="Create Token" :force-disable="iconUploader?.isUploading || !disable" color="primary" size="lg" />
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { TokenCategory as TokenCategoryType, Registry, IdentitySnapshot, URIs, TokenI, BCMR } from 'mainnet-js';
import { NFTCapability, UtxoI, Wallet, delay } from 'mainnet-js'
import { useQuasar } from 'quasar'
import { useUser } from 'src/stores/user'
import { AuthKey, CashToken, GenesisInput, MAX_FUNGIBLE_AMOUNT, Watchtower } from 'src/apps'
import BusyButton from 'src/components/BusyButton.vue'
import AddBcmrLinkDialog from 'src/components/dialogs/AddBcmrLinkDialog.vue'
import { Bcmr } from 'src/apps/bcmr/Bcmr'
import { BcmrStorageArtifact, NftCollectionType, TransactionSigner } from 'src/apps/types'
import { useStatusBar } from 'src/composables/useStatusBar'
import { useDialogs, useEventBus } from 'src/composables'
import convertBigIntToHexLE from "src/apps/utils/convertBigIntToHexLE"
import { buildAuthchain } from 'src/apps/globalfunctions'
import { shortenTx } from 'src/apps/utils'
import { useUI } from 'src/stores/ui'
import TokenCategory from 'src/components/TokenCategory.vue';
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletConnect } from 'src/composables/useWalletConnect';
import { usePaytacaConnect } from 'src/composables/usePaytacaConnect';


const ui = useUI()
const user = useUser()
const $q = useQuasar()
const { $ebus } = useEventBus()
const walletConnect = useWalletConnect()
const paytacaConnect = usePaytacaConnect()
const { setStatusProvider } = useStatusBar()
const { dialog, openDialog, hideDialog } = useDialogs()

const iconUploader = ref()
const tokenGenesisInput = ref<GenesisInput>(new GenesisInput({ vout: 0, satoshis: 0, txid: '' }))
const authKeyGenesisInput = ref<GenesisInput>(new GenesisInput({ vout: 0, satoshis: 0, txid: '' }))
const tokenGenesisInputUtxo = ref<UtxoI>()
const authKeyGenesisInputUtxo = ref<UtxoI>()

// Metadata
const registry = ref<Registry>({
  $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
  version: {
    major: 1,
    minor: 0,
    patch: 0
  },
  latestRevision: new Date().toISOString(),
  registryIdentity: ''
})

const identitySnapshot = ref<IdentitySnapshot>({
  name: '',
  description: '',
  uris: {
    icon: '',
    web: '',
    registry: ''
  },
  token: {
    category: '',
    symbol: '',
    decimals: 0
  }
})

const cashToken = ref<CashToken>()

// Create New AuthKey when creating new Token by default
const createAuthKey = ref<boolean>(true)

// The token to be created
const token = ref<TokenI>({
  amount: BigInt(0),
  tokenId: tokenGenesisInputUtxo.value?.txid || '',
  capability: NFTCapability.minting,
  commitment: ''
})

const tokenCommitmentFormat = ref<'hex' | 'decimal'>('hex')

const bcmrStorageArtifact = ref<BcmrStorageArtifact>()

const disable = ref<boolean>()

watch(() => user.genesisInputs, (value) => {
  if (value) {
    tokenGenesisInputUtxo.value = value[0]
    authKeyGenesisInputUtxo.value = value[1]
    disable.value = false
  }
  if (!value || value.length === 0) {
    tokenGenesisInputUtxo.value = undefined
    authKeyGenesisInputUtxo.value = undefined
  }
})
onMounted(() => {
  if (user.genesisInputs) {
    tokenGenesisInputUtxo.value = user.genesisInputs[0]
    authKeyGenesisInputUtxo.value = user.genesisInputs[1]
  }
  if (!tokenGenesisInputUtxo.value || !authKeyGenesisInput.value) {
    disableInputs()
  }

})

const disableInputs = () => {
  const inputs = document.querySelectorAll('.disabled input');
  // Disable each input element
  inputs.forEach(function (input) {
    if (input instanceof HTMLInputElement) {
      input.disabled = true;
    }
  });
}

const tokenGenesisInputUtxoHelp = () => {
  ui.setStatusMessage({
    statusMessage: `
      Creating a new token requires a "genesis input". A valid genesis input is just a utxo that is the
      first output(v-out 0) of a previous transaction. Just click the "CREATE GENESIS INPUT" button and we'll 
      create it for you.`,
    statusMessageType: 'info'
  })
}

const authKeyGenesisInputUtxoHelp = () => {
  ui.setStatusMessage({
    statusMessage: `
      CashTokens Studio is using an AuthGuard contract to secure or lock the token that you've created. To unlock 
      or spend this token you'd need another token which is called an AuthKey. The AuthGuard can only be unlocked  
      when you have the AuthKey. The AuthKey is just another token that will be created alongside your intended token.
      So we also need a "genesis input" to be able to create an AuthKey.`,
    statusMessageType: 'info'
  })
}

const onTokenIconUpload = (info: any) => {
  try {
    const serverResponse = JSON.parse(info.xhr.responseText)
    if (!identitySnapshot.value.uris) {
      identitySnapshot.value.uris = {}
    }
    identitySnapshot.value.uris.icon = serverResponse.iconUris?.https
    let iconUris: any = localStorage.getItem('iconUris')
    if (iconUris !== undefined && iconUris !== null) {
      iconUris = JSON.parse(iconUris)
    } else {
      iconUris = {}
    }
    iconUris[identitySnapshot.value.token!.category] = identitySnapshot.value.uris.icon
    localStorage.setItem('iconUris', iconUris)
  } catch (error) {
    console.log(error)
  }
}

const generateTokenGenesisInput = async () => {
  const transactionSigner: TransactionSigner = user.walletType === 'paytaca' ? paytacaConnect.paytacaTransactionSigner : walletConnect.walletConnectTransactionSigner
  tokenGenesisInput.value = new GenesisInput({ vout: 0, satoshis: 0, txid: '' }, transactionSigner)
  await generateGenesisInput(tokenGenesisInput)
}
const generateAuthKeyGenesisInput = async () => {
  const transactionSigner: TransactionSigner = user.walletType === 'paytaca' ? paytacaConnect.paytacaTransactionSigner : walletConnect.walletConnectTransactionSigner
  authKeyGenesisInput.value = new GenesisInput({ vout: 0, satoshis: 0, txid: '' }, transactionSigner)
  await generateGenesisInput(authKeyGenesisInput)
}

const generateGenesisInput = async (genesisInput: any) => {
  if (!user.wallet || !user.walletType) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }
  try {
    const tx = await genesisInput.value.generate(user.wallet! as Wallet, 1)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'GenesisInput.generate',
        timestamp: new Date().getTime(),
        successMsg: 'Generated genesis input(v-out 0 utxo)'
      })
    }
  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error'
    })
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }
}


const constructAndStoreBcmr = async () => {
  registry.value.registryIdentity = token.value.tokenId
  registry.value.latestRevision = new Date().toISOString()
  registry.value.identities = {
    [registry.value.registryIdentity]: {
      [registry.value.latestRevision]: identitySnapshot.value
    }
  }
  registry.value.extensions = {
    tokenStandard: "AuthGuard",
    authNft: authKeyGenesisInputUtxo.value!.txid
  }

  // if (genesisToken.value.commitment || genesisToken.value.capability) {
  //   const nft: NftType = {
  //     name: genesisTokenMetadata.value.name
  //   }
  //   let commitment = genesisToken.value.commitment
  //   if (commitment) {
  //     // will use commitment as types key in BCMR,
  //     // converting to hex little endian
  //     if (genesisToken.value.commitmentFormat === 'decimal') {
  //       nft.name += `-${commitment}`
  //       commitment = convertBigIntToHexLE(BigInt(commitment))
  //     }
  //     if (genesisToken.value.commitmentFormat === 'hex') {
  //       nft.name += `-${parseInt(commitment, 16)}`
  //       if (nftCollectionType.value === 'SequentialNftCollection') {
  //         commitment = parseInt(commitment, 16).toString()
  //         commitment = convertBigIntToHexLE(BigInt(commitment))
  //       }
  //     }
  //     bcmr.value.addNft(commitment, nft)
  //   }
  // }

  return await (new Bcmr(registry.value)).storeRegistry()
}


const createToken = async () => {
  disable.value = true
  if (tokenGenesisInputUtxo.value && authKeyGenesisInputUtxo.value) {
    const authKey = new AuthKey(authKeyGenesisInputUtxo.value)
    cashToken.value = new CashToken({ ...tokenGenesisInputUtxo.value!, authKey: authKey, ownerWallet: user.wallet as Wallet }, user.transactionSigner)
    try {
      cashToken.value.processing = 'Creating registry'
      bcmrStorageArtifact.value = await constructAndStoreBcmr()
      cashToken.value.processing = 'Registry created!'
    } catch (error) {
      console.log(error)
      $q.notify({ type: 'negative', message: 'Failed to create registry.Please try again later!' })
      return
    }

    try {
      cashToken.value.registry = {
        uri: [bcmrStorageArtifact.value!.uris.https, bcmrStorageArtifact.value!.uris.ipfs],
        contentHash: bcmrStorageArtifact.value!.contentHash
      }

      // We're initializing authKey's ownerWallet here 
      // because it's being used to initialize the AuthGuard contract
      cashToken.value.authKey!.ownerWallet = user.wallet as Wallet
      new Watchtower().subscribe(cashToken.value.authKey!.authGuard.contract!.getTokenDepositAddress())
      const tx = await cashToken.value.createGenesis({
        amount: BigInt(0),
        capability: token.value.capability,
        commitment: token.value.commitment,
        commitmentFormat: tokenCommitmentFormat.value,
        includeAuthKeyGenesis: createAuthKey.value === false ? false : true,
        walletType: user.walletType
        // walletConnectSession: user.walletConnectSession
      })
      new Watchtower().subscribe(cashToken.value.authKey!.authGuard.contract!.getTokenDepositAddress())
      if (tx) {
        $q.notify({ type: 'positive', message: 'Success!Token created.Tx=' + shortenTx(tx) })
        if (!user.tokens) {
          user.tokens = []
        }
        user.tokens?.push(cashToken.value)
        // setStatusProvider(cashToken.value)
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.createGenesis',
          timestamp: new Date().getTime(),
          successMsg: `Created ${identitySnapshot.value.token!.symbol} token (genesis)`
        })
        ui.setStatusMessage({
          statusMessage: `Created ${identitySnapshot.value.token!.symbol} token`,
          statusMessageType: 'success',
          statusMessageTxid: tx
        })
        await BCMR.buildAuthChain({ transactionHash: token.value.tokenId, network: user.wallet!.network })
      }
    } catch (error: any) {
      ui.setStatusMessage({
        statusMessage: error,
        statusMessageType: 'error'
      })
      return $q.notify({ type: 'negative', message: 'Txn Failed!' + error.message })
    }
  }

  disable.value = false
}

</script>
<style scoped>
input {
  margin-top: 1em;
}


.q-uploader__header {
  background-color: unset;
}
</style>
