<template>
  <q-page>
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-11 col-lg-10" :class="$q.screen.xs ? 'q-mx-auto' : ''">
        <q-layout view="lHh Lpr lFf" container style="height: 100vh">
          <!-- <q-header reveal style="background-color: unset;margin-bottom: unset;">
            <div class="row justify-center q-mt-lg">
              <div class="col-xs-12 q-gutter-lg">
                <div class="text-h4 text-white text-bold">Mint NFT</div>
              </div>
            </div>
          </q-header> -->
          <q-page-container>
            <q-page padding>
              <!-- <div class="row justify-center q-my-lg q-gutter-lg">
                <div class="col-xs-12">
                  <div class="text-h4 text-white text-bold">Mint</div>
                </div>
              </div> -->
              <div v-if="mintTx" class="q-px-lg q-pb-lg text-center">
                🎉 NFT(s) minted <q-btn :href="openTxInExplorer(mintTx)" target="_blank" flat dense color="secondary"
                  label="View Tx in Explorer" />
              </div>
              <div v-if="publicationTx" class="q-px-lg q-pb-lg text-center">
                🎉 NFTs Metadata published <q-btn :href="openTxInExplorer(publicationTx)" target="_blank" flat dense
                  color="secondary" label="View Tx in Explorer" />
              </div>
              <div class="row justify-center q-gutter-lg">
                <div class="col-sm-2 q-mb-lg">
                  <div>
                    <div class="text-h4 text-white text-bold text-center">Mint</div>
                    <q-img v-if="minter.value.identitySnapshot?.uris?.icon"
                      :src="ipfsToGatewayUrl(minter.value.identitySnapshot?.uris?.icon)" class="rounded-borders"></q-img>
                    <q-icon v-else name="broken_image" size="250px" color="grey-8"></q-icon>
                  </div>
                  <div class="text-center">
                    <span v-if="minter.value.identitySnapshot?.token?.symbol" class="text-primary text-bold text-h6">
                      <TokenSymbol :symbol="minter.value.identitySnapshot.token.symbol" />
                    </span>
                    <span v-else class="text-grey-8">
                      [Unknown Token]
                    </span>
                    <div class="text-wrap text-italic text-grey-4 q-mt-sm">( Mint to add NFT(s) to the {{
                      minter.value.identitySnapshot?.token?.symbol
                    }}
                      collection )</div>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-10 col-lg-9">
                  <div v-if="!mintTx" class="row justify-center">
                    <div class="col-xs-12 q-gutter-md">

                      <q-form ref="form" class="q-gutter-md" :disabled="disableForm" @submit.prevent="mint">
                        <div class="q-mb-lg q-gutter-y-sm items-center">
                          <label>NFT Collection Type</label>
                          <q-input :model-value="minter.value.nftCollectionType" disable readonly
                            style="font-size:1.5em; padding-left: unset" borderless>
                            <template v-slot:append>
                              <q-icon name="edit_off" color="grey-8"></q-icon>
                            </template>
                          </q-input>
                        </div>
                        <div v-if="minter.value.nftCollectionType == 'SequentialNftCollection'"
                          class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Last minted sequence # (This minter's commitment)</label>
                          <q-input :model-value="formatCommitment(minter.value.token?.commitment, 'vm-number', 'decimal')"
                            disable readonly bottom-slots style="font-size:1.5em"
                            :style="$q.screen.lt.sm ? 'margin-bottom: 8rem' : 'margin-bottom: 4rem'" dense>
                            <template v-slot:append>
                              <q-icon name="edit_off" color="grey-8"></q-icon>
                            </template>
                            <template v-slot:hint>
                              <div class="flex items-center text-justify">
                                <q-icon name="warning" color="warning" size="xs"></q-icon>
                                <span style="line-height: 1.5em;font-size: larger;">
                                  Currently, CashTokens Studio stores the last minted sequence on the minter's commitment,
                                  this is used in tracking and suggesting the next sequence to mint. This doesn't
                                  inherently guarantee the sequential order or uniqueness of the entire NFT collection.
                                  The
                                  responsibility for ensuring sequentiality and uniqueness ultimately lies with the
                                  issuer.
                                </span>
                              </div>
                            </template>
                          </q-input>
                        </div>
                        <div class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Choose Mint Option</label>
                          <q-select
                            :options="minter.value.nftCollectionType == 'SequentialNftCollection' ? sequentialOpts : parsableOpts"
                            v-model="mintStrategy" class="q-mb-xs" label="I want to" stack-label outlined>
                            <template v-slot:hint>
                              <span
                                v-if="mintStrategy?.value != MINT_NEXT_SEQUENCE && minter.value.nftCollectionType == 'SequentialNftCollection'">
                                The minter's commitment value will not change. i.e., for SequentialNftCollection,
                                last-minted sequence# value will not be updated.</span>
                            </template>
                          </q-select>
                          <span class="text-wrap "
                            v-if="mintStrategy?.value != MINT_NEXT_SEQUENCE && minter.value.nftCollectionType == 'SequentialNftCollection'">
                            The minter's commitment value will not change. i.e., for SequentialNftCollection,
                            last-minted sequence# value will not be updated.
                          </span>
                        </div>
                        <div class="q-gutter-y-sm items-center row col-xs-6">
                          <div class="q-mb-sm">
                            <label>Number of NFTs to mint</label>
                            <q-input v-model="mintOptions.mintQuantity" outlined type="number" :min="1"></q-input>
                          </div>
                        </div>
                        <template v-if="mintStrategy?.value == MINT_NEXT_SEQUENCE">
                          <div class="q-gutter-y-sm items-center col-6">
                            <label>{{ nftTypeLabel }} </label>
                            <q-input v-model="mintOptions.nftType" outlined bottom-slots disable>
                              <template v-slot:hint>
                                <i>Commitment (VM Number = <code>{{ formatCommitment(String(mintOptions.nftType), 'decimal',
                                  'vm-number') }}</code>)
                                </i>
                              </template>
                            </q-input>
                          </div>
                          <div v-if="mintOptions.mintQuantity > 1" class="q-gutter-y-sm items-center col-6">
                            <label> Sequence # (last) </label>
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
                        <div v-else-if="mintStrategy?.value == MINT_A_TYPE || mintStrategy?.value == MINT_A_MUTABLE_NFT">
                          <div v-if="minter.value.nftCollectionType == 'SequentialNftCollection'"
                            class="q-gutter-y-sm items-center">
                            <label> Sequence #</label>
                            <q-input v-model="mintOptions.nftType" placeholder="Enter sequence number" outlined
                              bottom-slots>
                              <template v-slot:hint>
                                <q-icon name="warning" color="warning" class="q-mr-xs"></q-icon>This'll affect the
                                uniqueness of each NFTs in this collection if you'll mint an already minted type.
                              </template>
                            </q-input>
                          </div>
                          <div v-else-if="minter.value.nftCollectionType == 'ParsableNftCollection'"
                            class="q-gutter-y-sm items-center">
                            <label> NFT Type (Hex) </label>
                            <q-input v-model="mintOptions.nftType" placeholder="Enter bottom altstack hex"
                              :rules="[v => !v || /^[0-9a-fA-F]+$/.test(v) || 'Should be a hex value']" outlined>
                            </q-input>
                          </div>
                        </div>
                        <div class="q-mb-lg q-gutter-y-sm items-center">
                          <label>Capability</label>
                          <q-input :model-value="mintOptions.capability" outlined disable readonly>
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
                        <div class="q-my-lg row q-gutter-lg items-center justify-end q-mx-md">
                          <q-btn @click.stop="() => router.back()" size="lg">
                            Exit
                          </q-btn>
                          <q-btn @click.stop="mint" size="lg" color="primary"> Mint </q-btn>
                        </div>
                      </q-form>
                    </div>
                  </div>
                  <div v-else class="row justify-center">
                    <div class="col-xs-12 q-gutter-md">
                      <q-table v-model:pagination="nftsPagination" flat :rows="nfts" style="background:unset" :columns="[
                        {
                          name: 'nfttype', label: 'Minted NFTs',
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
                      ]
                        " :rows-per-page-options="nftsPaginationRowsPerPageOpts" row-key="id"
                        :visible-columns="['nfttype', 'actions']" bordered>
                        <template v-slot:header>
                          <div class="q-ma-md" col-span="2" style="border-bottom: inherit">
                            <div class="text-h6">({{ nfts?.length || 0 }}) NFTs Minted</div>
                            <div>You can now add the metadata of this minted NFTs.</div>
                            <div v-if="mintStrategy.value == MINT_A_TYPE">
                              You've minted {{ nfts?.length }} NFTs of the same type, so they'll share the same metadata.
                            </div>
                          </div>
                        </template>
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
                                      'decimal')
                                    } ` :
                                    value.row.commitment
                                  }}
                                  <span
                                    v-if="nftsTypes[value.row.commitment] && nftsTypes[value.row.commitment].saved && !nftsTypes[value.row.commitment].published"
                                    class="text-grey-8">
                                    (<q-icon name="done" size="xs" color="primary"></q-icon>saved)
                                    <q-tooltip>Saved on browser's local storage</q-tooltip>
                                  </span>
                                  <span
                                    v-if="nftsTypes[value.row.commitment] && nftsTypes[value.row.commitment].published"
                                    class="text-grey-8">
                                    (<q-icon name="done" size="xs" color="primary"></q-icon>published)
                                    <q-tooltip>Published</q-tooltip>
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

                    <div class="col-xs-12 q-gutter-md q-my-lg items-center row justify-end">
                      <q-btn @click.stop="() => onDone()" size="lg">
                        Done
                      </q-btn>
                      <!-- <q-btn @click.stop="mintAgain" size="lg" text-color="primary" flat>
                          Mint Again?
                        </q-btn> -->
                      <q-btn @click.stop="saveNftsTypes" size="lg" text-color="primary">
                        <q-tooltip>Save changes in the browser</q-tooltip>
                        Save Metadata
                      </q-btn>
                      <q-btn @click.stop="() => publish()" size="lg" color="primary"> Publish Metadata
                      </q-btn>

                    </div>
                    <!-- <div class="row q-gutter-lg q-my-lg items-center justify-end q-mx-md">


                    </div> -->
                  </div>
                </div>
              </div>
              <!-- <div class="row justify-end">
                <q-fab v-model="fab1" color="primary" class="q-gutter-x-lg" size="lg" glossy icon="keyboard_arrow_left"
                  direction="left">
                  <q-fab-action v-if="Object.keys(nftsTypes).length > 0" square external-label label-position="top"
                    color="primary" @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')"
                    icon="cloud_upload" label="Publish" />
                  <q-fab-action v-if="Object.keys(nftsTypes).length > 0" square external-label label-position="top"
                    text-color="primary" @click.stop="saveNftsTypes" icon="save" label="Save" />
                  <q-fab-action square external-label label-position="top" text-color="primary" @click.stop="mintAgain"
                    icon="redo" label="Mint Again" />
                  <q-fab-action square external-label label-position="top" @click.stop="() => router.back()"
                    icon="exit_to_app" label="Done" />
                </q-fab>
              </div> -->

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

import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import {
  IdentitySnapshot,
  NFTCapability,
  NftType, TokenI,
  delay
} from 'mainnet-js'
import { AuthchainIdentity, Bcmr, BcmrIndexer, ChainGraph } from 'src/app'
import { shortenTokenId, openTxInExplorer, formatCommitment, ipfsToGatewayUrl } from 'src/app/utils'
import { useLocalForage } from 'src/composables/useLocalForage'
import { useEventBus } from 'src/composables'
import { useMinter } from 'src/stores/minter'
import { useUser } from 'src/stores/user'
import { useUI } from 'src/stores/ui'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import PublishRevisionOption from 'src/components/dialogs/PublishRevisionOption.vue'
import NftTypeDialog from 'src/components/dialogs/NftTypeDialog.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'

const MINT_NEXT_SEQUENCE = 'Mint next sequence'
const MINT_A_TYPE = 'Mint a particular NFT type' // Shouldn't update minter
const MINT_A_MUTABLE_NFT = 'Mint a mutable NFT'
const MINT_ANOTHER_MINTER = 'Mint another minter for this category'

const hints: any = {
  [MINT_NEXT_SEQUENCE]: `Will mint 1 NFT. The minter's commitment will be updated if it's a Sequential NFT Collection.`,
  [MINT_A_TYPE]: `Will mint one or more NFTs having the same commitment.`,
  [MINT_A_MUTABLE_NFT]: `Will mint one or more mutable NFT(s) having no or the same commitment.`,
  [MINT_ANOTHER_MINTER]: `Will mint one or more minting NFT(s) having no or the same commitment.`
}

const sequentialOpts = [
  { value: MINT_NEXT_SEQUENCE, label: MINT_NEXT_SEQUENCE },
  { value: MINT_A_TYPE, label: 'Mint a particular sequence #' }
  // { value: MINT_A_MUTABLE_NFT, label: MINT_A_MUTABLE_NFT },
  // { value: MINT_ANOTHER_MINTER, label: MINT_ANOTHER_MINTER }
]

const parsableOpts = [
  { value: MINT_A_TYPE, label: MINT_A_TYPE },
  { value: MINT_A_MUTABLE_NFT, label: MINT_A_MUTABLE_NFT }
  // { value: MINT_ANOTHER_MINTER, label: MINT_ANOTHER_MINTER }
]

const progress = ref<string | boolean>()
const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()
const minter = useMinter()
const router = useRouter()
const disableForm = ref<'' | 'disabled'>()

const localForage = useLocalForage()

// Nfts to mint/minted
const nfts = ref<TokenI[]>()
// Nfts' metadata
const nftsTypes = ref<{ [commitmentOrbottomAltStackItemHex: string]: NftType & { saved?: boolean, published?: boolean } }>({})
const nftsPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10,
})

const nftsPaginationRowsPerPageOpts = [10, 20, 50]

const nftTypeLabel = computed(() => {
  if (minter.value.nftCollectionType == 'SequentialNftCollection') {
    return mintOptions.value.mintQuantity > 1 ? 'Sequence # (first)' : 'Sequence #'
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
  mintQuantity: 1,
  nftType: '',
  capability: NFTCapability.none,
  recipient: minter.value.ownerWallet.getTokenDepositAddress()
})


const publicationTx = ref<string>()
const publisher = ref<AuthchainIdentity>()

const openNftTypeDialog = (token: TokenI) => {
  $q.dialog({
    component: NftTypeDialog,
    componentProps: {
      token: token,
      title: minter.value.nftCollectionType == 'SequentialNftCollection' ? `NFT Metadata of ${minter.value.identitySnapshot?.token?.symbol} #${formatCommitment('01', 'vm-number', 'decimal')}` : 'aa',
      defaultNftType: nftsTypes.value[token.commitment!]
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

