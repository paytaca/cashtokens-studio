<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Fungible Token Balances</h5>
        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
            :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
          <q-markup-table>
            <thead>
              <tr v-if="watchtower.processing">
                <th colspan="7">
                  <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
                </th>
              </tr>
              <tr>
                <th>#</th>
                <th>Brand</th>
                <th>Symbol</th>
                <th>Token Id</th>
                <th>Balance</th>
                <th>Utxo Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <TableBodySkeleton v-if="watchtower.processing && !ftBalances" :col-count="4" :row-count="3"
              :caption="watchtower.processing" />
            <tbody v-else class="text-center">
              <tr v-for="b, i in ftBalances" :key="'ai-rec-' + i">
                <td>{{ i + pagination.offset + 1 }}</td>
                <td>
                  <q-avatar v-if="b.tokenUris?.icon">
                    <img :src="b.tokenUris?.icon" alt="na">
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="disabled" />
                </td>
                <td>
                  <q-spinner v-if="bcmrIndexer.processing"></q-spinner>
                  <div v-else>
                    <q-chip v-if="b.tokenCategory?.symbol" color="primary" class="q-p-sm" square outline>
                      {{ b.tokenCategory?.symbol }}
                    </q-chip>
                    <span v-else>---</span>
                  </div>
                </td>
                <td>
                  <TokenCategory :tokenId="b.tokenId" />
                </td>
                <td>{{ tokeshiToNumber(Number(b.balance), String(b.tokenCategory?.decimals || 0)) }}</td>
                <td>{{ b.utxoCount }}</td>
                <td>
                  <q-btn color="primary" dense no-caps @click="openDialog(FTBalanceTransferDialog.__name, b)">Send</q-btn>
                </td>
              </tr>
              <tr v-if="ftBalances?.length === 0 && !watchtower.processing">
                <td colspan="7">
                  No data
                </td>
              </tr>
            </tbody>
          </q-markup-table>
          <!-- <TokenSenderDialog :model-value="dialog === TokenSenderDialog.__name" :token-balance="dialogData"
            @hide="onHide" /> -->
          <FTBalanceTransferDialog :model-value="dialog === FTBalanceTransferDialog.__name" :token-balance="dialogData"
            @hide="onHide" />
        </q-scroll-area>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { UtxoI, Wallet } from 'mainnet-js';
import { onMounted, ref, watch } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import { Bcmr, CashToken, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import TokenSenderDialog from 'src/components/dialogs/TokenSenderDialog.vue'
import { FungibleTokenBalance, PaginatedData } from 'src/app/types';
import { BcmrIndexer } from 'src/app/bcmr/BcmrIndexer';
import { tokeshiToNumber } from 'src/app/utils';
import FTBalanceTransferDialog from 'src/components/dialogs/FTBalanceTransferDialog.vue';


defineOptions({ name: 'FungibleTokens' })

const user = useUser()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
const ftBalances = ref<FungibleTokenBalance[]>([])
const paginatedFtBalances = ref<PaginatedData>()
const watchtower = ref<Watchtower>(new Watchtower())
const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
  numberOfPages: 0,
  currentPage: 0,
  maxRowsPerPage: 0,
  rowCount: 0,
  offset: 0,
})

const bcmrIndexer = ref<BcmrIndexer>(new BcmrIndexer())

const populateFtBalances = (paginated: PaginatedData) => {
  // populate 
  ftBalances.value = []
  const results = paginated.results
  for (let i = 0; i < results.length; i++) {
    const ftBalance: FungibleTokenBalance = results[i]
    ftBalances.value.push(ftBalance)
  }
  ftBalances.value.forEach(async (a) => {
    a.tokenCategory = await bcmrIndexer.value.fetchToken(a.tokenId)
    a.tokenUris = await bcmrIndexer.value.fetchTokenUris(a.tokenId)
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

    paginatedFtBalances.value = await watchtower.value.fetchFtBalance(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )

    // populate 
    populateFtBalances(paginatedFtBalances.value)
    // ftBalances.value = []
    // const results = paginatedFtBalances.value.results
    // for (let i = 0; i < results.length; i++) {
    //   const ftBalance: FungibleTokenBalance = results[i]
    //   ftBalances.value.push(ftBalance)
    // }
    user.paginatedFtBalances = paginatedFtBalances.value
  }
})

const initPagination = () => {
  if (paginatedFtBalances.value && paginatedFtBalances.value?.count > 0) {
    pagination.value.currentPage = Math.ceil((paginatedFtBalances.value.offset + 1) / paginatedFtBalances.value.limit)
    pagination.value.maxRowsPerPage = paginatedFtBalances.value.limit
    pagination.value.rowCount = paginatedFtBalances.value.count
    pagination.value.numberOfPages = Math.ceil(paginatedFtBalances.value.count / paginatedFtBalances.value.limit)
    pagination.value.offset = paginatedFtBalances.value.offset
  }
}

const refreshData = async () => {
  if (user.wallet) {
    paginatedFtBalances.value = await watchtower.value.fetchFtBalance(
      user.wallet.getTokenDepositAddress(),
      { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    user.paginatedFtBalances = paginatedFtBalances.value
    initPagination()
  }
}

onMounted(async () => {

  if (user.wallet) {
    /**
     * Load from store by default then refresh
     */
    if (user.paginatedFtBalances) {
      paginatedFtBalances.value = user.paginatedFtBalances
      populateFtBalances(paginatedFtBalances.value)
    }
    refreshData()
  }

  // if (user.wallet) {
  //   paginatedFtBalances.value = await watchtower.value.fetchFtBalance(
  //     user.wallet.getTokenDepositAddress(),
  //     { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
  //   )
  //   initPagination()
  // ftBalances.value = (await user.wallet.getAddressUtxos())
  //     .filter((u: UtxoI) => u.token?.capability && !u.token?.amount)
  //     .map((u: UtxoI) => (
  //         { tokenId: u.token?.tokenId, capability: u.token?.capability, commitment: u.token?.commitment } as { tokenId: string, capability: NFTCapability, commitment: string }
  //     ))

  // }
})


// onMounted(async () => {
//   if (user.wallet) {
//     loading.value = 'Scanning wallet for fungible tokens'
//     const utxos = await CashToken.scanWalletForTokens('ft', user.wallet as Wallet)
//     utxos.forEach((u: UtxoI) => {
//       let b = ftBalances.value.find((b) => b.tokenId === u.token?.tokenId)
//       if (b) {
//         b.sourceUtxos.push(u)
//         b.balance += BigInt(u.token!.amount)
//       } else {
//         ftBalances.value.push({ tokenId: u.token!.tokenId, sourceUtxos: [u], balance: BigInt(u.token!.amount) })
//       }
//     })
//     loading.value = ''
//   }
// })

</script>