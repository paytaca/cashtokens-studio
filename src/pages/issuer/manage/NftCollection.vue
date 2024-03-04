<template>
  <q-page>
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 q-mt-lg" :class="$q.screen.gt.xs ? 'q-ma-sm' : ''">
        <div class="text-center text-h5 q-my-lg">
          My NFT Collections
        </div>
        <div>
          <q-table v-model:collectionsPagination="collectionsPagination" @request="onTableRequest" flat bordered grid
            color="warning" :loading="populatingCollectionsTable" title="Click a collection" :rows="collections.results"
            :rows-per-page-options="[12, 18, 24]" row-key="name" hide-header align="center">
            <template v-slot:item="i">
              <q-btn class="q-ma-sm col-grow" style="border-radius: 15px; max-width:95px; width: min-content"
                @click="() => { if (!i.row.processing) selectedCollection = i.row }"
                :class="selectedCollection?.txid == i.row?.txid ? 'selected' : ''">
                <q-card flat>
                  <q-skeleton v-if="i.row.processing" height="80px" width="80px" type="rect" square></q-skeleton>
                  <q-img v-else-if="i.row.identitySnapshot?.uris?.icon"
                    style="border-radius: 10px;height: 80px; max-width:80px; min-width: 80px;" fit="fill"
                    :src="i.row.identitySnapshot?.uris?.icon ? (i.row.identitySnapshot.uris?.icon.startsWith('ipfs://') ? ipfsToGatewayUrl(i.row.identitySnapshot.uris.icon) : i.row.identitySnapshot.uris.icon) : ''"
                    alt="na">
                  </q-img>
                  <q-icon v-else name="broken_image" color="grey-8" size="80"></q-icon>
                </q-card>
              </q-btn>
            </template>
          </q-table>
        </div>

        <template v-if="selectedCollection">
          <div style="border:3px solid rgb(73, 72, 72);border-radius: 15px">
            <section id="banner">
              <q-banner class="rounded-borders text-grey-4 q-pa-xs q-mb-lg"
                style="border-radius: 15px 15px 0 0;line-height: 1.3em; background: linear-gradient(109.6deg, rgb(0, 37, 84) 11.2%, rgba(0, 37, 84, 0.32) 100.2%);">
                <div class="row items-center q-p-sm">
                  <div class="col">
                    <q-chip size="1.5em" class="bg-transparent">
                      <q-avatar>
                        <q-img v-if="selectedCollection?.identitySnapshot?.uris?.icon"
                          :src="ipfsToGatewayUrl(selectedCollection.identitySnapshot.uris.icon)" />
                        <q-icon v-else name="broken_image" color="grey-8"></q-icon>
                      </q-avatar>
                      <span style="letter-spacing: 5px;">
                        {{ selectedCollection?.identitySnapshot?.token?.symbol }}
                      </span>
                    </q-chip>
                  </div>
                </div>
              </q-banner>
            </section>
            <div class="q-px-sm">
              <section id="minted-nfts">
                <div class="text-h6 q-my-lg row justify-between">
                  <span>{{ selectedCollection?.identitySnapshot?.token?.symbol }}'s NFTs in circulation</span>
                  <q-btn v-if="Object.keys(nftsTypesForPublication || {}).length > 0" @click="openNftsForPubDialog">
                    Unpublished Metadata <q-badge>{{ Object.keys(nftsTypesForPublication || {}).length }}</q-badge>
                  </q-btn>
                </div>
                <div style="overflow-x: scroll">
                  <q-table v-model:pagination="mintedNftsPagination" flat :rows="mintedNfts.results"
                    :loading="populatingMintedNftsTable" color="warning" @request="onMintedNftsRequest"
                    style="background:unset;margin-bottom: 3rem;" :columns="[
        {
          name: 'nfttype', label: 'Nft Type',
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
      ]" :rows-per-page-options="[12, 24, 36]" row-key="id" :visible-columns="['nfttype', 'actions']">
                    <template v-slot:body-cell-nfttype="value">
                      <td>
                        <div class="row justify-left items-center flex wrap q-gutter-sm">
                          <div class="col-auto">
                            <q-avatar v-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.icon"
                              rounded>
                              <q-img
                                :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.icon)" />
                            </q-avatar>
                            <q-avatar
                              v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.image"
                              rounded>
                              <q-img
                                :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.image)" />
                            </q-avatar>
                            <q-avatar
                              v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.asset"
                              rounded>
                              <q-img
                                :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.asset)" />
                            </q-avatar>
                            <q-icon v-else name="broken_image" size="xl" color="grey-8" round></q-icon>
                          </div>
                          <div class="col text-wrap text-left" style="font-size: 1.5em; letter-spacing: 2px;">
                            <div style="font-variant-numeric: tabular-nums;" class="text-grey-4 text-bold">
                              {{ !value.row.identitySnapshot?.nfts?.parse?.bytecode &&
        value.row.identitySnapshot?.nfts?.parse?.bytecode !== '00d26b' ?
        `#${formatCommitment(value.row._meta?.commitment || value.row.commitment, 'vm-number',
          'decimal')}` :
        value.row._meta?.commitment }}
                            </div>
                            <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                              <span
                                v-if="nftsTypesForPublication && nftsTypesForPublication[value.row._meta?.commitment || value.row.commitment]?.name">
                                {{ nftsTypesForPublication[value.row._meta?.commitment || value.row.commitment].name }}
                              </span>
                              <span v-else>
                                {{
        `(${value.row[value.row._meta?.commitment || value.row.commitment]?.name || 'noname'})`
      }}
                              </span>

                            </div>
                          </div>
                          <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                            <div class="text-grey-6 ellipsis-2-lines">
                              Description: {{
          value.row[value.row._meta?.commitment || value.row.commitment].description
          || '<no description>' }}
                            </div>
                          </div>
                          <!-- <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                          <div class="text-grey-8">
                            Commitment: {{
              value.row._meta?.commitment || value.row.commitment
            }}
                          </div>
                        </div> -->
                          <!-- <div v-if="value.row.capability" class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                          <div class="text-grey-8">
                            Capability: {{
              value.row.capability
            }}
                          </div>
                        </div> -->
                          <div
                            v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment]).length == 0"
                            class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                            <div class="text-grey-8">
                              {{ `<no metadata>` }}
                            </div>
                          </div>
                        </div>
                      </td>
                    </template>

                    <template v-slot:body-cell-actions="value">
                      <q-td class="text-center">
                        <!-- {{ value.row?._meta?.commitment }}
                      <div
                        v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment]).length == 0">
                        <q-btn label="Add Metadata" text-color="primary"
                          :to="{ name: 'nft-metadata', query: { authhead: tokenStore.token.txid, commitment: value.row._meta?.commitment || value.row.commitment, capability: value.row.capability, amount: value.row.amount } }"
                          disable>
                        </q-btn>
                        <div class="text-grey-8">under development</div>
                      </div> -->
                        <div>
                          <q-btn label="Metadata" text-color="primary"
                            @click.stop="openNftTypeDialog(value.row as TokenI)" dense>
                            <!-- <q-icon size="xs" :name="!nftsTypes[value.row.commitment] ? 'add' : 'edit'"></q-icon> -->
                            <template v-slot:default>
                              <q-icon size="xs"
                                :name="!nftsTypesForPublication && !nftsTypesForPublication[value.row._meta?.commitment || value.row.commitment] ? 'add' : 'edit'"></q-icon>
                            </template>
                          </q-btn>
                        </div>
                      </q-td>
                    </template>
                  </q-table>

                </div>
              </section>
              <section id="owned-nfts">
                <div class="text-h6">{{ selectedCollection?.identitySnapshot?.token?.symbol }} NFT(s) in your wallet
                </div>
                <q-table v-model:pagination="ownedNftsPagination" @request="onOwnedNftsTableRequest" flat bordered grid
                  color="warning" :loading="populatingOwnedNftsTable" :rows="ownedNfts.results" :columns="[
        {
          name: 'name', label: 'Name',
          field: r => r.nftType?._meta?.commitment ? r.nftType[r.nftType._meta.commitment]?.name : '---',
        },
        {
          name: 'commitment', label: 'Commitment',
          field: r => r.nftType?._meta?.commitment ? r.nftType._meta.commitment : '---',
        }
      ]" :rows-per-page-options="[6, 12, 24]" row-key="name" hide-header align="center">

                  <template v-slot:item="i">
                    <q-skeleton v-if="i.row.processing" class="my-card q-pb-xs q-ma-md text-center col-grow"
                      style="border-radius: 15px; max-width:180px">
                      <div class="flex justify-center">
                        <q-skeleton height="140px" width="140px" type="rect" square></q-skeleton>
                      </div>
                      <div class="q-px-sm q-mt-xs text-left">
                        <q-skeleton bordered square></q-skeleton>
                      </div>
                      <div class="flex justify-end q-mt-xs q-mr-sm">
                        <q-skeleton type="QBtn" bordered square width="3em"></q-skeleton>
                      </div>
                    </q-skeleton>
                    <q-card v-else class="my-card q-ma-md text-center col-grow"
                      style="border-radius: 15px; max-width:180px">
                      <q-img v-if="i.row.nftTypeMetadata?.uris?.icon"
                        style="width:140px; height: 140px; min-width: 170px;" fit="fill"
                        :src="i.row.nftTypeMetadata?.uris?.icon ? (i.row.nftTypeMetadata.uris?.icon.startsWith('ipfs://') ? ipfsToGatewayUrl(i.row.nftTypeMetadata.uris.icon) : i.row.nftTypeMetadata.uris.icon) : ''"
                        alt="na">
                        <div class="absolute-bottom text-left">
                          <div class="text-subtitle1">
                            {{
        i.row.token?.commitment ? (i.row.nftCollectionType ==
          'SequentialNftCollection' ? '#' + formatCommitment(i.row.token.commitment,
            'vm-number',
            'decimal') : i.row.token.commitment) : ''
      }}
                          </div>
                        </div>
                      </q-img>
                      <q-icon v-else name="perm_media" size="140px" color="grey"></q-icon>
                      <div class="q-px-sm text-left">
                        <code class="text-caption">{{ `<${i.row.token.commitment}>` }}</code>
                        <div v-if="i.row.nftTypeMetadata?.name" class="ellipsis">
                          {{ i.row.nftTypeMetadata?.name }}
                        </div>
                        <div v-else-if="i.row.token?.commitment" class="ellipsis">
                          <code class="text-caption">{{ `<${shortenTokenId(i.row.token.tokenId)}>` }}</code>
                        </div>
                      </div>
                      <q-card-actions align="right">
                        <!-- <q-btn dense no-caps icon="send" size="lg" text-color="primary"
                        :disable="!!isTokenTransferred(i.row.utxo)"
                        @click="() => openNFTTransferDialog(i.row as CashToken)">
                      </q-btn> -->
                      </q-card-actions>
                      <q-inner-loading :showing="!!isTokenTransferred(i.row.utxo)" label="Test">
                        <span class="text-bold text-negative q-px-sm rounded-borders">Sent</span>
                        <q-spinner-gears class="hidden"></q-spinner-gears>
                      </q-inner-loading>
                    </q-card>
                  </template>
                </q-table>
              </section>
            </div>
          </div>
        </template>
      </div>
    </div>
    <q-inner-loading :showing="!!progress">
      <q-spinner id="inner-loading" size="5em" color="warning" class="q-mb-lg"></q-spinner>
      <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">{{ progress }}</span>
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, Bcmr, BcmrIndexer, CashToken, ChainGraph, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { UtxoI, Wallet, NFTCapability, NftType, TokenI, delay, IdentitySnapshot } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import NftTypeDialog from 'src/components/dialogs/NftTypeDialog.vue'
import NftTypesForPublicationDialog from 'src/components/dialogs/NftTypesForPublicationDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { EventBus, uid, useQuasar } from 'quasar';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useLocalForage } from 'src/composables/useLocalForage';
import { useUI } from 'src/stores/ui';
import { ipfsToGatewayUrl, formatCommitment } from 'src/app/utils';
import { useAuthhead } from 'src/stores/authhead';
import { shortenTokenId } from 'src/app/utils'
import NftTypeForPublicationDialog from 'src/components/dialogs/NftTypeForPublicationDialog.vue';
import { useEventBus } from 'src/composables';

