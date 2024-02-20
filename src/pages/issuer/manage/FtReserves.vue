<template>
  <q-page :class="$q.screen.gt.xs ? 'q-ma-sm' : 'q-ma-xs'">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          FT Reserve Supplies
        </h5>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered :rows="ownedAuthHeads.results"
            :columns="[
              {
                name: 'icon', label: 'Icon',
                field: r => r.identitySnapshot?.uris?.icon || '<not found>',
                align: 'center',
                headerStyle: $q.screen.lt.sm ? 'padding: 5px;' : 'padding: 1.5em',
                classes: (r => !r.identitySnapshot?.token ? 'text-grey-8' : '')
              },
              {
                name: 'symbol', label: 'Symbol',
                field: r => r.identitySnapshot?.token?.symbol || '<metadata not found>',
                align: 'center',
                classes: (r => !r.identitySnapshot?.token?.symbol ? 'text-grey-8' : '')
              },
              {
                name: 'tokenid', label: 'Category',
                field: r => r.identitySnapshot?.token?.category || '<metadata not found>',
                align: 'center',
                classes: (r => !r.identitySnapshot ? 'text-grey-8' : '')
              },
              {
                name: 'decimals', label: 'Decimals',
                field: r => {
                  if (!r.identitySnapshot || !r.identitySnapshot?.token) {
                    return '<metadata not found>'
                  }
                  if (r.identitySnapshot?.token?.decimals == undefined) {
                    return '<unknown>'
                  }
                  return r.identitySnapshot?.token?.decimals
                },
                align: 'center',
                classes: (r => !r.identitySnapshot?.token?.decimals ? 'text-grey-8' : '')
              },
              {
                name: 'balance', label: 'Balance',
                field: r => r.token?.amount || 0,
                align: 'center',
              },
              {
                name: 'actions', label: 'Actions',
                field: r => '',
                align: 'center',
              }
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns"
            :dense="$q.screen.lt.sm">

            <template v-slot:body-cell-icon="value">
              <q-td class="text-center">
                <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                  <q-img :src="value.row.identitySnapshot.uris.icon" />
                </q-avatar>
                <q-icon v-else name="token" size="xl" color="grey-8"></q-icon>
              </q-td>
            </template>
            <template v-slot:body-cell-symbol="value">
              <q-td class="text-center">
                <span v-if="value.row.identitySnapshot?.token?.symbol" class="text-primary text-bold text-h6">
                  <TokenSymbol :symbol="value.row.identitySnapshot.token.symbol" />
                </span>
                <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
              </q-td>
            </template>
            <template v-slot:body-cell-tokenid="value">
              <q-td class="text-center">
                <TokenCategory v-if="value.row.identitySnapshot?.token?.category"
                  :tokenId="value.row.identitySnapshot.token.category" />
                <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
              </q-td>
            </template>
            <template v-slot:body-cell-balance="value">
              <q-td class="text-center">
                <span>{{ formatReservedSupply(value.row) }}</span>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <q-btn icon="send" size="md" :label="$q.screen.xs ? '' : 'Issue Tokens'" text-color="primary" dense
                  no-caps @click="openDialog(FungibleTokenIssuerDialog.__name, value.row)">
                </q-btn>
              </q-td>
            </template>
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
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, CashToken, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { UtxoI, Wallet, NFTCapability } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import { EventBus, useQuasar } from 'quasar';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useMinter } from 'src/stores/minter';
import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'
import { useDialogs } from 'src/composables'
import ftAmtFormatter from 'src/app/utils/ftAmountFormatter'

const $q = useQuasar()
const router = useRouter()
const user = useUser()
const minter = useMinter()
const tokenStore = useTokenStore()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
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

const formatReservedSupply = computed(() => {
  return (authchainIdentity: AuthchainIdentity) => {

    if (authchainIdentity.token!.amount && authchainIdentity.identitySnapshot?.token?.decimals) {
      return ftAmtFormatter.toDecimal(
        authchainIdentity.token!.amount.toString(), authchainIdentity.identitySnapshot?.token?.decimals
      )
    }
    return authchainIdentity.token?.amount
  }
})

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    $q.loading.show()
    const query = {
      limit: pagination.value.rowsPerPage,
      offset: (pagination.value.page - 1) * pagination.value.rowsPerPage,
      token_amount__gte: 1
    }
    const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)
    $q.loading.hide()
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

onBeforeMount(async () => {
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
