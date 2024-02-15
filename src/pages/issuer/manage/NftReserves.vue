<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          NFT Reserves
        </h5>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered :rows="ownedAuthHeads.results"
            :columns="[
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
                field: r => r.token?.commitment,
                align: 'center',
                headerStyle: 'padding: 1.5em'
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
                      <q-item v-if="value.row.token?.capability === NFTCapability.minting" clickable
                        @click.stop="openMintChildNftPage(value.row)">
                        Mint Child NFT Page
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
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

const $q = useQuasar()
const router = useRouter()
const user = useUser()
const minter = useMinter()
const tokenStore = useTokenStore()
const eventBus = inject<EventBus>('eventBus')

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
    return ['icon', 'symbol']
  }
  return ['icon', 'symbol', 'tokenid', 'commitment', 'capability', 'actions']
})

const openMintChildNftPage = (identity: AuthchainIdentity) => {
  const ct = new CashToken({ ...identity }, user.transactionSigner)
  ct.tokenCategory = identity.tokenCategory
  ct.tokenUris = identity.tokenUris
  ct.identitySnapshot = identity.identitySnapshot
  minter.value = ct
  router.push({ name: 'mint-child-nft', query: { tokenId: identity.token!.tokenId } })
}

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    $q.loading.show()
    const query = {
      limit: pagination.value.rowsPerPage,
      offset: (pagination.value.page - 1) * pagination.value.rowsPerPage,
      token_amount__eq: 0,
      token_is_nft: true
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
        ownedAuthHeads.value.results[i] = new CashToken({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)
        await ownedAuthHeads.value.results[i].resolveIdentitySnapshot()
      })

    }

  }
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
