<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          Your Tokens
          <q-badge color="blue-5" text-color="black" align="top" rounded>
            {{ paginatedAuthchainIdentities?.count }}
          </q-badge>
        </h5>
        <p class="text-center">
          These are the token categories that you control. All the tokens that you created in CashTokens Studio will be
          listed here. Click an item on this list to view the token details.
        </p>
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
                    <img :src="identity.tokenUris?.icon" alt="na">
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="disabled" />
                </td>
                <td class="cursor-pointer">
                  <q-spinner v-if="identity.processing === 'Checking token registry'"></q-spinner>
                  <div v-else>
                    <q-chip v-if="identity.tokenCategory?.symbol" color="primary" class="q-p-sm" square outline>
                      {{ identity.tokenCategory?.symbol }}
                    </q-chip>
                    <span v-else>---</span>
                  </div>
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
                          Burn Authchain
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
              <tr v-if="authchainIdentities && watchtower.processing">
                <td :colspan="viewType === 'simple' ? 7 : 8">
                  <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
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
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
        <AuthchainRegistryFromFilePublisherDialog v-if="dialog"
          :model-value="dialog === AuthchainRegistryFromFilePublisherDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
        <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-unguarded="onUnguard" />
        <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-burned="onBurn" />

      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { Wallet } from 'mainnet-js';
import { onMounted, ref, watch } from 'vue';
import { useUser } from 'src/stores/user';
import { useUI } from 'src/stores/ui';
import { useDialogs } from 'src/composables'
import { AuthKey, AuthchainIdentity, CashToken, Watchtower } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import CashAddress from 'src/components/CashAddress.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import { PaginatedData } from 'src/app/types';
import { useRouter } from 'vue-router';


const user = useUser()
const ui = useUI()
const router = useRouter()
const viewType = ref<string>('simple')
const authchainIdentities = ref<AuthchainIdentity[]>()
const paginatedAuthchainIdentities = ref<PaginatedData>()
const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
  numberOfPages: 0,
  currentPage: 0,
  maxRowsPerPage: 0,
  rowCount: 0,
  offset: 0,
})



const { dialog, dialogData, openDialog, onHide } = useDialogs()
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
    await a.resolveTokenCategory()
    await a.resolveTokenUris()
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
    paginatedAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    // populate 
    populateAuthchainIdentities(paginatedAuthchainIdentities.value)
    // authchainIdentities.value = []
    // const results = paginatedAuthchainIdentities.value.results
    // for (let i = 0; i < results.length; i++) {
    //   const authKeyUtxoClone = Object.assign({}, results[i].authKey)
    //   const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
    //   const {
    //     txid,
    //     vout,
    //     satoshis,
    //     height,
    //     coinbase,
    //     token
    //   } = results[i]

    //   const authchainIdentity = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: user.wallet as Wallet })
    //   authchainIdentities.value.push(authchainIdentity)
    // }

    // authchainIdentities.value.forEach(async (a: AuthchainIdentity) => {
    //   await a.resolveTokenCategory()
    //   await a.resolveTokenUris()
    // })
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

const refreshData = async () => {
  if (user.wallet) {
    paginatedAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
    )
    user.paginatedAuthchainIdentities = paginatedAuthchainIdentities.value
    initPagination()
  }
}

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

})




const onUnguard = () => {
  refreshData().then(() => {
    if (paginatedAuthchainIdentities.value) {
      populateAuthchainIdentities(paginatedAuthchainIdentities.value)
    }
  })
}

const onBurn = () => {
  refreshData().then(() => {
    if (paginatedAuthchainIdentities.value) {
      populateAuthchainIdentities(paginatedAuthchainIdentities.value)
    }
  })
}

const viewToken = (token: AuthchainIdentity, b: any) => {
  if ((b.target.innerHTML !== 'more_vert' && !b.target.className?.includes('col-action')) && !b.target.className?.includes('col-authkey')) {
    ui.tokenInView = token
    // router.push(`/issuer/manage/token/${token.tokenCategory?.symbol || token.tokenCategory?.category}`)
    router.push(`/issuer/manage/token/${token.token?.tokenId}`)
  }
}

</script>