const removeSavedNftsTypes = async () => {
  for (const type of Object.keys(nftsTypes.value)) {
    try {
      if (!nftsTypes.value[type].saved) continue
      await localForage.nftTypesStore.removeItem(`${minter.value.token.tokenId}-${type}`)
    } catch (error) {
      console.log('Error removing NFT Type from local storage')
    }
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
  } else if (mintStrategy.value?.value == MINT_A_TYPE || mintStrategy.value?.value == MINT_A_MUTABLE_NFT) {
    let commitment = mintOptions.value.nftType // Parsable
    if (minter.value.nftCollectionType == 'SequentialNftCollection') {
      // conver to vm-number
      commitment = formatCommitment(String(Number(mintOptions.value.nftType)), 'decimal', 'vm-number')
    }

    for (let i = 0; i < mintOptions.value.mintQuantity; i++) {

      nfts.value.push({
        amount: BigInt(0),
        tokenId: minter.value?.token?.tokenId,
        commitment: String(commitment),
        capability: mintOptions.value.capability
      })
      // don't update the type
      // newMinterCommitment = vmNumber
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
            statusText: `(${nfts.value}) ${minter.value.identitySnapshot?.token?.symbol} NFTs minted!`,
            txid: tx
          }
        })
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.mint',
          timestamp: new Date().getTime(),
          successMsg: `(${nfts.value}) ${minter.value.identitySnapshot?.token?.symbol} NFTs minted!`
        })

        mintTx.value = tx
        progress.value = 'Loading minted NFTs, please wait...'
        const decoded = await minter.value.ownerWallet.util.decodeTransaction(tx)
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