const $q = useQuasar()
const { $ebus } = useEventBus()
const ui = useUI()
const user = useUser()
const localForage = useLocalForage()
const eventBus = inject<EventBus>('eventBus')
const progress = ref<string | boolean>()

// Nft collections, authheads carrying minting tokens
const collections = ref<PaginatedData>({
  count: 0,
  limit: 0,
  offset: 0,
  next: null,
  previous: null,
  results: []
})
const collectionsPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})

const selectedCollection = ref()

const populatingCollectionsTable = ref<boolean>()

// Nfts that are already minted
const mintedNfts = ref<PaginatedData>({
  count: 0,
  limit: 0,
  offset: 0,
  next: null,
  previous: null,
  results: []
})
const mintedNftsPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})
const mintedNftsSelected = ref()
const populatingMintedNftsTable = ref<boolean>()


const nftsTypesForPublication = ref<{ [commitmentOrbottomAltStackItemHex: string]: NftType & { saved?: boolean, published?: boolean } }>({})

// Nfts that are owned by this wallet 
const ownedNftsPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})
const ownedNfts = ref<PaginatedData>({
  count: 0,
  limit: 0,
  offset: 0,
  next: null,
  previous: null,
  results: []
})
const populatingOwnedNftsTable = ref<boolean>()

/**
 * Remember's the transferred NFTs after a transfer transaction.
 */
