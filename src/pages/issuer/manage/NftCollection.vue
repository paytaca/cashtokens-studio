<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10 q-gutter-lg q-mt-lg">
        <div class="text-center text-h5 q-my-lg">
          My NFT Collections
        </div>
        <div>
          <q-table v-model:collectionsPagination="collectionsPagination" @request="onTableRequest" flat bordered grid
            color="warning" :loading="populatingCollectionsTable" title="Click a collection" :rows="collections.results"
            :rows-per-page-options="[6, 12, 18]" row-key="name" hide-header align="center">
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
          <section id="banner">
            <q-banner class="rounded-borders text-grey-4 q-pa-xs q-mb-lg"
              style="border: 3px solid rgb(73, 72, 72);border-radius: 15px; line-height: 1.3em;background: linear-gradient(109.6deg, rgb(0, 37, 84) 11.2%, rgba(0, 37, 84, 0.32) 100.2%);">
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
          <section id="owned-nfts">
            <q-table v-model:pagination="selectedCollectionOwnedNftsPagination" @request="onOwnedNftsTableRequest" flat
              bordered grid color="warning" :loading="populatingCollectionsTable"
              :title="`My ${selectedCollection?.identitySnapshot?.token?.symbol}'s`"
              :rows="selectedCollectionOwnedNfts.results" :columns="[
            {
              name: 'name', label: 'Name',
              field: r => r.nftType?._meta?.commitment ? r.nftType[r.nftType._meta.commitment]?.name : '---',
            },
            {
              name: 'commitment', label: 'Commitment',
              field: r => r.nftType?._meta?.commitment ? r.nftType._meta.commitment : '---',
            }
          ]" :rows-per-page-options="[6, 12, 24]" row-key="name" hide-header>
              <template v-slot:item="i">
                <q-skeleton v-if="i.row.processing" class="my-card q-pb-xs q-ma-sm text-center col-grow"
                  style="border-radius: 15px; max-width:200px">
                  <div class="flex justify-center">
                    <q-skeleton height="170px" width="170px" type="rect" square></q-skeleton>
                  </div>
                  <div class="q-px-sm q-mt-xs text-left">
                    <q-skeleton bordered square></q-skeleton>
                  </div>
                  <div class="flex justify-end q-mt-xs q-mr-sm">
                    <q-skeleton type="QBtn" bordered square width="3em"></q-skeleton>
                  </div>
                </q-skeleton>
                <q-card v-else class="my-card q-ma-sm text-center col-grow"
                  style="border-radius: 15px; max-width:200px">
                  <q-img v-if="i.row.nftTypeMetadata?.uris?.icon" style="height: 170px; min-width: 170px;" fit="fill"
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
                  <q-icon v-else name="perm_media" size="170px" color="grey"></q-icon>
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
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, CashToken, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { UtxoI, Wallet, NFTCapability } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import { EventBus, uid, useQuasar } from 'quasar';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useMinter } from 'src/stores/minter';
import { useUI } from 'src/stores/ui';
import { ipfsToGatewayUrl, formatCommitment } from 'src/app/utils';
import { useAuthhead } from 'src/stores/authhead';
import { shortenTokenId } from 'src/app/utils'

const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const user = useUser()
const minter = useMinter()
const eventBus = inject<EventBus>('eventBus')

const slide = ref(1)

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
const populatingCollectionsTable = ref<boolean>()


const selectedCollection = ref()
const selectedCollectionOwnedNftsPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})
const selectedCollectionOwnedNfts = ref<PaginatedData>({
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

const populateSelectedCollectionOwnedNfts = async (wallet: Wallet, transactionSigner: TransactionSigner, selectedCollection: AuthchainIdentity) => {
  populatingOwnedNftsTable.value = true
  const query = {
    limit: selectedCollectionOwnedNftsPagination.value.rowsPerPage,
    offset: (selectedCollectionOwnedNftsPagination.value.page - 1) * selectedCollectionOwnedNftsPagination.value.rowsPerPage,
    is_token: true,
    category: selectedCollection.identitySnapshot?.token?.category,
  }
  const resp = await (new Watchtower()).fetchNfts(wallet.getTokenDepositAddress(), query)
  populatingOwnedNftsTable.value = false
  if (resp?.count > 0) {
    selectedCollectionOwnedNfts.value = resp
    selectedCollectionOwnedNftsPagination.value.rowsNumber = resp.count
    selectedCollectionOwnedNfts.value.results?.forEach(async (cashtoken, i) => {
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
      selectedCollectionOwnedNfts.value.results[i] = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)
      await selectedCollectionOwnedNfts.value.results[i].resolveIdentitySnapshot()
    })
  }
}

watch(() => selectedCollection.value, async (v) => {
  document.getElementById('owned-nfts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  await populateSelectedCollectionOwnedNfts(user.wallet as Wallet, user.transactionSigner!, v)
})

onBeforeMount(async () => {
  if (user.wallet) {
    await populateCollections(user.wallet as Wallet, user.transactionSigner!)
  }
})

onMounted(() => {
  ui.routeBack = ''
})

const onTableRequest = async (props: any) => {
  collectionsPagination.value = props.collectionsPagination
  await populateCollections(user.wallet as Wallet, user.transactionSigner!)
}


const onOwnedNftsTableRequest = async (props: any) => {
  collectionsPagination.value = props.collectionsPagination
  await populateSelectedCollectionOwnedNfts(user.wallet as Wallet, user.transactionSigner!, selectedCollection.value)
}


onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>

<style scoped>
.selected {
  background: linear-gradient(95.6deg, rgb(5, 58, 127) 11.2%, rgba(0, 37, 84, 0.32) 100.2%);
}
</style>