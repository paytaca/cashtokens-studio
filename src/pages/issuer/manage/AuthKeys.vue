<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">AuthKeys</h5>
        <q-expansion-item label="More Info">
          <p>
            When you create a token (genesis) in CSStudio it's locked in a contract called an <a
              href="https://github.com/mr-zwets/AuthGuard" target="_blank" flat dense no-caps style="text-indent:0"
              class="text-secondary">AuthGuard</a>.
            An AuthKey (or Minting Baton) is an NFT that let's the holder manage the locked tokens.
            Holder of the AuthKey can manage the authchain, issue tokens from fungible reserves or mint new NFTs
            if the token created was a `minting` NFT.
            Don't send these keys to anyone unless you intend to give them permission to manage your tokens.
          </p>
        </q-expansion-item>
        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
            :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <q-markup-table>
          <thead>
            <tr v-if="watchtower.processing && authKeys">
              <th colspan="5">
                <q-spinner-grid size="xs"></q-spinner-grid> Loading list
              </th>
            </tr>
            <tr>
              <th>#</th>
              <th>AuthKey Id</th>
              <th>AuthGuard Contract Address</th>
              <th>No. of Locked Token Identities</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="watchtower.processing && !authKeys" :col-count="5" :row-count="3"
            :caption="AuthKey.processing" />
          <tbody v-else class="text-center">
            <tr v-for="authKey, i in authKeys" :key="'ai-rec-' + i">
              <td>{{ i + pagination.offset + 1 }}</td>
              <td>
                <TokenCategory :tokenId="authKey?.utxo?.token?.tokenId" icon-right="key" />
              </td>
              <td>
                <CashAddress :cashaddr="authKey?.authGuard?.contract?.getTokenDepositAddress()"
                  tool-tip="Copy Contract Address" icon-right="lock" />
              </td>
              <td>
                <template v-if="authKey.processing">
                  <q-spinner color="cyan"></q-spinner><i>{{ authKey.processing }}</i>
                </template>
                <template v-else>
                  <q-btn
                    @click.stop="() => wOpenAuthGuardTokenListDialog(AuthGuardTokenListDialog.__name, { authKey: authKey, authGuard: authKey.authGuard })"
                    flat dense color="primary">
                    {{ authKey.unlockableTokensCount }}
                  </q-btn>
                </template>
              </td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthKeyCreateTokenDialog(AuthKeyCreateTokenDialog.__name, { authKey: authKey as AuthKey, tokenType: 'ft' })">
                        Use to create FT</q-item>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthKeyCreateTokenDialog(AuthKeyCreateTokenDialog.__name, { authKey: authKey as AuthKey, tokenType: 'nft' })">
                        Use to create NFT</q-item>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthKeyTransferDialog(AuthKeyTransferDialog.__name, authKey as AuthKey)">Transfer
                        AuthKey</q-item>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthGuardTokenListDialog(AuthGuardTokenListDialog.__name, { authKey: authKey, authGuard: authKey.authGuard })">
                        View Locked tokens
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>

            <tr v-if="authKeys?.length === 0 && !watchtower.processing">
              <td colspan="5">
                No data
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </div>
    <AuthKeyTransferDialog v-if="dialog" :auth-key="dialogData" :model-value="dialog === AuthKeyTransferDialog.__name"
      @hide="onHide" @auth-key-transferred="onAuthKeyTransfer" />
    <AuthKeyCreateTokenDialog v-if="dialog" :auth-key="dialogData.authKey" :tokenType="dialogData.tokenType"
      :model-value="dialog === AuthKeyCreateTokenDialog.__name" @hide="onHide" @genesis-result="onTokenCreate" />
    <AuthGuardTokenListDialog v-if="dialog" :model-value="dialog === AuthGuardTokenListDialog.__name"
      :auth-guard="(dialogData.authGuard as AuthGuard)" :auth-key="(dialogData.authKey as AuthKey)" @hide="onHide" />
  </q-page>
</template>
<script setup lang="ts">

import { Wallet } from 'mainnet-js';
import { useUser } from 'src/stores/user';
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthGuard, AuthKey, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue';
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue';
import AuthKeyTransferDialog from 'src/components/dialogs/AuthKeyTransferDialog.vue'
import AuthKeyCreateTokenDialog from 'src/components/dialogs/AuthKeyCreateTokenDialog.vue'
import CashAddress from 'src/components/CashAddress.vue';
import { PaginatedData } from 'src/app/types';
import { getWalletClass } from 'src/app/utils';
import { EventBus } from 'quasar';
import AuthGuardTokenListDialog from 'src/components/dialogs/AuthGuardTokenListDialog.vue';

