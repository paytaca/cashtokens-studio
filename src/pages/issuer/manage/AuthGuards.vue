<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          AuthGuards
        </h5>
        <div>
          <q-table v-model:pagination="pagination" @row-click="onRowClicked" @request="onTableRequest" flat bordered
            :rows="ownedAuthHeads.results" :columns="[
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
                style: 'font-size: 1em;font-weight: bold',
                classes: 'ellipsis'
              },
              {
                name: 'tokenid', label: 'Category',
                field: r => r.identitySnapshot?.token?.category || '<metadata not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'utxotx', label: 'Utxo Tx',
                field: r => shortenTx(r.txid),
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'authguard', label: 'Authguard',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'authkey', label: 'AuthKey ID',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'actions', label: 'Actions',
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
            <template v-slot:body-cell-authguard="value">
              <q-td class="text-center">
                <CashAddress v-if="value.row.authKey?.authGuard?.contract?.getTokenDepositAddress()"
                  :cashaddr="value.row.authKey.authGuard.contract.getTokenDepositAddress()"
                  tool-tip="Copy Contract Address" icon-right="lock" />
              </q-td>
            </template>
            <template v-slot:body-cell-authkey="value">
              <q-td class="text-center">
                <TokenCategory v-if="value.row.authKey?.token?.tokenId" :tokenId="value.row.authKey.token.tokenId"
                  icon-right="key" />
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <q-btn id="authchain-action-buttons" icon="more_vert" size="md" round flat dense
                  @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup @click.stop="openDialog(UnguardAuthchainDialog.__name, value.row)">
                        Unguard Authchain
                      </q-item>
                      <q-item clickable v-close-popup @click.stop="openDialog(AuthchainBurnerDialog.__name, value.row)">
                        Burn Token
                      </q-item>
                      <!-- <q-item clickable @click.stop="refreshTokenBasicMeta(identity)"> Refresh </q-item> -->
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
          <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide"
            @identity-unguarded="() => onUnguard()" />
          <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-burned="() => onBurn()" />
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, CashToken, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { FetchUtxoQueryParams } from 'src/app/Watchtower'
import NFTOwnershipTransferDialog from 'src/components/dialogs/NFTOwnershipTransferDialog.vue'
import { UtxoI, Wallet } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import CashAddress from 'src/components/CashAddress.vue'
import { formatCommitment, ipfsToGatewayUrl, shortenTokenId, shortenTx } from 'src/app/utils';
import { EventBus, useQuasar } from 'quasar';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import { Token } from 'nft.storage';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui';

const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const user = useUser()
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
    return ['symbol', 'authguard', 'actions']
  }
  return ['icon', 'symbol', 'tokenid', 'utxotx', 'authguard', 'authkey', 'actions']
})


const onRowClicked = (event: any, authHead: AuthchainIdentity) => {
  tokenStore.token = authHead
  router.push(`/issuer/manage/token/${authHead.identitySnapshot?.token?.category || authHead.utxo?.token?.tokenId}`)
}

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    $q.loading.show()
    const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
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



const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

const onUnguard = async () => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

const onBurn = async () => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

onBeforeMount(async () => {
  if (user.wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }

})

onMounted(() => {
  ui.routeBack = ''
})

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
