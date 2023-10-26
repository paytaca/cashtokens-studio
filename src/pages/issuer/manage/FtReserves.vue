<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          Fungible Token Reserves
          <q-badge class="q-px-sm q-py-xs text-bold" color="negative" text-color="white" align="top" rounded>
            {{ paginatedFtAuthchainIdentities?.count }}
          </q-badge>
        </h5>
        <q-expansion-item label="More Info">
          <p>
            These are the FT identities (utxos) that are locked in the <a href="https://github.com/mr-zwets/AuthGuard"
              target="_blank" flat dense no-caps style="text-indent:0" class="text-secondary">AuthGuard</a>
            contract,
            of which you own the AuthKey. Any FT you create in CashTokens Studio will be listed here. The amount held by
            each of the FT identity is considered as reserve supply. You can issue or release any amount from the reserve
            supply
            here.
          </p>
        </q-expansion-item>
        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
            :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <q-markup-table>
          <thead>
            <tr v-if="watchtower.processing && authchainIdentities">
              <th colspan="6">
                <q-spinner-grid size="xs"></q-spinner-grid> Loading list
              </th>
            </tr>
            <tr>
              <th>#</th>
              <th>Brand</th>
              <th>Symbol</th>
              <th>Token Id</th>
              <th>Reserved Supplies</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="watchtower.processing && !authchainIdentities" :col-count="6" :row-count="3"
            :caption="'Scanning wallet for FT reserves'" />
          <tbody v-else class="text-center">
            <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i + pagination.offset + 1 }}</td>
              <td>
                <q-avatar v-if="identity.tokenUris?.icon">
                  <img :src="String(identity.tokenUris.icon)" alt="na">
                </q-avatar>
                <q-icon v-else name="token" size="xl" color="grey-9" class="token-default-avatar" />
              </td>
              <td>
                <q-spinner
                  v-if="identity.processing === 'Checking token registry' && !ui.tokenCategoryCache[identity.token!.tokenId]?.symbol"></q-spinner>
                <span v-else>
                  <q-chip v-if="identity.tokenCategory?.symbol" color="primary" class="q-p-sm" square outline>
                    {{ identity.tokenCategory.symbol }}
                  </q-chip>
                  <span v-else>---</span>
                </span>
              </td>
              <td>
                <TokenCategory :tokenId="identity.token?.tokenId" />
              </td>

              <!-- <td>{{ BigInt(identity.token!.amount! as number) || 'n/a' }}</td> -->
              <td>{{ formatReservedSupply(identity) }}</td>
              <td>
                <q-btn icon="send_time_extension" size="md" label="Issue Tokens" color="primary" dense no-caps
                  @click="openDialog(FungibleTokenIssuerDialog.__name, identity, { tokenIdentityIndex: i })">
                  <!-- <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="openDialog(FungibleTokenIssuerDialog.__name, identity, { tokenIdentityIndex: i })">
                        Issue Tokens
                      </q-item>
                    </q-list>
                  </q-menu> -->
                </q-btn>
              </td>
            </tr>

            <tr v-if="authchainIdentities?.length === 0 && !watchtower.processing">
              <td colspan="6">
                No data
              </td>
            </tr>
          </tbody>
        </q-markup-table>
        <FungibleTokenIssuerDialog v-if="dialog" :model-value="dialog === FungibleTokenIssuerDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @tokens-issued="onTokensIssuance" />
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { Wallet } from 'mainnet-js';
import { EventBus } from 'quasar';
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, TOKEN_CATEGORY_CACHE_MAX_KEYS, TOKEN_URIS_CACHE_MAX_KEYS, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'
import { PaginatedData } from 'src/app/types';
import { getWalletClass, tokeshiToNumber } from 'src/app/utils';
import { useUI } from 'src/stores/ui';


const user = useUser()
const ui = useUI()
const authchainIdentities = ref<AuthchainIdentity[]>()
const paginatedFtAuthchainIdentities = ref<PaginatedData>({
  count: 0,
  limit: 10,
  offset: 0,
  next: '',
  previous: '',
  results: []
})
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
  numberOfPages: 0,
  currentPage: 0,
  maxRowsPerPage: 0,
  rowCount: 0,
  offset: 0,
})
const watchtower = ref<Watchtower>(new Watchtower())
const eventBus = inject<EventBus>('eventBus')
const formatReservedSupply = computed(() => {
  return (authchainIdentity: AuthchainIdentity) => {

    if (authchainIdentity.token!.amount && authchainIdentity.tokenCategory?.decimals) {
      return tokeshiToNumber(
        Number(authchainIdentity.token!.amount), authchainIdentity.tokenCategory?.decimals.toString()
      )
    }
    return authchainIdentity.token?.amount
  }
})

