<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center q-mb-sm">
          NFT Reserves
        </h5>
        <q-banner inline-actions rounded class="bg-grey-10 text-grey-6 q-mb-md"
          style="border: 1px solid rgba(255,255,255,0.1)">
          <template v-slot:avatar>
            <q-icon name="info" color="primary" />
          </template>
          <div class="text-body2 text-justify">
            <strong class="text-primary">NFT Reserves</strong> are NFTs locked in an <strong>AuthGuard contract</strong>
            to prevent accidental spending of the UTXO used to update token metadata. Only the wallet holding the
            corresponding <strong>AuthKey</strong> can authorize actions — e.g., updating token metadata, or mint child
            NFTs if
            the NFT reserve is a minting NFT.
          </div>
        </q-banner>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered
            :rows="ownedAuthHeads.results" color="warning" :loading="populatingTable"
            loading-label="Loading, please wait..." :columns="[
              {
                name: 'icon', label: 'Icon',
                field: r => r.identitySnapshot?.uris?.icon || '<not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'symbol', label: 'Symbol',
                field: r => r.identitySnapshot?.token?.symbol || '<metadata not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em',
                style: 'font-size: 1em;font-weight: bold'
              },
              {
                name: 'tokenid', label: 'Category',
                field: r => r.identitySnapshot?.token?.category || '<metadata not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'commitment', label: 'Commitment',
                field: r => r.token?.commitment || '<empty>',
                align: 'center',
                headerStyle: 'padding: 1.5em',
                classes: r => {
                  if (r.token?.commitment == '') {
                    return 'text-grey-8'
                  }
                  return ''
                }
              },
              {
                name: 'capability', label: 'Capability',
                field: r => r.token?.capability,
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'actions', label: 'Actions',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'

              }
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns"
            :dense="$q.screen.lt.sm">

            <template v-slot:body-cell-icon="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="circle" bordered></q-skeleton>
                </div>
                <div v-else>
                  <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                    <q-img :src="ipfsToGatewayUrl(value.row.identitySnapshot.uris.icon)" />
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="grey-8"></q-icon>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-symbol="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <span v-if="value.row.identitySnapshot?.token?.symbol" class="text-primary text-bold text-h6">
                    <TokenSymbol :symbol="value.row.identitySnapshot.token.symbol" />
                  </span>
                  <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-tokenid="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <TokenCategory v-if="value.row.identitySnapshot?.token?.category"
                    :tokenId="value.row.identitySnapshot.token.category" />
                  <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                </div>
                <div v-else>
                  <!-- <q-btn v-if="value.row.token?.capability === NFTCapability.minting" id="authchain-action-buttons"
                    size="md" dense text-color="primary" @click.stop="openMintChildNftPage(value.row)" label="Mint Child">
                  </q-btn> -->
                  <q-btn v-if="value.row.token?.capability === NFTCapability.minting" id="authchain-action-buttons"
                    size="md" dense text-color="primary" @click.stop="openMintNftPage(value.row)" label="Mint Child">
                  </q-btn>
                  <span v-else class="text-grey-8">
                    N/A
                  </span>
                </div>
              </q-td>
            </template>
            <!-- <template v-slot:loading>
              <q-inner-loading :showing="populatingTable"></q-inner-loading>
            </template> -->
          </q-table>
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, CashToken, Watchtower } from 'src/apps'
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { UtxoI, Wallet, NFTCapability } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import { EventBus, uid, useQuasar } from 'quasar';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useMinter } from 'src/stores/minter';
import { useUI } from 'src/stores/ui';
import { ipfsToGatewayUrl } from 'src/apps/utils';
import { cashAddressToTokenAddress } from 'src/apps/utils';
import { useMetadataStore } from 'src/stores/metadata';

const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const user = useUser()
const minter = useMinter()
const eventBus = inject<EventBus>('eventBus')
const populatingTable = ref<boolean>()
const metadataStore = useMetadataStore()

const ownedAuthHeads = ref<PaginatedData>({
  count: 0,
  limit: 0,
  offset: 0,
  next: null,
  previous: null,
  results: []
})

const pagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})

const rowsPerPageOptions = computed(() => {
  return [12, 24, 36]
})


const visibleColumns = computed(() => {
  if ($q.screen.lt.sm) {
    return ['icon', 'symbol', 'actions']
  }
  return ['icon', 'symbol', 'tokenid', 'commitment', 'capability', 'actions']
})


const openMintNftPage = (identity: AuthchainIdentity) => {
  const ct = new CashToken({ ...identity }, user.transactionSigner)
  ct.identitySnapshot = identity.identitySnapshot
  minter.value = ct
  router.push({ name: 'mint-nft', query: { tokenId: identity.token!.tokenId } })
}


const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {

    populatingTable.value = true

    const query = {
      limit: pagination.value.rowsPerPage,
      offset: (pagination.value.page - 1) * pagination.value.rowsPerPage,
      token_amount__eq: 0,
      token_is_nft: true
    }
    // const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)
    const authchainIdentities = await user.fetchAuthchainIdentities(
      wallet.getTokenDepositAddress(),
      query,
      true
    ) as PaginatedData

    populatingTable.value = false
    if (authchainIdentities?.count > 0) {
      ownedAuthHeads.value = authchainIdentities
      pagination.value.rowsNumber = authchainIdentities.count
      ownedAuthHeads.value.results?.forEach(async (cashtoken, i) => {
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
        ownedAuthHeads.value.results[i] = new CashToken({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)
        // await ownedAuthHeads.value.results[i].resolveIdentitySnapshot()
        if (token?.tokenId) {
          ownedAuthHeads.value.results[i].processing = 'Resolving identity snapshot'
          ownedAuthHeads.value.results[i].identitySnapshot = await metadataStore.loadIdentitySnapshot(token.tokenId)
          ownedAuthHeads.value.results[i].processing = ''
        }
      })

    }

  }
}

watch(() => user.wallet, async (wallet) => {
  if (wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }
})


onBeforeMount(async () => {
  if (user.wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }

})

onMounted(async () => {
  ui.routeBack = ''
  if (user.wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }
})

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
