<template>
  <q-page :class="$q.screen.gt.xs ? 'q-ma-sm' : 'q-ma-xs'">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          FT Reserve Supplies
        </h5>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered
            :rows="ownedAuthHeads.results" color="warning" :loading="populatingTable"
            loading-label="Loading, please wait..." :columns="[
    {
      name: 'balance', label: 'Balance',
      field: r => r.token?.amount || 0,
      align: 'left',
      headerClasses: 'text-h5 text-bold'
    },
    {
      name: 'actions', label: '',
      field: r => '',
      align: 'center',
    }
  ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns"
            :dense="$q.screen.lt.sm">
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
                    <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>

                    <div v-else>
                      <div style="font-variant-numeric: tabular-nums;" class="text-positive">
                        {{ formatBalance(value.row) }}
                      </div>
                      <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                        ({{ value.row.identitySnapshot?.token?.symbol }})
                      </div>
                    </div>
                  </div>

                  <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                    <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                    <div v-else>
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
                    </div>
                  </div>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                </div>
                <div v-else>
                  <q-btn icon="send" size="md" :label="$q.screen.xs ? '' : 'Issue Tokens'" text-color="primary" no-caps
                    @click="openDialog(FungibleTokenIssuerDialog.__name, value.row)">
                  </q-btn>
                </div>
              </q-td>
            </template>
            <!-- <template v-slot:loading>
              <q-inner-loading :showing="populatingTable"></q-inner-loading>
            </template> -->
          </q-table>
          <FungibleTokenIssuerDialog v-if="dialog" :model-value="dialog === FungibleTokenIssuerDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide"
            @tokens-issued="(data) => onTokensIssuance(data)" />
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, computed, inject, onBeforeUnmount } from 'vue';
import { useUser } from 'src/stores/user'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { Wallet } from 'mainnet-js';
import { EventBus, useQuasar } from 'quasar';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useMinter } from 'src/stores/minter';
import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'
import { useDialogs } from 'src/composables'
import ftAmountFormatter from 'src/app/utils/ftAmountFormatter'
import { shortenTokenId } from 'src/app/utils'
import CopyText from 'src/components/CopyText.vue';

const $q = useQuasar()
const router = useRouter()
const user = useUser()
const minter = useMinter()
const tokenStore = useTokenStore()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
const populatingTable = ref<boolean>(false)
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
    return ['symbol', 'balance', 'actions']
  }
  return ['icon', 'symbol', 'tokenid', 'balance', 'decimals', 'actions']
})

const formatBalance = computed(() => {
  return (authchainIdentity: AuthchainIdentity) => {
    const [w, d] = ftAmountFormatter.toDecimal(
      authchainIdentity.token!.amount.toString(), authchainIdentity.identitySnapshot?.token?.decimals
    ).split('.')
    let b = w
    if (d && Number(d) > 0) {
      b = b + `.${d}`
    }
    b = b.includes('.') ? b.replace(/\B(?=(\d{3})+(?!\d).)/g, ",") : b.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return b
  }
})

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    populatingTable.value = true
    const query = {
      limit: pagination.value.rowsPerPage,
      offset: (pagination.value.page - 1) * pagination.value.rowsPerPage,
      token_amount__gte: 1
    }
    const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)
    populatingTable.value = false
    if (resp?.count > 0) {
      ownedAuthHeads.value = resp
      pagination.value.rowsNumber = resp.count
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
        ownedAuthHeads.value.results[i] = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)

        await ownedAuthHeads.value.results[i].resolveIdentitySnapshot()
      })

    }

  }
}


const onTokensIssuance = async (issued: { tokenId: string, to: string, amount: string }) => {
  hideDialog()
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

// onBeforeMount(async () => {
//   if (user.wallet) {
//     await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
//   }
// })

onMounted(async () => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
})

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
