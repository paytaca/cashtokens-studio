<template>
  <q-page>
    <div class="row justify-center q-gutter-md">
      <div class="col-xs-12 col-sm-11 col-lg-10">
        <q-layout view="lHh Lpr lFf" container style="height: 100vh">
          <q-header reveal style="background-color: unset;margin-bottom: unset;">
            <div class="row justify-center q-mt-lg">
              <div class="col-xs-12 q-gutter-lg">
                <!-- <div class="text-h4 text-white text-bold">Mint NFT</div> -->
              </div>
            </div>
          </q-header>
          <q-page-container>
            <q-page padding>
              <div class="row justify-center q-my-lg q-gutter-lg">
                <div class="col-xs-12">
                  <div class="text-h4 text-white text-bold">Mint NFT</div>
                </div>
              </div>
              <div v-if="mintTx" class="q-px-lg q-pb-lg text-center">
                🎉 NFT(s) minted <q-btn :href="openTxInExplorer(mintTx)" target="_blank" flat dense color="secondary"
                  label="View Tx in Explorer" />
              </div>
              <div class="row justify-center q-gutter-lg">
                <div class="col-sm-2 q-mb-lg">
                  <div>
                    <q-img v-if="minter.value.identitySnapshot?.uris?.icon"
                      :src="minter.value.identitySnapshot?.uris?.icon" class="rounded-borders"></q-img>
                    <q-icon v-else name="broken_image" size="250px" color="grey-8"></q-icon>
                  </div>
                  <div class="text-center">
                    <span v-if="minter.value.identitySnapshot?.token?.symbol" class="text-primary text-bold text-h6">
                      <TokenSymbol :symbol="minter.value.identitySnapshot.token.symbol" />
                    </span>
                    <span v-else class="text-grey-8">
                      [Unknown Token]
                    </span>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-10 col-lg-9">
                  <div v-if="!mintTx" class="row justify-center">
                    <div class="col-xs-12 q-gutter-md">
                      <q-form ref="form" class="q-gutter-md" :disabled="disableForm" @submit.prevent="mint">
                        <div v-if="minter.value.nftCollectionType == 'SequentialNftCollection'"
                          class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Last minted sequence #</label>
                          <q-input
                            :model-value="formatCommitment(minter.value.token?.commitment || '0', 'vm-number', 'decimal')"
                            disable readonly bottom-slots
                            :style="$q.screen.lt.sm ? 'margin-bottom: 8rem' : 'margin-bottom: 4rem'" dense>
                            <template v-slot:append>
                              <q-icon name="edit_off" color="grey-8"></q-icon>
                            </template>
                            <template v-slot:hint>
                              <div class="flex items-center text-justify">
                                <q-icon name="warning" color="warning" size="sm"></q-icon>
                                <p style="line-height: 1.5em;font-size: larger;">
                                  Currently, CashTokens Studio stores the last minted sequence on the minter's commitment,
                                  this is used in tracking and suggesting the next sequence to mint. This doesn't
                                  inherently guarantee the sequential order or uniqueness of the entire NFT collection.
                                  The
                                  responsibility for ensuring sequentiality and uniqueness ultimately lies with the
                                  issuer.
                                </p>
                              </div>
                            </template>
                          </q-input>
                        </div>
                        <div class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Choose Mint Option</label>
                          <q-select
                            :options="minter.value.nftCollectionType == 'SequentialNftCollection' ? sequentialOpts : parsableOpts"
                            v-model="mintStrategy" class="q-mb-xs" label="I want to" stack-label outlined>
                            <!-- <template v-slot:hint>
                              <div class="ellipsis">{{ hints[mintOptions.mintOption] }}</div>
                            </template> -->
                          </q-select>
                        </div>
                        <template v-if="mintStrategy?.value == MINT_NEXT_SEQUENCE">
                          <div class="q-gutter-y-sm items-center">
                            <label>Number of NFTs to mint</label>
                            <q-input v-model="mintOptions.mintQuantity" outlined type="number"></q-input>
                          </div>
                          <div class="q-gutter-y-sm items-center col-6">
                            <label>{{ nftTypeLabel }} </label>
                            <q-input v-model="mintOptions.nftType" outlined disable bottom-slots>
                              <template v-slot:hint>
                                <i>Commitment (VM Number = <code>{{ formatCommitment(String(mintOptions.nftType), 'decimal',
                                  'vm-number') }}</code>)
                                </i>
                              </template>
                            </q-input>
                          </div>
                          <div v-if="mintOptions.mintQuantity > 1" class="q-gutter-y-sm items-center col-6">
                            <label> NFT Type (Sequence - Stop) </label>
                            <q-input :model-value="Number(mintOptions.nftType) + Number(mintOptions.mintQuantity) - 1"
                              outlined disable readonly bottom-slots>
                              <template v-slot:hint>
                                <i>Commitment (VM Number = <code>{{ formatCommitment(String(Number(mintOptions.nftType) + Number(mintOptions.mintQuantity)), 'decimal',
                                  'vm-number') }}</code>)
                                </i>
                              </template>
                            </q-input>
                          </div>
                        </template>
                        <div v-else-if="mintStrategy?.value == MINT_A_TYPE">
                          <div v-if="minter.value.nftCollectionType == 'SequentialNftCollection'"
                            class="q-gutter-y-sm items-center">
                            <label> NFT Type </label>
                            <q-input v-model="mintOptions.nftType" placeholder="Enter sequence number" outlined disable
                              bottom-slots>

                            </q-input>
                          </div>
                          <div v-else-if="minter.value.nftCollectionType == 'ParsableNftCollection'"
                            class="q-gutter-y-sm items-center">
                            <label> NFT Type </label>
                            <q-input v-model="mintOptions.nftType" placeholder="Enter bottom altstack hex" outlined
                              disable>
                            </q-input>
                          </div>
                        </div>
                        <div class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Capability</label>
                          <q-input :model-value="NFTCapability.none" outlined disable readonly>
                            <template v-slot:append>
                              <q-icon name="edit_off" color="grey-8"></q-icon>
                            </template>
                          </q-input>
                        </div>
                        <div class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Recipient</label>
                          <q-input v-model="mintOptions.recipient" clearable :outlined="!mintTx" :disable="!!mintTx"
                            :rules="[(v) => /^((bitcoincash:|bchtest:)?(z)[a-zA-Z0-9]{1,64})$/.test(v) || 'Enter a valid token addresss']">
                            <template v-slot:append>
                              <q-btn v-if="!mintOptions.recipient" dense :flat="$q.dark.isActive ? true : false"
                                label="Self" color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                                @click="mintOptions.recipient = user.walletTokenAddress!" />
                            </template>
                          </q-input>
                        </div>
                        <div class="q-mb-lg row q-gutter-y-sm items-center justify-end q-mx-md">
                          <q-btn @click.stop="mint" size="lg" color="primary"> Mint </q-btn>
                        </div>
                      </q-form>
                    </div>
                  </div>
                  <div v-else class="row justify-center">
                    <div class="col-xs-12 q-gutter-md">
                      <q-table v-model:pagination="nftsPagination" flat :rows="nfts" style="background:unset" :columns="[
                        {
                          name: 'nfttype', label: 'NFTs',
                          field: r => '',
                          align: 'left',
                          headerStyle: 'padding: 1.5em',
                        },
                        {
                          name: 'actions', label: '',
                          field: r => '',
                          align: 'center',
                          headerStyle: 'padding: 1.5em',
                        },
                      ]" :rows-per-page-options="nftsPaginationRowsPerPageOpts" row-key="id"
                        :visible-columns="['nfttype', 'actions']" bordered>
                        <template v-slot:body-cell-nfttype="value">
                          <td>
                            <div class="row justify-left items-center flex wrap q-gutter-sm">
                              <div class="col-auto">
                                <q-avatar v-if="nftsTypes[value.row.commitment]?.uris?.icon" rounded>
                                  <q-img :src="ipfsToGatewayUrl(nftsTypes[value.row.commitment]?.uris?.icon || '')" />
                                </q-avatar>
                                <q-icon v-else name="broken_image" size="xl" color="grey-8"></q-icon>
                              </div>
                              <div class="col text-wrap text-left" style="font-size: 1.5em; letter-spacing: 2px;">
                                <div style="font-variant-numeric: tabular-nums;" class="text-grey-4 text-bold">
                                  {{ minter.value.nftCollectionType == 'SequentialNftCollection' ?
                                    `#${formatCommitment(value.row.commitment, 'vm-number',
                                      'decimal')}` :
                                    value.row.commitment
                                  }}
                                  <span v-if="nftsTypes[value.row.commitment] && nftsTypes[value.row.commitment].saved"
                                    class="text-grey-8">
                                    (<q-icon name="done" size="xs" color="primary"></q-icon>saved)
                                    <q-tooltip>Saved on browser's local storage</q-tooltip>
                                  </span>

                                </div>
                                <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                                  {{ `(${nftsTypes[value.row.commitment]?.name || '<name undefined>'})` }}
                                </div>
                              </div>
                              <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                                <div class="text-grey-6 ellipsis-2-lines">
                                  Description: {{
                                    nftsTypes[value.row.commitment]?.description
                                    || '<no description>' }}
                                </div>
                              </div>
                              <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                                <div class="text-grey-8">
                                  Raw Commitment: {{
                                    value.row.commitment
                                  }}
                                </div>
                              </div>
                              <div v-if="value.row.capability" class="col-12 text-bold q-pl-sm"
                                style="letter-spacing: 2px;">
                                <div class="text-grey-8">
                                  NFT Capability: {{
                                    value.row.capability
                                  }}
                                </div>
                              </div>
                            </div>
                          </td>
                        </template>
                        <template v-slot:body-cell-actions="value">
                          <q-td class="text-center">
                            <div>
                              <q-btn label="Metadata" text-color="primary"
                                @click.stop="openNftTypeDialog(value.row as TokenI)" dense>
                                <!-- <q-icon size="xs" :name="!nftsTypes[value.row.commitment] ? 'add' : 'edit'"></q-icon> -->
                                <template v-slot:default>
                                  <q-icon size="xs" :name="!nftsTypes[value.row.commitment] ? 'add' : 'edit'"></q-icon>
                                </template>
                              </q-btn>
                            </div>
                          </q-td>
                        </template>
                      </q-table>
                    </div>
                    <template v-if="Object.keys(nftsTypes).length > 0">
                      <div class="q-mb-lg row q-gutter-y-sm items-center justify-end q-mx-md">
                        <q-btn @click.stop="saveNftsTypes" size="lg" text-color="primary">
                          <q-tooltip>Save changes in the browser</q-tooltip>
                          Save
                        </q-btn>
                      </div>
                      <!-- <div class="q-mb-lg row q-gutter-y-sm items-center justify-end q-mx-md">
                        <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="lg" color="primary"> Publish NFT Metadata</q-btn>
                      </div> -->
                    </template>

                  </div>
                </div>
              </div>
            </q-page>
          </q-page-container>
        </q-layout>
      </div>
    </div>
    <q-inner-loading :showing="!!progress" id="inner-loading" style="background-color:#0000002b" class="bg-transparent">
      <q-spinner size="5em" color="warning" class="q-mb-lg"></q-spinner>
      <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">{{ progress }}</span>
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { IdentitySnapshot, NFTCapability, NftType, TestNetWallet, TokenI, UtxoI, Wallet, binToHex } from 'mainnet-js'
import { useQuasar } from 'quasar'
import { AuthKey, AuthchainIdentity, Bcmr, ChainGraph } from 'src/app'
import { useUser } from 'src/stores/user'
import { BcmrStorageArtifact, IconStorageArtifact } from 'src/app/types'
import { shortenTokenId, openTxInExplorer, formatCommitment, ipfsToGatewayUrl } from 'src/app/utils'
import { useEventBus } from 'src/composables'
import { useUI } from 'src/stores/ui'
import { RegistryNftType } from 'src/app'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { bigIntToVmNumber, decodeTransaction, sha1 } from '@bitauth/libauth'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import AddUriDialog from 'src/components/dialogs/AddUriDialog.vue'
import NftTypeDialog from 'src/components/dialogs/NftTypeDialog.vue'
import { useLocalForage } from 'src/composables/useLocalForage'
import { usePage } from 'src/stores/page'
import { useMinter } from 'src/stores/minter'