const transferredTokens = ref<UtxoI[]>()

/**
 * True if the utxo is in the transferredTokens list
 */
const isTokenTransferred = computed(() => {
  return (utxo: UtxoI) => {
    const trans = transferredTokens.value?.find((u: UtxoI) => (
      Boolean(utxo.txid == u.txid && utxo.token?.commitment == u.token?.commitment && utxo.token?.tokenId == u.token?.tokenId)
    ))
    return trans
  }
})


const populateCollections = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    populatingCollectionsTable.value = true
    const query = {
      limit: collectionsPagination.value.rowsPerPage,
      offset: (collectionsPagination.value.page - 1) * collectionsPagination.value.rowsPerPage,
      token_amount__eq: 0,
      token_is_nft: true,
      token_capability: NFTCapability.minting
    }
    const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)
    populatingCollectionsTable.value = false
    if (resp?.count > 0) {
      collections.value = resp
      collectionsPagination.value.rowsNumber = resp.count
      collections.value.results?.forEach(async (cashtoken, i) => {
        const authKeyUtxoClone = Object.assign({}, cashtoken.authKey)
        const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
        const {
          txid,
          vout,
          satoshis,
          height,
          coinbase,
          token
        } = cashtoken
        collections.value.results[i] = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)
        await collections.value.results[i].resolveIdentitySnapshot()
      })
    }
  }
}

