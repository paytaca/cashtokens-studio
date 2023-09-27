<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          Fungible Token Reserves
          <q-badge color="blue-5" text-color="black" align="top" rounded>
            {{ paginatedFtAuthchainIdentities?.count }}
          </q-badge>
        </h5>
        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
            :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <q-markup-table>
          <thead>
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
                  <img :src="identity.tokenUris?.icon" alt="na">
                </q-avatar>
                <q-icon v-else name="token" size="xl" color="grey-9" />
              </td>
              <td>
                <q-chip v-if="identity.tokenCategory?.symbol" color="primary" square outline>{{
                  identity.tokenCategory?.symbol }}</q-chip>
                <span v-else>---</span>
              </td>
              <td>
                <TokenCategory :tokenId="identity.token?.tokenId" />
              </td>

              <!-- <td>{{ BigInt(identity.token!.amount! as number) || 'n/a' }}</td> -->
              <td>{{ formatReservedSupply(identity) }}</td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="openDialog(FungibleTokenIssuerDialog.__name, identity, { tokenIdentityIndex: i })">
                        Issue Tokens
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
            <tr v-if="watchtower.processing && authchainIdentities">
              <td colspan="6">
                <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
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
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'
import { PaginatedData } from 'src/app/types';
import { tokeshiToNumber } from 'src/app/utils';


const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
const paginatedFtAuthchainIdentities = ref<PaginatedData>()
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
    await a.resolveTokenCategory()
    await a.resolveTokenUris()
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
    // populate 
    // authchainIdentities.value = []
    // const results = paginatedFtAuthchainIdentities.value.results
    // for (let i = 0; i < results.length; i++) {
    //   const authKeyUtxoClone = Object.assign({}, results[i].authKey)
    //   const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
    //   const {
    //     txid,
    //     vout,
    //     satoshis,
    //     height,
    //     coinbase,
    //     token
    //   } = results[i]

    //   const authchainIdentity = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: user.wallet as Wallet })
    //   authchainIdentities.value.push(authchainIdentity)
    // }

    // authchainIdentities.value.forEach(async (a: AuthchainIdentity) => {
    //   await a.resolveTokenCategory()
    //   await a.resolveTokenUris()
    // })

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
    initPagination()
  }
}

onMounted(async () => {

  if (user.wallet) {
    /**
     * Load from store by default then refresh
     */
    if (user.paginatedFtAuthchainIdentities) {
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


// onMounted(async () => {
//   if (user.wallet) {
//     if (user.authchainIdentities) {
//       authchainIdentities.value = user.authchainIdentities as AuthchainIdentity[]
//     }
//     paginatedFtAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(user.wallet.getTokenDepositAddress(), { token_amount__gte: 1 })
//     initPagination()
//     // authchainIdentities.value = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
//     // user.authchainIdentities = authchainIdentities.value

//     // authchainIdentities.value.forEach(async (a: AuthchainIdentity) => {
//     //   await a.resolveTokenCategory()
//     //   await a.resolveTokenUris()
//     // })
//   }

// })


const onTokensIssuance = (issued: { tokenId: string, to: string, amount: string }) => {
  // AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
  //   .then((values) => {
  //     authchainIdentities.value = [...values]
  //   })


  refreshData().then(() => {
    if (paginatedFtAuthchainIdentities.value) {
      populateAuthchainIdentities(paginatedFtAuthchainIdentities.value)
    }
  })
  hideDialog()

}

</script>