const MINT_NEXT_SEQUENCE = 'Mint next sequence'
const MINT_A_TYPE = 'Mint a particular NFT type (commitment/bottomAltStackHex)' // Shouldn't update minter
const MINT_A_MUTABLE_NFT = 'Mint a mutable NFT'
const MINT_ANOTHER_MINTER = 'Mint another minter for this category'

const supportAssetUpload = [
  MINT_NEXT_SEQUENCE,
  MINT_A_TYPE,
  MINT_A_MUTABLE_NFT
]

const hints: any = {
  [MINT_NEXT_SEQUENCE]: `Will mint 1 NFT. The minter's commitment will be updated if it's a Sequential NFT Collection.`,
  [MINT_A_TYPE]: `Will mint one or more NFTs having the same commitment.`,
  [MINT_A_MUTABLE_NFT]: `Will mint one or more mutable NFT(s) having no or the same commitment.`,
  [MINT_ANOTHER_MINTER]: `Will mint one or more minting NFT(s) having no or the same commitment.`
}

const sequentialOpts = [
  { value: MINT_NEXT_SEQUENCE, label: MINT_NEXT_SEQUENCE },
  { value: MINT_A_TYPE, label: MINT_A_TYPE }
  // { value: MINT_A_MUTABLE_NFT, label: MINT_A_MUTABLE_NFT },
  // { value: MINT_ANOTHER_MINTER, label: MINT_ANOTHER_MINTER }
]