const populateMintedNfts = async () => {
  mintedNfts.value = {
    count: 0,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results: []
  }

  console.log('pagination', mintedNftsPagination.value)

  const query = {
    paginated: true,
    // limit: mintedNftsPagination.value.rowsPerPage,
    // offset: (mintedNftsPagination.value.page - 1) * mintedNftsPagination.value.rowsPerPage,
    page: mintedNftsPagination.value.page,
    include_metadata: true,
    capability: ['none', 'mutable']
  }
  // if (showselectedCollectionsInMintedNfts.value) {
  //   query.capability.push('minting')
  // }
  populatingMintedNftsTable.value = true

  const fntResp = await (new BcmrIndexer()).fetchMintedNftTypes(selectedCollection.value?.identitySnapshot?.token?.category, query)

  if (fntResp && fntResp.results) {
    console.log('RESPONSE', fntResp)
    mintedNftsPagination.value.rowsNumber = fntResp.count
    type ItemType = {
      capability?: string,
      commitment?: string,
      amount?: number,
      metadata: { nft?: { [key: string]: NftType } }
    }

    fntResp.results = fntResp.results.map((item: ItemType) => {
      // Transform
      const { metadata, ...rest } = item
      if (item.metadata?.nft) {
        return { ...rest, ...item.metadata.nft }
      }
      return { ...rest, ...{ [item.commitment as string]: {} } }
    })
    mintedNfts.value = fntResp
  }
  populatingMintedNftsTable.value = false
}

