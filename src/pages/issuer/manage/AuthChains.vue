<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          Token Categories
          <q-badge class="q-px-sm q-py-xs text-bold" color="negative" text-color="white" align="top" rounded>
            {{ paginatedAuthchainIdentities?.count }}
          </q-badge>
        </h5>
        <p class="text-center">
          These are the token categories that you control. All the tokens that you created in CashTokens Studio will be
          listed here. Click an item on this list to view the token details.
        </p>
        <q-expansion-item label="More Info">
          <p>
            The token categories here are utxos that are authheads of these token categories' authchain. So, we can use
            this
            to manage the token's metadata and fungible reserves. These are the same utxos listed in the FT Reserves and
            NFT Reserves
            page. These are locked with the AuthGuard contract so you don't accidentally misuse these utxos.
          </p>
        </q-expansion-item>
        <div class="row justify-end q-my-sm">
          <q-btn-toggle v-model="viewType" push toggle-color="teal" :options="[
            { label: 'Simple View', value: 'simple' },
            { label: 'Detailed View', value: 'detailed' },
          ]" size="md" dense no-caps flat />
        </div>
        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
            :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <q-scroll-area style="position:relative; height:200vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
          <q-markup-table>
            <thead>
              <tr v-if="authchainIdentities && watchtower.processing">
                <th :colspan="viewType === 'simple' ? 7 : 8">
                  <q-spinner-grid size="xs"></q-spinner-grid> Loading
                </th>
              </tr>
              <tr>
                <th>#</th>
                <th>Brand</th>
                <th>Symbol</th>
                <th>Token Id</th>
                <template v-if="viewType == 'detailed'">
                  <th>Fungible Reserves</th>
                  <th>NFT Capability</th>
                  <th>
                    NFT Commitment

                  </th>
                </template>
                <th>AuthGuard Contract Address</th>
                <th>AuthKey</th>
                <th>Action</th>
              </tr>
            </thead>
            <TableBodySkeleton v-if="!authchainIdentities && watchtower.processing"
              :col-count="viewType === 'simple' ? 7 : 8" :row-count="3" :caption="watchtower.processing" />
            <tbody v-else class="text-center">
              <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i"
                @click="(b: any) => viewToken(identity, b)">
                <td class="cursor-pointer">{{ i + pagination.offset + 1 }}</td>
                <td class="cursor-pointer">
                  <q-avatar v-if="identity.tokenUris?.icon">
                    <img :src="String(identity.tokenUris.icon)" alt="na">
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="grey-9" class="token-default-avatar" />
                </td>
                <td class="cursor-pointer">
                  <q-spinner
                    v-if="(identity.processing === 'Checking token registry' && !ui.tokenCategoryCache[identity.token!.tokenId]?.symbol) || (updatingTokenCache && updatingTokenCache[identity.token!.tokenId])"></q-spinner>
                  <span v-else>
                    <!-- <q-chip v-if="identity.tokenCategory?.symbol" color="primary" class="q-p-sm" square outline>
                      {{ identity.tokenCategory.symbol }}
                    </q-chip> -->
                    <q-chip
                      v-if="ui.tokenCategoryCache[identity.token!.tokenId]?.symbol || identity.tokenCategory?.symbol"
                      color="primary" class="q-p-sm" square outline>
                      {{ ui.tokenCategoryCache[identity.token!.tokenId]?.symbol || identity.tokenCategory?.symbol }}
                    </q-chip>
                    <span v-else>---</span>
                  </span>
                </td>
                <td>
                  <TokenCategory :tokenId="identity.token?.tokenId" />
                </td>
                <template v-if="viewType == 'detailed'">
                  <td>{{ identity.token?.amount || 'n/a' }}</td>
                  <td>{{ identity.token?.capability || 'n/a' }}</td>
                  <td>{{ identity.token?.commitment || 'n/a' }}</td>
                </template>
                <td>
                  <CashAddress :cashaddr="identity.authKey?.authGuard?.contract?.getTokenDepositAddress()"
                    tool-tip="Copy Contract Address" icon-right="lock" />
                </td>
                <td class="col-authkey">
                  <TokenCategory :token-id="identity.authKey?.token?.tokenId" icon-right="key" />
                </td>
                <td class="col-action">
                  <q-btn id="authchain-action-buttons" icon="more_vert" size="md" round flat dense
                    @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
                    <q-menu>
                      <q-list>
                        <q-item clickable v-close-popup
                          @click.stop="openDialog(AuthchainRegistryPublisherDialog.__name, identity)">
                          Publish Registry From URL
                        </q-item>
                        <q-item clickable v-close-popup
                          @click.stop="openDialog(AuthchainRegistryFromFilePublisherDialog.__name, identity)">
                          Publish Registry From File
                        </q-item>
                        <q-item clickable v-close-popup @click.stop="openDialog(UnguardAuthchainDialog.__name, identity)">
                          Unguard Authchain
                        </q-item>
                        <q-item clickable v-close-popup @click.stop="openDialog(AuthchainBurnerDialog.__name, identity)">
                          Burn Token
                        </q-item>
                        <q-item clickable @click.stop="refreshTokenBasicMeta(identity)"> Refresh </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
              <tr v-if="authchainIdentities?.length === 0 && !watchtower.processing">
                <td :colspan="viewType === 'simple' ? 7 : 8">
                  No data
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-scroll-area>
        <AuthchainRegistryPublisherDialog v-if="dialog" :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide"
          @registry-published="() => onRegistryPublished(dialogData)" />
        <AuthchainRegistryFromFilePublisherDialog v-if="dialog"
          :model-value="dialog === AuthchainRegistryFromFilePublisherDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide"
          @registry-published="() => onRegistryPublished(dialogData)" />
        <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide"
          @identity-unguarded="() => onUnguard()" />
        <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-burned="() => onBurn()" />

      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { Wallet, delay } from 'mainnet-js';