const parsableOpts = [
  { value: MINT_A_TYPE, label: MINT_A_TYPE },
  // { value: MINT_A_MUTABLE_NFT, label: MINT_A_MUTABLE_NFT },
  // { value: MINT_ANOTHER_MINTER, label: MINT_ANOTHER_MINTER }
]

const iconFile = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const iconFileUploadArtifact = ref<IconStorageArtifact>()


const progress = ref<string | boolean>()

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const page = usePage()
const ui = useUI()
const minter = useMinter()
const route = useRoute()
const router = useRouter()
const mintForm = ref()
const fileUploader = ref()
const disableForm = ref<'' | 'disabled'>()

const localForage = useLocalForage()
const chainGraph = ref<ChainGraph>(new ChainGraph())

// Nfts to mint/minted
const nfts = ref<TokenI[]>()
// Nfts' metadata
const nftsTypes = ref<{ [commitmentOrbottomAltStackItemHex: string]: NftType & { saved?: boolean } }>({})
const nftsPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10,
})

const nftsPaginationRowsPerPageOpts = [10, 20, 50]

const nftTypeLabel = computed(() => {
  if (minter.value.nftCollectionType == 'SequentialNftCollection') {
    return mintOptions.value.mintQuantity > 1 ? 'NFT Type (Sequence - Start)' : 'NFT Type (Sequence #)'
  } else {
    return 'NFT Type (Bottom AltStack Hex)'
  }
})
const mintTx = ref<string>()
const mintStrategy = ref()
const mintOptions = ref<{
  mintQuantity: number,
  nftType: number | string // Commitment (as sequence number) / Bottom AltStack Hex
  capability: NFTCapability,
  recipient: string
}>({
  mintQuantity: 0,
  nftType: '',
  capability: NFTCapability.none,
  recipient: minter.value.ownerWallet.getTokenDepositAddress()
})


