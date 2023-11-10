<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm" :disable="cashToken?.processing">
    <q-toolbar>
      <q-toolbar-title class="text-h5 text-bold">
        <slot name="title">Create New Token</slot>
      </q-toolbar-title>
    </q-toolbar>
    <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'">
      Select a token type: <sup><code class="text-caption">{{ tType }}</code></sup>
      <q-option-group name="preferred_genre" v-model="tType" :options="[
        { value: 'ft', label: 'Fungible Token(FT)' },
        { value: 'nft', label: 'Non Fungible Token(NFT)' },
      ]
        " color="primary" inline :disable="Boolean(cashToken?.processing)" />
    </div>
    <template v-if="genesisInput">
      <q-input :model-value="genesisInput.txid" label="Token ID(Category)" filled disable dense />
      <q-input :model-value="authKey.token?.tokenId || authKey.txid" label="Auth Key" filled disable dense />
      <q-input ref="tokenNameRef" v-model="genesisTokenMetadata.name" label="Token Name *" filled dense aria-required
        :bottom-slots="Boolean(validationErrors.name)" :reactive-rules="true"
        @update:model-value="(v: any) => { validationErrors.name = /^[a-zA-Z0-9-\s]+[a-zA-Z-0-9-\s]*$/.test(v) ? '' : 'Token Name Required'; tokenNameRef?.validate(v) }">
        <template v-slot:hint>
          <!-- using hint slot for error, because error slot won't show -->
          <div class="text-negative">
            {{ validationErrors.name }}*
          </div>
        </template>
      </q-input>

      <q-input v-model="genesisTokenMetadata.description" label="Description" filled dense
        :disable="Boolean(cashToken?.processing)" />
      <q-input v-model="genesisTokenMetadata.symbol" label="Token Symbol *" filled input-class="text-uppercase"
        @update:model-value="(v: any) => validationErrors.symbol = /^[A-Z0-9]+[A-Z0-9-]*$/.test(v.toString().toUpperCase()) ? '' : 'Required, valid values = (A to Z 0 to 9 and/or -)'"
        :bottom-slots="Boolean(validationErrors.symbol)" dense :disable="Boolean(cashToken?.processing)">

        <template v-slot:hint>
          <!-- using hint slot for error, because error slot won't show -->
          <div class="text-negative">
            {{ validationErrors.symbol }}*
          </div>
        </template>

      </q-input>
      <template v-if="tType === 'ft' || tType === 'fnft'">
        <q-input v-model="genesisTokenMetadata.decimals" label="Decimals" filled dense
          :disable="Boolean(cashToken?.processing)" />
        <q-input v-model="genesisToken.amount" label="Maximum Supply" filled dense
          :disable="Boolean(cashToken?.processing)">
          <template v-slot:append>
            <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
              @click="setSupplyToMax" label="Max" />
          </template>
          <template v-slot:hint>
            {{ !isValidTokenAmount ? 'Invalid amount' : '' }}
          </template>
        </q-input>
        <div class="row justify-end" :class="isValidTokenAmount ? 'text-primary' : 'text-negative'">
          <div class="col">
            <div class="row">{{ !isValidTokenAmount ? 'Invalid amount' : '' }}</div>
            <div v-if="genesisToken.amount" class="row">
              <code>{{ tokenAmountWithDecimal }} <q-chip v-if="genesisTokenMetadata.symbol" class="text-uppercase" color="orange-10" size="sm" square outline>{{ genesisTokenMetadata.symbol }}</q-chip></code>
            </div>
            <!-- <div class="row">
              <code>Raw FT Amount: {{ tokenAmountWithDecimal.replace('.', '') }} <q-chip v-if="genesisTokenMetadata.symbol" class="text-uppercase" color="orange-10"  size="sm" square outline>{{ genesisTokenMetadata.symbol }}</q-chip></code>
            </div> -->
          </div>
        </div>
      </template>
      <template v-if="tType === 'nft' || tType === 'fnft'">
        <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'">
          Capability <sup><code class="text-caption">{{ genesisToken.capability }}</code></sup>
          <q-option-group name="preferred_genre" v-model="genesisToken.capability" :options="[
            { value: NFTCapability.minting, label: 'Minting' },
            { value: NFTCapability.mutable, label: 'Mutable' },
            { value: NFTCapability.none, label: 'None' }
          ]
            " color="primary" inline :disable="Boolean(cashToken?.processing)" />
        </div>
        <q-input v-if="genesisToken.capability === 'none'" v-model="genesisToken.commitment" label="Token Commitment"
          filled :placeholder="tokenCommmitmentPlaceholderText"
          :rules="[(v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value']" :disable="Boolean(cashToken?.processing)"
          dense stack-label>
          <template v-slot:prepend>
            <q-btn :label="genesisToken.commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm" no-caps
              :icon-right="genesisToken.commitmentFormat === 'decimal' ? 'pin' : undefined" />
          </template>
          <template v-slot:append>
            <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
              :class="$q.dark.isActive ? '' : 'text-black'"
              :label="genesisToken.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'" no-caps>
              <q-tooltip>
                {{
                  genesisToken.commitmentFormat === 'decimal' ? 'Click to value to hex'
                  : 'Click to convert value to a number'
                }}
              </q-tooltip>
            </q-btn>
          </template>
        </q-input>
        <div
          v-if="genesisToken.capability === 'none' && genesisToken.commitment && genesisToken.commitmentFormat === 'hex'"
          class="row justify-end items-center">
          <code>{{ convertBigIntToHexLE(BigInt(parseInt(genesisToken.commitment, 16))) }}</code>
          <i>(Raw commitment value)
            <q-icon name="info">
              <q-tooltip>The actual value on-chain.</q-tooltip>
            </q-icon>
          </i>
        </div>
        <div
          v-if="genesisToken.capability === 'none' && genesisToken.commitment && genesisToken.commitmentFormat === 'decimal'"
          class="row justify-end items-center">
          <code>{{ convertBigIntToHexLE(BigInt(genesisToken.commitment)) }}</code>
          <i>(Raw commitment value)
            <q-icon name="info">
              <q-tooltip>The actual value on-chain.</q-tooltip>
            </q-icon>
          </i>
        </div>
      </template>
      <q-input v-model="genesisTokenMetadata.website" label="Website" filled placeholder="https://"
        :disable="Boolean(cashToken?.processing)" dense>
        <template v-slot:prepend>
          <q-icon name="web" flat></q-icon>
        </template>
      </q-input>
      <div class="row justify-end items-center">
        <div v-if="genesisTokenMetadata.links">
          <span v-for="linkName, i in Object.keys(genesisTokenMetadata.links)" :key="'link-' + i">
            <!-- {{ Boolean(genesisTokenMetadata.links[linkName]) }} -->
            <span v-if="Boolean(genesisTokenMetadata.links[linkName])">
              <span v-if="linkName === 'youtube'">
                <q-icon name="smart_display" size="sm"></q-icon>
              </span>
              <span v-else-if="linkName === 'blog'">
                <q-icon name="book" size="sm"></q-icon>
              </span>
              <span v-else-if="linkName === 'twitter'">
                <q-icon name="clear" size="sm"></q-icon>
              </span>
              <span v-else>
                <q-icon :name="linkName" size="sm"></q-icon>
              </span>
            </span>
          </span>
        </div>
        <q-btn @click="openAddLinkDialog(AddBcmrLinkDialog.__name, {})"
          :label="!genesisTokenMetadata.links ? 'Add Links' : 'Edit Links'" color="secondary" dense flat
          :icon="!genesisTokenMetadata.links ? 'add' : undefined">
        </q-btn>
      </div>

      <div class="row justify-center">
        <q-uploader ref="iconUploader" @uploaded="onTokenIconUpload" field-name="icon"
          :label="iconUploader?.uploadProgressLabel === '100.00%' ? 'Icon Uploaded' : 'Upload Token Icon'"
          :url="`api/tokens/icon/upload?tokenId=${genesisInput.txid}`" auto-upload flat dense size="sm"
          style="width:100%;max-width: 100%;" :disable="Boolean(cashToken?.processing)" />
      </div>
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
      <BusyButton v-if="genesisInput" @click="createToken" :busy-label="busyButtonLabel" label="Create Token"
        :force-disable="(
          !user.wallet ||
          !genesisInput ||
          Boolean(busyButtonLabel) ||
          !isValidTokenAmount ||
          !genesisTokenMetadata.name ||
          !genesisTokenMetadata.symbol ||
          iconUploader?.isUploading
        )
          " color="primary" size="lg" />
    </div>
    <AddBcmrLinkDialog v-if="Boolean(bcmrLinkAdderDialog)" :model-value="bcmrLinkAdderDialog == AddBcmrLinkDialog.__name"
      @close="hideBcmrLinkAdderDialog" @confirm="(links) => {
        genesisTokenMetadata.links = links;
        hideBcmrLinkAdderDialog()
      }" persistent />
  </q-form>