import { EventBus } from 'quasar';
import { onMounted, ref, watch, inject, onBeforeUnmount } from 'vue';
import { useUser } from 'src/stores/user';
import { useUI } from 'src/stores/ui';
import { useDialogs } from 'src/composables'
import {
  AuthKey, AuthchainIdentity, Watchtower,
  TOKEN_CATEGORY_CACHE_MAX_KEYS, TOKEN_URIS_CACHE_MAX_KEYS, ADDRESS_WATCHER_TRIGGERED
} from 'src/app';
import { PaginatedData } from 'src/app/types';
import { useRouter } from 'vue-router';
import { getWalletClass } from 'src/app/utils';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import CashAddress from 'src/components/CashAddress.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'


const user = useUser()
const ui = useUI()
const router = useRouter()
const viewType = ref<string>('simple')
const authchainIdentities = ref<AuthchainIdentity[]>()
const paginatedAuthchainIdentities = ref<PaginatedData>({
  count: 0,
  limit: 10,
  offset: 0,
  next: '',
  previous: '',
  results: []
})
const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
  numberOfPages: 0,
  currentPage: 0,
  maxRowsPerPage: 0,
  rowCount: 0,
  offset: 0,
})
// const updatingTokenCache = ref<boolean>(false)
const updatingTokenCache = ref<{ [tokenId: string]: boolean } | null>()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
const watchtower = ref<Watchtower>(new Watchtower())

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
    if (a.token && !ui.tokenCategoryCache[a.token.tokenId]) {
      await a.resolveTokenCategory()
      if (a.tokenCategory && Object.keys(ui.tokenCategoryCache).length < TOKEN_CATEGORY_CACHE_MAX_KEYS) {
        ui.tokenCategoryCache[a.token.tokenId] = a.tokenCategory
      }
    } else {
      a.tokenCategory = ui.tokenCategoryCache[a.token!.tokenId]
    }

    if (a.token && !ui.tokenUrisCache[a.token.tokenId]) {
      await a.resolveTokenUris()
      if (a.tokenUris && Object.keys(ui.tokenUrisCache).length < TOKEN_URIS_CACHE_MAX_KEYS) {
        ui.tokenUrisCache[a.token.tokenId] = a.tokenUris
      }
    } else {
      a.tokenUris = ui.tokenUrisCache[a.token!.tokenId]
    }
  })
}

