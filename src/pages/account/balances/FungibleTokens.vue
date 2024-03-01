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
            color="warning" :loading="populatingTable" :columns="[
              {
                name: 'balance', label: 'Balance',
                field: 'balance',
                align: 'left',
                headerStyle: 'padding: 1.5em',
                style: 'font-size: 1em;font-weight: bolder',
                classes: 'ellipsis',
                headerClasses: 'text-h5'
              },
              {
                name: 'actions', label: '',
                field: r => '',
                align: 'left',
                headerStyle: 'padding: 1.5em'

              }
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="['balance', 'actions']">

            <!-- <template v-slot:body-cell-icon="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" type="circle" bordered></q-skeleton>
                <div v-else>
                  <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                    <q-img :src="value.row.identitySnapshot.uris.icon" />
                  </q-avatar>
                  <q-icon v-else name="money" size="xl" color="grey-8"></q-icon>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-tokenid="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <TokenCategory :tokenId="value.row.tokenId" />
                </div>
              </q-td>
            </template> -->
            <template v-slot:body-cell-balance="value">
              <q-td>

                <div class="row justify-left items-center flex wrap q-gutter-sm">
                  <div class="col-auto">
                    <q-skeleton v-if="!!value.row.processing" type="circle" bordered></q-skeleton>
                    <div v-else>
                      <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                        <q-img :src="value.row.identitySnapshot.uris.icon" />
                      </q-avatar>
                      <q-icon v-else name="token" size="xl" color="grey-8"></q-icon>
                    </div>
                  </div>
                  <div class="col text-wrap text-left" style="font-size: 1.2em; letter-spacing: 2px;">
                    <template v-if="!!value.row.processing">
                      <q-skeleton bordered square></q-skeleton>
                    </template>
                    <template v-else>
                      <div style="font-variant-numeric: tabular-nums;" class="text-positive">
                        {{
                          ftAmountFormatter.toDecimal(value.row.balance.toString(),
                            value.row.identitySnapshot?.token?.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }}
                      </div>
                      <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                        ({{ value.row.identitySnapshot?.token?.symbol }})
                      </div>
                    </template>
                  </div>

                  <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                    <template v-if="!!value.row.processing">
                      <q-skeleton bordered square></q-skeleton>
                    </template>
                    <template v-else>
                      <div v-if="value.row.identitySnapshot?.token">
                        <div class="text-weight-thin text-caption text-grey-8">
                          Category: {{ shortenTokenId(value.row.identitySnapshot?.token?.category) }}
                          <CopyText :text="value.row.identitySnapshot?.token?.category" />
                        </div>
                        <div class="text-weight-thin text-caption text-grey-8">
                          Decimals: <span
                            :class="value.row.identitySnapshot?.token?.decimals ? 'text-warning' : 'text-grey-8'">{{
                              value.row.identitySnapshot?.token?.decimals }}</span>
                        </div>
                      </div>
                      <div v-else class="text-grey-8">
                        {{ '<metadata not found>' }}
                      </div>
                    </template>
                  </div>
                </div>

              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                </div>
                <template v-else>
                  <q-btn text-color="primary" icon="send" no-caps
                    @click="openDialog(FTBalanceTransferDialog.__name, value.row)"
                    :disable="value.row.balance > Number.MAX_SAFE_INTEGER" size="md"
                    :label="$q.screen.gt.xs ? 'Send' : ''"></q-btn>
                </template>
              </q-td>
            </template>
            <template v-slot:loading>
              <q-inner-loading :showing="populatingTable"></q-inner-loading>
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
import { ref, computed, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { BcmrIndexer, Watchtower } from 'src/app'
import { FungibleTokenBalance, PaginatedData } from 'src/app/types';
import { FetchUtxoQueryParams } from 'src/app/Watchtower'
import FTBalanceTransferDialog from 'src/components/dialogs/FTBalanceTransferDialog.vue';
import { IdentitySnapshot, UtxoI, Wallet } from 'mainnet-js';
import { shortenTokenId } from 'src/app/utils';
import { useQuasar } from 'quasar';
import TokenCategory from 'src/components/TokenCategory.vue'
import ftAmountFormatter from 'src/app/utils/ftAmountFormatter'
defineOptions({ name: 'NonFungibleTokens' })
const $q = useQuasar()
const user = useUser()
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
const populatingTable = ref<boolean>()
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
    populatingTable.value = true
    const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
    // $q.loading.show()
    const resp = await (new Watchtower()).fetchFtBalance(
      wallet.getTokenDepositAddress(),
      query
    )
    // $q.loading.hide()
    populatingTable.value = false
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