const populateAuthchainIdentities = (paginated: PaginatedData) => {
  authchainIdentities.value = []
  const results = paginated.results
  for (let i = 0; i < results.length; i++) {
    const authKeyUtxoClone = Object.assign({}, results[i].authKey)
    const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
    const {
      txid,
      vout,
      satoshis,
      height,
      coinbase,
      token
    } = results[i]
    const authchainIdentity = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: user.wallet as Wallet })
    authchainIdentities.value.push(authchainIdentity)
  }

  authchainIdentities.value.forEach(async (a: AuthchainIdentity) => {

    // await a.resolveTokenCategory(quite)
    // await a.resolveTokenUris(quite)
    if (a.token && !ui.tokenCategoryCache[a.token.tokenId]) {
      await a.resolveTokenCategory()
      if (a.tokenCategory && Object.keys(ui.tokenCategoryCache).length < TOKEN_CATEGORY_CACHE_MAX_KEYS) {
        ui.tokenCategoryCache[a.token.tokenId] = a.tokenCategory
      }
    } else {
      a.tokenCategory = ui.tokenCategoryCache[a.token!.tokenId]
    }

    if (a.token && !ui.tokenUrisCache[a.token.tokenId]) {
      await a.resolveTokenUris()
      if (a.tokenUris && Object.keys(ui.tokenCategoryCache).length < TOKEN_URIS_CACHE_MAX_KEYS) {
        ui.tokenUrisCache[a.token.tokenId] = a.tokenUris
      }
    } else {
      a.tokenUris = ui.tokenUrisCache[a.token!.tokenId]
    }
  })
}


watch(() => pagination.value.currentPage, async (pageNumber, oldPageNumber) => {
  if (user.wallet) {
    if (pageNumber === 1) {
      pagination.value.offset = 0
    } else {
      if (oldPageNumber > pageNumber) {
        pagination.value.offset -= pagination.value.maxRowsPerPage
      } else {
        pagination.value.offset += pagination.value.maxRowsPerPage
      }
    }
    paginatedFtAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(),
      { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset, token_amount__gte: 1 }
    )

    populateAuthchainIdentities(paginatedFtAuthchainIdentities.value)
    user.paginatedFtAuthchainIdentities = paginatedFtAuthchainIdentities.value
  }
})

const initPagination = () => {
  if (paginatedFtAuthchainIdentities.value && paginatedFtAuthchainIdentities.value?.count > 0) {
    pagination.value.currentPage = Math.ceil((paginatedFtAuthchainIdentities.value.offset + 1) / paginatedFtAuthchainIdentities.value.limit)
    pagination.value.maxRowsPerPage = paginatedFtAuthchainIdentities.value.limit
    pagination.value.rowCount = paginatedFtAuthchainIdentities.value.count
    pagination.value.numberOfPages = Math.ceil(paginatedFtAuthchainIdentities.value.count / paginatedFtAuthchainIdentities.value.limit)
    pagination.value.offset = paginatedFtAuthchainIdentities.value.offset
  }
}

const refreshData = async () => {
  if (user.wallet) {
    paginatedFtAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(),
      { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset, token_amount__gte: 1 }
    )
    user.paginatedFtAuthchainIdentities = paginatedFtAuthchainIdentities.value
    populateAuthchainIdentities(paginatedFtAuthchainIdentities.value)
    initPagination()
  }
}

watch(() => user.walletAddress, async (v) => {
  if (v) {
    // keep so page survives reload
    user.wallet = await getWalletClass().watchOnly(v)
    refreshData()
    eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
      refreshData()
    })
  } else {
    eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
  }

})

onMounted(async () => {
  if (user.wallet) {
    /**
     * Load from store by default then refresh
     */
    if (user.paginatedFtAuthchainIdentities?.results) {
      paginatedFtAuthchainIdentities.value = user.paginatedFtAuthchainIdentities
      populateAuthchainIdentities(paginatedFtAuthchainIdentities.value)
    }
    refreshData()
  }
  eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
    refreshData()
  })
})

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

const onTokensIssuance = (issued: { tokenId: string, to: string, amount: string }) => {
  hideDialog()
  // refreshData().then(() => {
  //   if (paginatedFtAuthchainIdentities.value) {
  //     populateAuthchainIdentities(paginatedFtAuthchainIdentities.value)
  //   }
  // })
}

</script>
