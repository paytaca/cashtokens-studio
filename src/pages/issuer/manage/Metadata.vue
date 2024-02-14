<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          Metadata
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
                style: 'font-size: 1em;font-weight: bold'
              },
              {
                name: 'tokenid', label: 'Category',
                field: r => r.identitySnapshot?.token?.category || '<metadata not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },

              // {
              //   name: 'authguardaddress', label: 'Authguard Address',
              //   field: r => r.authKey?.authGuard?.contract?.getTokenDepositAddress() || '---',
              //   align: 'center',
              //   headerStyle: 'padding: 1.5em'
              // },
              // {
              //   name: 'authkeytokenid', label: 'AuthKey ID',
              //   field: r => r.authKey?.token?.tokenId || '---',
              //   align: 'center',
              //   headerStyle: 'padding: 1.5em'
              // },
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
            <!-- <template v-slot:body-cell-authguardaddress="value">
              <q-td class="text-center">
                <CashAddress v-if="value.row.authKey?.authGuard?.contract?.getTokenDepositAddress()"
                  :cashaddr="value.row.authKey?.authGuard?.contract?.getTokenDepositAddress()" icon-right="lock" />
              </q-td>
            </template>
            <template v-slot:body-cell-authkeytokenid="value">
              <q-td class="text-center">
                <TokenCategory v-if="value.row.authKey?.token?.tokenId" :tokenId="value.row.authKey.token.tokenId"
                  icon-right="key" />
              </q-td>
            </template> -->
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <q-btn id="authchain-action-buttons" icon="more_vert" size="md" round flat dense
                  @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click.stop="openDialog(AuthchainRegistryPublisherDialog.__name, value.row)">
                        Publish Registry From URL
                      </q-item>
                      <q-item clickable v-close-popup
                        @click.stop="openDialog(AuthchainRegistryFromFilePublisherDialog.__name, value.row)">
                        Publish Registry From File
                      </q-item>
                      <!-- <q-item clickable v-close-popup @click.stop="openDialog(UnguardAuthchainDialog.__name, value.row)">
                          Unguard Authchain
                        </q-item>
                        <q-item clickable v-close-popup @click.stop="openDialog(AuthchainBurnerDialog.__name, value.row)">
                          Burn Token
                        </q-item> -->
                      <!-- <q-item clickable @click.stop="refreshTokenBasicMeta(identity)"> Refresh </q-item> -->
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
          <AuthchainRegistryPublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @registry-published="() => { }" />
          <AuthchainRegistryFromFilePublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryFromFilePublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @registry-published="() => { }" />
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
import { formatCommitment, ipfsToGatewayUrl, shortenTokenId } from 'src/app/utils';
import { EventBus, useQuasar } from 'quasar';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import { Token } from 'nft.storage';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';

defineOptions({ name: 'NonFungibleTokens' })
const $q = useQuasar()
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

const excludePossibleAuthKeys = ref<boolean>(true)

const transferredTokens = ref<UtxoI[]>()
const isTokenTransferred = computed(() => {
  return (utxo: UtxoI) => {
    const trans = transferredTokens.value?.find((u: UtxoI) => (
      Boolean(utxo.txid == u.txid && utxo.token?.commitment == u.token?.commitment && utxo.token?.tokenId == u.token?.tokenId)
    ))
    return trans
  }
})

const visibleColumns = computed(() => {
  if ($q.screen.lt.sm) {
    return ['icon', 'symbol']
  }
  return ['icon', 'symbol', 'tokenid', 'actions']
})

const openNFTTransferDialog = (nft: CashToken) => {
  nft.ownerWallet = user.wallet as Wallet // embedding wallet
  nft.processing = ''
  openDialog(NFTOwnershipTransferDialog.__name, nft)
}

const onNftTransfer = () => {
  if (!transferredTokens.value) {
    transferredTokens.value = []
  }
  transferredTokens.value.push(Object.assign({}, dialogData.value?.utxo))
  hideDialog()
}

watch(() => pagination.value, () => {
  transferredTokens.value = []
})

watch(() => excludePossibleAuthKeys.value, async (v) => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!, excludePossibleAuthKeys.value)
  transferredTokens.value = []
})

const onRowClicked = (event: any, authHead: AuthchainIdentity) => {
  tokenStore.value = authHead
  router.push(`/issuer/manage/token/${authHead.identitySnapshot?.token?.category || authHead.utxo?.token?.tokenId}`)
}

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner, excludePossibleAuthKeys?: boolean) => {
  if (wallet) {

    const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
    const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)

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

onBeforeMount(async () => {
  if (user.wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!, excludePossibleAuthKeys.value)
  }

})

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!, excludePossibleAuthKeys.value)
}

onMounted(async () => {
  transferredTokens.value = []
  // eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
  //   // refreshData()
  // })
})

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