// Registry publication related functions

type RevisionOption = { newVersion: string, newRevision: string, revisionOption: 'update' | 'create', registry?: Bcmr }

const locateRegistry = async () => {
  const r = await (new BcmrIndexer()).fetchRegistry(minter.value?.identitySnapshot?.token?.category || minter.value.token?.tokenId, true)
  try {
    if (r) {
      return r
    } else {
      progress.value = `Unable to find registry from Paytaca's BCMR indexer.`
      await delay(1000)
      if (minter.value.token?.tokenId) {
        progress.value = `Trying other methods please wait...`
        await delay(1000)
        progress.value = `Retrieving last registry publication, using the authhead UTXO's Token ID as authbase...`
        const pubInfo = await (new ChainGraph()).retrieveLastRegistryPublication(minter.value.token.tokenId)
        console.log(pubInfo)
        if (pubInfo && pubInfo[0]) {
          if (pubInfo[0].httpsUrl) {
            try {
              const r = await fetch(pubInfo[0].httpsUrl)
              if (r.status == 200) {
                const rj = await r.json()
                if (rj) {
                  return rj
                }

              }
            } catch (error) {
              $q.dialog({
                message: `Found registry publication but unable to load from the published URL (${pubInfo[0].httpsUrl}). Verify that the URL exist or try again later`
              })
            }
          }
        } else {
          // bcmrNotFound.value = true
          // TODO: show dialog
        }
      }
    }
  } catch (error) {
    progress.value = false
  } finally {
    progress.value = false
  }
}