const openNftTypeDialog = (token: TokenI) => {
  $q.dialog({
    component: NftTypeDialog,
    componentProps: {
      token: token,
    }
  }).onOk(({ type, nftType }) => {
    nftsTypes.value[type] = nftType
    console.log('nfts types', nftsTypes.value)
  })
}

const saveNftsTypes = async () => {
  try {
    for (const type of Object.keys(nftsTypes.value)) {
      await localForage.nftTypesStore.setItem(`${minter.value.token.tokenId}-${type}`, { [type]: JSON.parse(JSON.stringify(nftsTypes.value[type])) })
      nftsTypes.value[type].saved = true
    }

  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    })
  }
}




const mint = async () => {
  progress.value = 'Processing, please wait...'
  nfts.value = []

  let newMinterCommitment = minter.value.token.commitment // vm-number 
  if (mintStrategy.value?.value == MINT_NEXT_SEQUENCE) {
    for (let i = 0; i < mintOptions.value.mintQuantity; i++) {
      const vmNumber = formatCommitment(String(i + Number(mintOptions.value.nftType)), 'decimal', 'vm-number')
      nfts.value.push({
        amount: BigInt(0),
        tokenId: minter.value?.token?.tokenId,
        commitment: vmNumber,
        capability: mintOptions.value.capability
      })
      newMinterCommitment = vmNumber
    }
  }

  try {
    const tx = await minter.value.mintChildrenExt({
      tokens: nfts.value,
      recipient: mintOptions.value.recipient,
      newMinterCommitment: newMinterCommitment
    })

    if (tx) {
      progress.value = 'Transaction submitted, awaiting propagation...'
      try {
        await minter.value.ownerWallet.waitForTransaction({ txHash: tx })
        await minter.value.updateUtxo(tx)
        await minter.value.updateAuthKeyUtxo(tx)
        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `Metadata registry published!`,
            txid: tx
          }
        })
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'AuthchainIdentity.publish',
          timestamp: new Date().getTime(),
          successMsg: `Published ${minter.value.identitySnapshot?.token?.symbol}'s registry'`
        })

        mintTx.value = tx
        progress.value = 'Loading minted NFTs, please wait...'
        const decoded = await minter.value.ownerWallet.util.decodeTransaction(tx)
        console.log('DECODED', decoded)
      } catch (error: any) {
        $q.dialog({
          message: error?.toString(),
          ok: true,
          focus: 'ok',
          class: 'q-pa-lg'
        })
      } finally {
        progress.value = false
      }
    }

  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error',
    })
  } finally {
  }
}

watch(() => minter.value.processing, (m) => {
  progress.value = m
})


onMounted(async () => {
  if (minter.value.nftCollectionType == 'SequentialNftCollection') {
    mintStrategy.value = { value: MINT_NEXT_SEQUENCE, label: MINT_NEXT_SEQUENCE }
    mintOptions.value.nftType = Number(formatCommitment(minter.value.token.commitment || 0, 'vm-number', 'decimal')) + 1
  }
  console.log('BALANCE', await minter.value?.ownerWallet.getBalance())
})

</script>

<style lang="scss">
.q-stepper__title {
  font-size: medium;
}
</style>