const user = useUser()

const authKeys = ref<AuthKey[] | undefined>()
const paginatedAuthKeys = ref<PaginatedData>({
  count: 0,
  limit: 10,
  offset: 0,
  next: '',
  previous: '',
  results: []
})
const eventBus = inject<EventBus>('eventBus')
const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
  numberOfPages: 0,
  currentPage: 0,
  maxRowsPerPage: 0,
  rowCount: 0,
  offset: 0,
})
const watchtower = ref<Watchtower>(new Watchtower())

const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()


const populateAuthKeys = (paginated: PaginatedData) => {
  authKeys.value = []
  const results = paginated.results

  for (let i = 0; i < results.length; i++) {
    const {
      txid,
      vout,
      satoshis,
      height,
      coinbase,
      token,
      unlockableTokens,
      unlockableTokensCount
    } = results[i]

    const authKey = new AuthKey({ txid, vout, satoshis, height, coinbase, token, ownerWallet: user.wallet as Wallet })
    authKey.unlockableTokens = unlockableTokens
    authKey.unlockableTokensCount = unlockableTokensCount
    authKeys.value.push(authKey)
  }
}

const onTokenCreate = () => {
  // refreshData()
  hideDialog()
}

/**onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})
 * Checks and loads the managed token categories of each AuthKey.
 * Basically just checking each AuthKey's associated
 * AuthGuard contract token address for tokens.
 */
const scanAuthKeysForManagedCategories = async () => {
  if (authKeys.value) {
    for (let i = 0; i < authKeys.value.length; i++) {
      authKeys.value[i].ownerWallet = user.wallet as Wallet
      await authKeys.value[i].loadUnlockableTokens()
    }
  }
}

/**
 * Just a wrapper to openDialog so we can attach the wallet to the authKey object
 */
const wOpenAuthKeyTransferDialog = (dialogName: string | undefined, authKey: AuthKey) => {
  authKey.ownerWallet = user.wallet! as Wallet
  openDialog(dialogName, authKey)
}

/**
 * Just a wrapper to openDialog so we can attach the wallet to the authKey object
 */
const wOpenAuthKeyCreateTokenDialog = (dialogName: string | undefined, dialogData: { authKey: AuthKey, tokenType: 'ft' | 'nft' }) => {
  dialogData.authKey.ownerWallet = user.wallet! as Wallet
  openDialog(dialogName, dialogData)
}

const wOpenAuthGuardTokenListDialog = (dialogName: string | undefined, dialogData: { authKey: AuthKey, authGuard: AuthGuard }) => {
  openDialog(dialogName, dialogData)
}

const onAuthKeyTransfer = () => {
  // refreshData().then(() => {
  //   if (paginatedAuthKeys.value) {
  //     populateAuthKeys(paginatedAuthKeys.value)
  //   }
  // })
  hideDialog()
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
    paginatedAuthKeys.value = await watchtower.value.fetchAuthKeys(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    // populate 
    populateAuthKeys(paginatedAuthKeys.value)
    user.paginatedAuthKeys = paginatedAuthKeys.value
  }
})

const initPagination = () => {
  if (paginatedAuthKeys.value && paginatedAuthKeys.value?.count > 0) {
    pagination.value.currentPage = Math.ceil((paginatedAuthKeys.value.offset + 1) / paginatedAuthKeys.value.limit)
    pagination.value.maxRowsPerPage = paginatedAuthKeys.value.limit
    pagination.value.rowCount = paginatedAuthKeys.value.count
    pagination.value.numberOfPages = Math.ceil(paginatedAuthKeys.value.count / paginatedAuthKeys.value.limit)
    pagination.value.offset = paginatedAuthKeys.value.offset
  }
}

const refreshData = async () => {
  if (user.wallet) {
    paginatedAuthKeys.value = await watchtower.value.fetchAuthKeys(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    user.paginatedAuthKeys = paginatedAuthKeys.value
    initPagination()
    populateAuthKeys(paginatedAuthKeys.value)
  }
}

onMounted(async () => {
  if (user.wallet) {
    /**
     * Load from store by default then refresh
     */
    if (user.paginatedAuthKeys) {
      paginatedAuthKeys.value = user.paginatedAuthKeys
      populateAuthKeys(paginatedAuthKeys.value)
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



</script>