</template>
<script setup lang="ts">
import { NFTCapability, UtxoI, Wallet, delay } from 'mainnet-js'
import { useQuasar } from 'quasar'
import { watch, onMounted, ref, computed, Ref, onUpdated } from 'vue'
import { useUser } from 'src/stores/user'
import { AuthKey, CashToken, MAX_FUNGIBLE_AMOUNT, Watchtower } from 'src/app'
import BusyButton from 'src/components/BusyButton.vue'
import AddBcmrLinkDialog from 'src/components/dialogs/AddBcmrLinkDialog.vue'
import { Bcmr } from 'src/app/bcmr/Bcmr'
import { BcmrStorageArtifact, NftCollectionType } from 'src/app/types'
import { useStatusBar } from 'src/composables/useStatusBar'
import { useDialogs, useEventBus } from 'src/composables'
import convertBigIntToHexLE from "src/app/utils/convertBigIntToHexLE"
import { buildAuthchain } from 'src/app/globalfunctions'
import { NftType, URIs } from 'src/app/bcmr/bcmr-v2.schema'
import { numberToTokeshi, shortenTx } from 'src/app/utils'
import { useUI } from 'src/stores/ui'
const props = defineProps<{
  tokenType: 'ft' | 'nft' | 'fnft', // deprecated
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

const emit = defineEmits<{
  (e: 'genesisResult', val: { txid: string, tokenSymbol?: string }): void
}>()

const { dialog: bcmrLinkAdderDialog, openDialog: openAddLinkDialog, hideDialog: hideBcmrLinkAdderDialog } = useDialogs()


const cashToken = ref<CashToken>()
const $q = useQuasar()
const user = useUser()
const ui = useUI()
const iconUploader = ref()
const { $ebus } = useEventBus()
const { setStatusProvider } = useStatusBar()
const tokenNameRef = ref<Ref | undefined | null>(null)
const tType = ref<'ft' | 'nft' | 'fnft'>(props.tokenType || 'ft')
const genesisToken = ref<{
  tokenId: string,
  amount: string | number,   // actual  amount that will be sent 
  capability: NFTCapability | undefined
  commitment: string | undefined,
  commitmentFormat: 'decimal' | 'hex'
}>({
  amount: tType.value === 'ft' ? 1 : 0,
  tokenId: props.genesisInput.txid,
  capability: undefined,
  commitment: '',
  commitmentFormat: 'decimal'
})


const genesisTokenMetadata = ref<{
  name: string,
  description: string,
  icon: string,
  symbol: string,
  decimals: number,
  iconUris: { https: string, ipfs: string },
  website: string,
  links?: URIs
}>({
  name: '',
  description: '',
  icon: '',
  symbol: '',
  decimals: 0,
  iconUris: {
    https: '',
    ipfs: ''
  },
  website: ''
})

const validationErrors = ref<{ name: string, symbol: string }>({
  name: '',
  symbol: ''
})

const nftCollectionType = ref<NftCollectionType>('SequentialNftCollection')

const tokenCommmitmentPlaceholderText = computed<string>(() => {
  if (nftCollectionType.value === 'SequentialNftCollection') {
    return 'Enter a number'
  }
  return 'Enter commitment'
})

const busyButtonLabel = computed<string | undefined>(() => {
  if (cashToken.value?.processing?.includes('Building authchain')) {
    return ''
  }
  return cashToken.value?.processing
})

const bcmr = ref<Bcmr>()
const bcmrStorageArtifact = ref<BcmrStorageArtifact>()
const tokenAmountWithDecimal = computed<string>(() => {
  if (Number(genesisTokenMetadata.value.decimals) > 0) {
    if (
      genesisToken.value.amount >= MAX_FUNGIBLE_AMOUNT ||
      Number(`${genesisToken.value.amount.toString()}`.padEnd(genesisToken.value.amount.toString().length + Number(genesisTokenMetadata.value.decimals), '0')) >= Number(MAX_FUNGIBLE_AMOUNT)
    ) {
      // don't pad, accomodate 
      const decimal_place = genesisToken.value.amount.toString().length - Number(genesisTokenMetadata.value.decimals)
      const whole = genesisToken.value.amount.toString().substring(0, decimal_place)
      const decimal = genesisToken.value.amount.toString().substring(decimal_place)
      return `${whole}.${decimal}`
    }
    return `${genesisToken.value.amount.toString()}.`.padEnd(`${genesisToken.value.amount.toString()}`.length + Number(genesisTokenMetadata.value.decimals) + 1, '0')
  }
  return `${genesisToken.value.amount.toString()}`
})

const isValidTokenAmount = computed<boolean>(() => {
  if (tType.value === 'nft') return true
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


const convertCommitment = () => {
  if (genesisToken.value.commitment && genesisToken.value.commitmentFormat === 'decimal') {
    genesisToken.value.commitment = BigInt(genesisToken.value.commitment).toString(16)
    genesisToken.value.commitment = genesisToken.value.commitment.length < 2 ? genesisToken.value.commitment.padStart(2, '0') : genesisToken.value.commitment
    genesisToken.value.commitmentFormat = 'hex'
  } else if (genesisToken.value.commitment && genesisToken.value.commitmentFormat === 'hex') {
    genesisToken.value.commitment = parseInt(genesisToken.value.commitment, 16).toString()
    genesisToken.value.commitmentFormat = 'decimal'
  }
}

watch(() => genesisToken.value.commitment, (commitment) => {
  if (!commitment) {
    return genesisToken.value.commitmentFormat = 'decimal' // 
  }
  if (/^(?!^\d+$)[0-9A-Fa-f]+$/.test(commitment)) {
    genesisToken.value.commitmentFormat = 'hex'
  }
})

watch(() => tType.value, (tokenType) => {
  if (tokenType === 'ft') {
    genesisToken.value.commitment = ''
  }
  if (tokenType === 'nft' && !genesisToken.value.capability) {
    genesisToken.value.capability = NFTCapability.minting
    genesisToken.value.amount = ''
  }
})


onMounted(() => {
  if (tType.value === 'nft') {
    genesisToken.value.capability = NFTCapability.minting
    genesisToken.value.amount = ''
  }
  if (tType.value === 'ft') {
    genesisToken.value.amount = MAX_FUNGIBLE_AMOUNT
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

const setSupplyToMax = () => {
  genesisToken.value.amount = MAX_FUNGIBLE_AMOUNT
}

const constructAndStoreBcmr = async () => {
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

  if (genesisTokenMetadata.value.website) {
    bcmr.value.addUri({ web: genesisTokenMetadata.value.website })
  }

  if (genesisTokenMetadata.value.links) {
    Object.keys(genesisTokenMetadata.value.links || {}).forEach((name) => {
      if (genesisTokenMetadata.value.links && genesisTokenMetadata.value.links[name]) {
        bcmr.value!.addUri({ [name]: genesisTokenMetadata.value.links[name] })
      }
    })
  }

  if (genesisToken.value.commitment || genesisToken.value.capability) {
    const nft: NftType = {
      name: genesisTokenMetadata.value.name
    }
    let commitment = genesisToken.value.commitment
    if (commitment) {
      // will use commitment as types key in BCMR,
      // converting to hex little endian
      if (genesisToken.value.commitmentFormat === 'decimal') {
        nft.name += `-${commitment}`
        commitment = convertBigIntToHexLE(BigInt(commitment))
      }
      if (genesisToken.value.commitmentFormat === 'hex') {
        nft.name += `-${parseInt(commitment, 16)}`
        if (nftCollectionType.value === 'SequentialNftCollection') {
          commitment = parseInt(commitment, 16).toString()
          commitment = convertBigIntToHexLE(BigInt(commitment))
        }
      }
      bcmr.value.addNft(commitment, nft)
    }
  }

  bcmr.value.appendAuthGuardTokenStandardExtension(props.authKey.token?.tokenId || props.authKey.txid)
  return await bcmr.value.storeRegistry()
}

const createToken = async () => {
  if (nftCollectionType.value === 'SequentialNftCollection' && genesisToken.value.capability === 'minting') {
    genesisToken.value.commitment = ''
    genesisToken.value.commitmentFormat = 'hex'
  }
  cashToken.value = new CashToken({ ...props.genesisInput, authKey: props.authKey, ownerWallet: props.ownerWallet })
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

    await new Watchtower().subscribe(cashToken.value.authKey!.authGuard.contract!.getTokenDepositAddress())

    const tx = await cashToken.value.createGenesis({
      amount: Number(tokenAmountWithDecimal.value.replace('.', '')),
      capability: genesisToken.value.capability,
      commitment: genesisToken.value.commitment,
      commitmentFormat: genesisToken.value.commitmentFormat,
      includeAuthKeyGenesis: props.createAuthKey === false ? false : true
    })

    await new Watchtower().subscribe(cashToken.value.authKey!.authGuard.contract!.getTokenDepositAddress())


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
        successMsg: `Created ${bcmr.value?.getToken()?.symbol || props.genesisInput.txid} token (genesis)`
      })
      ui.setStatusMessage({
        statusMessage: `Created ${bcmr.value?.getToken()?.symbol || props.genesisInput.txid} token`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
      emit('genesisResult', { txid: tx, tokenSymbol: cashToken.value.tokenCategory?.symbol || '' })
      buildAuthchain(cashToken.value)
    }
    // setStatusProvider(null)
  } catch (error: any) {
    // setStatusProvider(null)
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error'
    })
    return $q.notify({ type: 'negative', message: 'Txn Failed!' + error.message })
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