const populatedOwnedNfts = async (wallet: Wallet, transactionSigner: TransactionSigner, selectedCollection: AuthchainIdentity) => {
  populatingOwnedNftsTable.value = true
  const query = {
    limit: ownedNftsPagination.value.rowsPerPage,
    offset: (ownedNftsPagination.value.page - 1) * ownedNftsPagination.value.rowsPerPage,
    is_token: true,
    category: selectedCollection.identitySnapshot?.token?.category,
  }
  const resp = await (new Watchtower()).fetchNfts(wallet.getTokenDepositAddress(), query)
  populatingOwnedNftsTable.value = false
  if (resp?.count > 0) {
    ownedNfts.value = resp
    ownedNftsPagination.value.rowsNumber = resp.count
    ownedNfts.value.results?.forEach(async (cashtoken, i) => {
      const authKeyUtxoClone = Object.assign({}, cashtoken.authKey)
      const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: wallet })
      const {
        txid,
        vout,
        satoshis,
        height,
        coinbase,
        token
      } = cashtoken
      ownedNfts.value.results[i] = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)
      await ownedNfts.value.results[i].resolveIdentitySnapshot()
    })
  }
}

const loadUnpublishedNftTypes = async (selectedCollection: AuthchainIdentity) => {
  nftsTypesForPublication.value = {}
  for (const [index, key] of (await localForage.nftTypesStore.keys()).entries()) {
    if (key.startsWith(selectedCollection.token!.tokenId)) {

      let item: {
        [key: string]: NftType,
      } & { _meta: { commitment: string }, id: number | string } | null

        = await localForage.nftTypesStore.getItem(key)
      if (item && typeof (item) == 'string') {
        item = JSON.parse(item)
      }
      nftsTypesForPublication.value = { ...item, ...nftsTypesForPublication.value || {} }
    }
  }
}

const onTableRequest = async (props: any) => {
  collectionsPagination.value = props.pagination
  await populateCollections(user.wallet as Wallet, user.transactionSigner!)
}

const onOwnedNftsTableRequest = async (props: any) => {
  ownedNftsPagination.value = props.pagination
  await populatedOwnedNfts(user.wallet as Wallet, user.transactionSigner!, selectedCollection.value)
}

const onMintedNftsRequest = async (props: any) => {
  ownedNftsPagination.value = props.pagination
  await populateMintedNfts()
}