const getLatestIdentitySnapshot = (bcmr: Bcmr, authbase: string): { latestIdentitySnapshot: IdentitySnapshot, latestRevisionTimestamp: string } => {
  if (!bcmr.identities || Object.keys(bcmr.identities[authbase]).length == 0) {
    // Just incase
    throw new Error('No published registry identities. Please publish a registry first.')
  }
  let identityHistory: Date[] = []
  identityHistory = Object.keys(bcmr.identities[authbase] || {})
    .filter((v) => !Number.isNaN(new Date(v).getDate()))
    .map(v => new Date(v))
    .sort((a: any, b: any) => b - a)
  let latestRevision = identityHistory.filter((d) => d <= new Date())[0]
  return { latestIdentitySnapshot: bcmr.identities[authbase][latestRevision.toISOString()], latestRevisionTimestamp: latestRevision.toISOString() } // clone latest
}

const publish = async () => {

  progress.value = 'Authenticating authhead, please wait...'
  try {
    const trackedAuthhead = await (new ChainGraph()).fetchAuthheadTxid(minter.value.token.tokenId)
    progress.value = false
    if (trackedAuthhead != minter.value.txid) {
      await new Promise(res => {
        $q.dialog({
          message: `This UTXO is not authorized to publish metadata for token ${shortenTokenId(minter.value.token.tokenId)}`,
          ok: true,
          focus: 'ok',
          class: 'q-pa-lg'
        }).onDismiss(() => res(null))
      })
      return
    }

  } catch (error) {
    console.log('Error', error)
    await new Promise(() => {
      $q.dialog({
        message: `Error authenticating authhead, please try again later...`,
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg'
      })
    })
    return
  }
  const r = await locateRegistry()
  let proceed = true
  if (!r) {
    proceed = await new Promise((resolve) => {
      $q.dialog({
        message: 'Unable to locate registry. Please publish this token\'s metadata first.',
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg'
      }).onOk(() => {
        resolve(false)
      })
    })
  }

  if (!proceed) return
  const bcmr = new Bcmr({ ...r })
  const newRevisionTimestamp = new Date().toISOString()
  const authbase = minter.value.token.tokenId
  const { latestIdentitySnapshot, latestRevisionTimestamp } = getLatestIdentitySnapshot(r, authbase)
  const revisionOptions: RevisionOption = await new Promise((resolve) => {
    $q.dialog({
      component: PublishRevisionOption,
      componentProps: {
        version: bcmr.versionString,
        latestRevision: latestRevisionTimestamp,
        newRevision: newRevisionTimestamp,
        okLabel: 'Ok'
      }
    }).onOk((options: RevisionOption) => {
      resolve(options)
    })
  })

  console.log(revisionOptions)
  if (revisionOptions.revisionOption == 'update') {
    // overwrite
    bcmr.identities![authbase] = {
      [newRevisionTimestamp]: Object.assign({}, latestIdentitySnapshot)
    }
  } else {
    // add
    bcmr.identities![authbase][newRevisionTimestamp] = Object.assign({}, latestIdentitySnapshot)
  }

  // add nfts
  if (Object.keys(nftsTypes.value).length > 0) {
    if (!bcmr.identities![authbase][newRevisionTimestamp].token?.nfts) {
      bcmr.identities![authbase][newRevisionTimestamp].token!.nfts = {
        parse: {
          bytecode: '',
          types: {}
        }
      }
    }
    for (const typesKey of Object.keys(nftsTypes.value)) {
      bcmr.identities![authbase][newRevisionTimestamp].token!.nfts!.parse!.types[typesKey] = nftsTypes.value[typesKey]
    }
  }
  bcmr.latestRevision = newRevisionTimestamp
  bcmr.registryIdentity = authbase
  bcmr.versionString = revisionOptions.newVersion
  bcmr.appendAuthGuardTokenStandardExtension(authbase)
  progress.value = 'Uploading registry to IPFS, please wait...'

  let tx = ''
  try {
    const artifact = await bcmr.storeRegistry()
    if (artifact?.uris.https) {
      progress.value = 'Publishing, please wait...'
      const publisher = new AuthchainIdentity({ ...minter.value }, minter.value.transactionSigner)
      tx = await publisher.publish({ url: artifact.uris.https, contentHash: artifact.contentHash })
    }
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
          statusText: `NFTs published!`,
          txid: tx
        }
      })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${minter.value.identitSnapshot?.token?.symbol}'s nfts`
      })
      publicationTx.value = tx
      nftsTypes.value
      for (const k of Object.keys(nftsTypes.value)) {
        nftsTypes.value[k].published = true
      }
      removeSavedNftsTypes()

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
}
// End registry publication related functions

