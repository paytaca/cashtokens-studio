<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          <q-icon name="money" class="q-mx-sm"></q-icon>My Fungible Tokens
          <q-badge color="warning" text-color="black" align="top" rounded>
            {{ ftBalances?.count || 0 }}
          </q-badge>
        </h5>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered :rows="ftBalances.results"
            :columns="[
              {
                name: 'icon', label: 'Icon',
                field: r => r.identitySnapshot?.uris?.icon || '<not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'tokenid', label: 'Category',
                field: 'tokenid',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'decimals', label: 'Decimals',
                field: r => !r.identitySnapshot?.token ? '<metadata not found>' : r.identitySnapshot?.token?.decimals || 0,
                align: 'center',
                headerStyle: 'padding: 1.5em',
                style: 'font-size: 1em;',
                classes: r => r.identitySnapshot?.token?.decimals ? 'ellipsis text-warning' : 'ellipsis'
              },
              {
                name: 'balance', label: 'Balance',
                field: 'balance',
                align: 'center',
                headerStyle: 'padding: 1.5em',
                style: 'font-size: 1em;font-weight: bold',
                classes: 'ellipsis'
              },
              {
                name: 'actions', label: 'Send',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'

              }
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns">

            <template v-slot:body-cell-icon="value">
              <q-td class="text-center">
                <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                  <q-img :src="value.row.identitySnapshot.uris.icon" />
                </q-avatar>
                <q-icon v-else name="money" size="xl" color="grey-8"></q-icon>
              </q-td>
            </template>

            <template v-slot:body-cell-tokenid="value">
              <q-td class="text-center">
                <TokenCategory :tokenId="value.row.tokenId" />
              </q-td>
            </template>
            <template v-slot:body-cell-balance="value">
              <q-td>
                <div class="row justify-evenly flex wrap">
                  <div class="text-positive text-right" :class="$q.screen.lt.sm ? 'col-auto' : 'col'"
                    style="font-variant-numeric: tabular-nums; font-size: 1.5em; letter-spacing: 2px;">
                    {{ ftAmountFormatter.toDecimal(value.row.balance.toString(),
                      value.row.identitySnapshot?.token?.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }} </div>

                  <div class="col text-bold text-left q-pl-sm" style="letter-spacing: 2px;">({{
                    value.row.identitySnapshot?.token?.symbol }})</div>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <q-btn text-color="primary" icon="send" dense no-caps
                  @click="openDialog(FTBalanceTransferDialog.__name, value.row)"
                  :disable="value.row.balance > Number.MAX_SAFE_INTEGER" size="md"></q-btn>
              </q-td>
            </template>
          </q-table>
        </div>
      </div>
    </div>
    <FTBalanceTransferDialog :model-value="dialog === FTBalanceTransferDialog.__name" :token-balance="dialogData"
      @hide="onHide" @ft-transferred="() => onFTTransferred()" />
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, BcmrIndexer, CashToken, Watchtower } from 'src/app'
import { FungibleTokenBalance, PaginatedData, TransactionSigner } from 'src/app/types';
import { FetchUtxoQueryParams } from 'src/app/Watchtower'
import FTBalanceTransferDialog from 'src/components/dialogs/FTBalanceTransferDialog.vue';
import { IdentitySnapshot, URIs, UtxoI, Wallet } from 'mainnet-js';
import { formatCommitment, ipfsToGatewayUrl, shortenTokenId } from 'src/app/utils';
import { EventBus, useQuasar } from 'quasar';
import TokenCategory from 'src/components/TokenCategory.vue'
import { Console } from 'console';
import ftAmountFormatter from 'src/app/utils/ftAmountFormatter'
defineOptions({ name: 'NonFungibleTokens' })
const $q = useQuasar()
const user = useUser()
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()

const visibleColumns = computed(() => {
  if ($q.screen.lt.sm) {
    return ['icon', 'balance', 'actions']
  }
  return ['icon', 'tokenid', 'decimals', 'balance', 'actions']
})

const ftBalances = ref<PaginatedData>({
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

const onFTTransferred = () => {
  hideDialog()
}

// TODO: refactor, remove this we just used this to test
class FungibleTokenBalanceImpl implements FungibleTokenBalance {
  tokenId: string
  utxoCount: number
  balance: bigint
  owner: string
  utxos?: UtxoI[]
  identitySnapshot?: IdentitySnapshot
  processing?: string
  constructor(arg: { tokenId: string, utxoCount: number, balance: bigint, owner: string, utxos?: UtxoI[], identitySnapshot?: IdentitySnapshot }) {
    this.tokenId = arg.tokenId
    this.utxos = arg.utxos
    this.utxoCount = arg.utxoCount
    this.balance = arg.balance
    this.owner = arg.owner
    this.identitySnapshot = arg.identitySnapshot
  }

  async resolveIdentitySnapshot(quite?: boolean) {
    if (!this.tokenId) return
    try {
      if (quite !== true) {
        this.processing = 'Downloading metadata'
      }
      const r = await (new BcmrIndexer()).fetchIdentitySnapshot(this.tokenId)
      this.identitySnapshot = r

    } catch (error: any) {
    } finally {
      this.processing = ''
    }
  }

}


const populateftBalances = async (wallet: Wallet) => {
  if (wallet) {
    const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
    $q.loading.show()
    const resp = await (new Watchtower()).fetchFtBalance(
      wallet.getTokenDepositAddress(),
      query
    )
    $q.loading.hide()

    if (resp?.count > 0) {
      ftBalances.value = resp
      pagination.value.rowsNumber = resp.count
      ftBalances.value.results?.forEach(async (ft: FungibleTokenBalance, i) => {
        ftBalances.value.results[i] = new FungibleTokenBalanceImpl({ ...ft })
        await ftBalances.value.results[i].resolveIdentitySnapshot()
      })
    }

  }
}

onBeforeMount(async () => {
  if (user.wallet) {
    await populateftBalances(user.wallet as Wallet)
  }

})

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateftBalances(user.wallet as Wallet)
}

// onMounted(async () => {
//   eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
//     // refreshData()
//   })
// })

// onBeforeUnmount(() => {
//   eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
// })

</script>