const locateRegistry = async () => {
  const r = await (new BcmrIndexer()).fetchRegistry(selectedCollection.value?.identitySnapshot?.token?.category || selectedCollection.value.token?.tokenId, true)
  try {
    if (r) {
      return r
    } else {
      progress.value = `Unable to find registry from Paytaca's BCMR indexer.`
      await delay(1000)
      if (selectedCollection.value.token?.tokenId) {
        progress.value = `Trying other methods please wait...`
        await delay(1000)
        progress.value = `Retrieving last registry publication, using the authhead UTXO's Token ID as authbase...`
        const pubInfo = await (new ChainGraph()).retrieveLastRegistryPublication(selectedCollection.value.token.tokenId)
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

const removeSavedNftsTypes = async () => {
  for (const type of Object.keys(nftsTypesForPublication.value)) {
    try {
      await localForage.nftTypesStore.removeItem(`${selectedCollection.value.token.tokenId}-${type}`)
    } catch (error) {
      console.log('Error removing NFT Type from local storage')
    }
  }
}

const publish = async () => {

  progress.value = 'Authenticating authhead, please wait...'
  try {

    const trackedAuthhead = await (new ChainGraph()).fetchAuthheadTxid(selectedCollection.value.token.tokenId)
    progress.value = false
    if (trackedAuthhead != selectedCollection.value.txid) {
      await new Promise(res => {
        $q.dialog({
          message: `This UTXO is not authorized to publish metadata for token ${shortenTokenId(selectedCollection.value.token.tokenId)}`,
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
  progress.value = 'Creating metadata revision...'
  const bcmr = new Bcmr({ ...r })
  const newRevisionTimestamp = new Date().toISOString()
  const authbase = selectedCollection.value.token.tokenId
  const { latestIdentitySnapshot, latestRevisionTimestamp } = getLatestIdentitySnapshot(r, authbase)

  bcmr.identities![authbase] = {
    [newRevisionTimestamp]: Object.assign({}, latestIdentitySnapshot)
  }

  // add nfts
  if (Object.keys(nftsTypesForPublication.value).length > 0) {
    if (!bcmr.identities![authbase][newRevisionTimestamp].token?.nfts) {
      bcmr.identities![authbase][newRevisionTimestamp].token!.nfts = {
        parse: {
          bytecode: '',
          types: {}
        }
      }
    }
    for (const typesKey of Object.keys(nftsTypesForPublication.value)) {
      bcmr.identities![authbase][newRevisionTimestamp].token!.nfts!.parse!.types[typesKey] = nftsTypesForPublication.value[typesKey]
    }
  }
  bcmr.latestRevision = newRevisionTimestamp
  bcmr.registryIdentity = authbase
  bcmr.appendAuthGuardTokenStandardExtension(authbase)
  progress.value = 'Uploading registry to IPFS, please wait...'

  let tx = ''
  try {
    const artifact = await bcmr.storeRegistry()
    if (artifact?.uris.https) {
      progress.value = 'Publishing, please wait...'
      const publisher = new AuthchainIdentity({ ...selectedCollection.value }, selectedCollection.value.transactionSigner)
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
      await selectedCollection.value.ownerWallet.waitForTransaction({ txHash: tx })
      await selectedCollection.value.updateUtxo(tx)
      await selectedCollection.value.updateAuthKeyUtxo(tx)
      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: `NFT(s) published!`,
          txid: tx
        }
      })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${selectedCollection.value.identitSnapshot?.token?.symbol}'s nfts`
      })
      nftsTypesForPublication.value = {}
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

const openNftTypeDialog = (token: TokenI) => {
  const defaultNftType = {
    name: selectedCollection.value.nftCollectionType == 'SequentialNftCollection' ? `${selectedCollection.value.identitySnapshot?.token?.symbol} - ${formatCommitment(token.commitment || '', 'vm-number', 'decimal')}` : `${selectedCollection.value.identitySnapshot?.token?.symbol} - ${token.commitment}`,
    uris: {
      icon: '',
      asset: ''
    }
  }
  $q.dialog({
    component: NftTypeDialog,
    componentProps: {
      token: token,
      title: selectedCollection.value.nftCollectionType == 'SequentialNftCollection' ? `Metadata of ${selectedCollection.value.identitySnapshot?.token?.symbol} #${formatCommitment(token.commitment || '', 'vm-number', 'decimal')}` : 'Metadata',
      defaultNftType: nftsTypesForPublication.value[token.commitment!] || defaultNftType
    }
  }).onOk(async ({ type, nftType }) => {
    nftsTypesForPublication.value[type] = nftType
    await localForage.nftTypesStore.setItem(`${selectedCollection.value.token.tokenId}-${type}`, { [type]: JSON.parse(JSON.stringify(nftsTypesForPublication.value[type])) })
    // console.log('nfts types', nftsTypesForPublication.value)

  })
}

const openNftsForPubDialog = () => {
  $q.dialog({
    component: NftTypesForPublicationDialog,
    componentProps: {
      authhead: selectedCollection.value,
      nftsTypes: Object.keys(nftsTypesForPublication.value || {}).map(nftTypeKey => ({ [nftTypeKey]: nftsTypesForPublication.value[nftTypeKey] }))
    }
  }).onOk(async () => {
    console.log('Publishing this', nftsTypesForPublication.value)
    await publish()
  })
}

watch(() => selectedCollection.value, async (v) => {
  document.getElementById('minted-nfts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  await populateMintedNfts()
  await populatedOwnedNfts(user.wallet as Wallet, user.transactionSigner!, v)
  await loadUnpublishedNftTypes(selectedCollection.value)
})

watch(() => progress.value, (v) => {
  const top = window.scrollY
  const left = window.scrollX
  if (v) {
    document.getElementById('inner-loading')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else {
    window.scrollTo(left, top)
  }
})

onBeforeMount(async () => {
  if (user.wallet) {
    await populateCollections(user.wallet as Wallet, user.transactionSigner!)
  }
})

onMounted(async () => {
  ui.routeBack = ''

})



onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>

<style scoped>
.selected {
  background: linear-gradient(95.6deg, rgb(5, 58, 127) 11.2%, rgba(0, 37, 84, 0.32) 100.2%);
}
</style>