const onDone = () => {
  // Check if 
  let message
  if (!publicationTx.value) {
    message = `You haven't published the NFT metadata. Are you sure you wan't to exit?`
  } else {
    // Find any unpublished metadata
    let hasUnpublished = false
    for (const k of Object.keys(nftsTypes.value)) {
      if (!nftsTypes.value[k].published) {
        hasUnpublished = true
        break;
      }
    }
    if (hasUnpublished) {
      message = `There are NFT metadata that you've created but haven't published yet. Are you sure you want to exit?`
    } else {
      if (
        (new Set(nfts.value?.map(n => n.commitment))).size <
        (new Set(Object.keys(nftsTypes.value))).size
      ) {
        message = `You haven't created NFT metadata of other NFTs. Are you sure you want to continue?`
      }
    }
  }
  if (message) {
    $q.dialog({
      message: message,
      cancel: true
    }).onOk(() => {
      router.back()
    })
  } else {
    router.back()
  }
}

watch(() => mintStrategy.value, (v) => {
  console.log('v', v, MINT_A_MUTABLE_NFT)
  if (v?.value == MINT_A_MUTABLE_NFT) {
    return mintOptions.value.capability = NFTCapability.mutable
  }
  if (v?.value == MINT_ANOTHER_MINTER) {
    return mintOptions.value.capability = NFTCapability.minting
  }
  mintOptions.value.capability = NFTCapability.none

})

watch(() => minter.value.processing, (m) => {
  progress.value = m
})

watch(() => publisher.value?.processing, (m) => {
  progress.value = m
})


onMounted(async () => {
  ui.routeBack = `nft-reserves`
  if (minter.value.nftCollectionType == 'SequentialNftCollection') {
    mintStrategy.value = { value: MINT_NEXT_SEQUENCE, label: MINT_NEXT_SEQUENCE }
    mintOptions.value.nftType = Number(formatCommitment(minter.value.token.commitment || 0, 'vm-number', 'decimal')) + 1
  }
  if (minter.value.nftCollectionType == 'ParsableNftCollection') {
    mintStrategy.value = { value: MINT_A_TYPE, label: MINT_A_TYPE }
  }
})

</script>

<style lang="scss">
.q-stepper__title {
  font-size: medium;
}
</style>