watch(() => pagination.value.currentPage, async (pageNumber, oldPageNumber) => {
  if (user.wallet) {
    if (paginatedAuthchainIdentities.value) {
      authchainIdentities.value = []
    }
    pagination.value.offset = (pageNumber - 1) * pagination.value.maxRowsPerPage
    paginatedAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    // populate 
    populateAuthchainIdentities(paginatedAuthchainIdentities.value)
  }
})

const initPagination = () => {
  if (paginatedAuthchainIdentities.value && paginatedAuthchainIdentities.value?.count > 0) {
    pagination.value.currentPage = Math.ceil((paginatedAuthchainIdentities.value.offset + 1) / paginatedAuthchainIdentities.value.limit)
    pagination.value.maxRowsPerPage = paginatedAuthchainIdentities.value.limit
    pagination.value.rowCount = paginatedAuthchainIdentities.value.count
    pagination.value.numberOfPages = Math.ceil(paginatedAuthchainIdentities.value.count / paginatedAuthchainIdentities.value.limit)
    pagination.value.offset = paginatedAuthchainIdentities.value.offset
  }
}

const refreshData = async (immediate?: boolean) => {
  if (!immediate) {
    await delay(2500)
  }
  if (user.wallet) {
    paginatedAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    user.paginatedAuthchainIdentities = paginatedAuthchainIdentities.value
    initPagination()
    populateAuthchainIdentities(paginatedAuthchainIdentities.value)
  }
}

const refreshTokenBasicMeta = async (token: AuthchainIdentity) => {
  try {
    updatingTokenCache.value = { [token.token!.tokenId]: true }
    await token.resolveTokenCategory()
    await token.resolveTokenUris()
    if (token.tokenCategory) {
      ui.tokenCategoryCache[token.token!.tokenId] = token.tokenCategory
    }
    if (token.tokenUris) {
      ui.tokenUrisCache[token.token!.tokenId] = token.tokenUris
    }
  } catch (error) {
    updatingTokenCache.value = null
  } finally {
    updatingTokenCache.value = null
  }

}

const onRegistryPublished = async (tokenIdentity: AuthchainIdentity) => {
  hideDialog()
  await delay(3000)
  await refreshTokenBasicMeta(tokenIdentity)
}

watch(() => user.walletAddress, async (v) => {
  if (v) {
    // keep so page survives reload
    user.wallet = await getWalletClass().watchOnly(v)
    refreshData()
    eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
      // refreshes data if the address watcher is triggered
      refreshData()
    })
  } else {
    // turn off
    eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
  }
})

onMounted(async () => {
  if (user.wallet) {
    /**
     * Load from store by default then refresh
     */
    if (user.paginatedAuthchainIdentities) {
      paginatedAuthchainIdentities.value = user.paginatedAuthchainIdentities
      populateAuthchainIdentities(paginatedAuthchainIdentities.value)
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


const onUnguard = async () => {
  refreshData().then(() => {
    if (paginatedAuthchainIdentities.value) {
      populateAuthchainIdentities(paginatedAuthchainIdentities.value)
    }
  })
}

const onBurn = async () => {
  refreshData().then(() => {
    if (paginatedAuthchainIdentities.value) {
      populateAuthchainIdentities(paginatedAuthchainIdentities.value)
    }
  })
}

const viewToken = (token: AuthchainIdentity, b: any) => {
  if ((b.target.innerHTML !== 'more_vert' && !b.target.className?.includes('col-action')) && !b.target.className?.includes('col-authkey')) {
    ui.tokenInView = token
    router.push(`/issuer/manage/token/${token.token?.tokenId}`)
  }
}

</script>
