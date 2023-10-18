<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          NFT Reserves
          <q-badge class="q-px-sm q-py-xs text-bold" color="negative" text-color="white" align="top" rounded>
            {{ paginatedNftAuthchainIdentities?.count }}
          </q-badge>
        </h5>
        <q-expansion-item label="More Info">
          <p>
            These are the NFT identities that are locked in the <a href="https://github.com/mr-zwets/AuthGuard"
              target="_blank" flat dense no-caps style="text-indent:0" class="text-secondary">AuthGuard</a> contract,
            of which you own the AuthKey. Any NFT you create in CashTokens Studio will be listed here. If the NFT has
            minting capability, you can mint new NFTs of the same category here.
          </p>
        </q-expansion-item>
        <div class="q-pa-lg flex flex-center">
          <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
            :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <q-markup-table>
          <thead>
            <tr v-if="watchtower.processing && authchainIdentities">
              <th colspan="7">
                <q-spinner-grid size="xs"></q-spinner-grid> Loading list
              </th>
            </tr>
            <tr>
              <th>#</th>
              <th>Brand</th>
              <th>Symbol</th>
              <th>Token Id</th>
              <th>Capability</th>
              <th>
                <sup>
                  <q-icon name="info" size="xs">
                    <q-tooltip>
                      If the token is a minting token. Value would be the commitment of the last minted
                      child. Value shown here are the decimal format of value on-chain.
                    </q-tooltip>
                  </q-icon>
                </sup>
                Commitment
                <q-btn-toggle v-model="commitmentFormat" push toggle-color="teal" :options="[
                  { label: '0x', value: 'hex' },
                  { label: '123', value: 'decimal' },
                ]" size="sm" dense no-caps />
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="watchtower.processing && !authchainIdentities" :col-count="7" :row-count="4"
            :caption="'Scanning wallet for NFT reserves'" />
          <tbody v-else class="text-center">
            <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i + pagination.offset + 1 }}</td>
              <td>
                <q-avatar v-if="identity.tokenUris?.icon">
                  <img :src="identity.tokenUris?.icon" alt="na">
                </q-avatar>
                <q-icon v-else name="token" size="xl" color="grey-9" />
              </td>
              <td>
                <q-chip v-if="identity.tokenCategory?.symbol" color="primary" square outline>{{
                  identity.tokenCategory?.symbol }}</q-chip>
                <span v-else>---</span>
              </td>
              <td>
                <TokenCategory :tokenId="identity.token?.tokenId" />
              </td>
              <td>{{ identity.token?.capability || '---' }}</td>
              <td>
                {{ identity.token?.commitment ? formatCommitment(identity.token?.commitment) : '---' }}
              </td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense
                  :disable="identity.token?.capability !== NFTCapability.minting">
                  <q-menu>
                    <q-list>
                      <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openMintChildDialog(identity)" clickable v-close-popup>
                        Mint Child NFT
                      </q-item>
                      <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openMintingContractDeployerDialog(identity)" clickable v-close-popup>
                        Deploy a Minting Contract
                      </q-item>
                      <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openMintingContractDeployerDialog(identity)" clickable v-close-popup>
                        Load a Minting Contract
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
            <tr v-if="authchainIdentities?.length === 0 && !watchtower.processing">
              <td colspan="7">
                No data
              </td>
            </tr>
          </tbody>
        </q-markup-table>
        <NFTMinterDialog v-if="dialog" :model-value="dialog === NFTMinterDialog.__name"
          :minter="(dialogData as CashToken)" @hide="onHide" @nft-minted="onMint" />
        <NFTMintingContractDeployerDialog v-if="dialog" :model-value="dialog === NFTMintingContractDeployerDialog.__name"
          :minter="(dialogData as CashToken)" @hide="onHide" />
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { NFTCapability, Wallet, delay } from 'mainnet-js';
import { onMounted, ref, computed, watch, inject, onBeforeUnmount } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, Watchtower } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'

import NFTMinterDialog from 'src/components/dialogs/NFTMinterDialog.vue';
import { CashToken } from 'src/app'
import { PaginatedData } from 'src/app/types';
import { binToBigIntUintLE, hexToBin } from '@bitauth/libauth';
import { EventBus } from 'quasar';
import { getWalletClass, shortenTokenId } from 'src/app/utils';
import NFTMintingContractDeployerDialog from 'src/components/dialogs/NFTMintingContractDeployerDialog.vue'
import { useUI } from 'src/stores/ui';


const user = useUser()
const ui = useUI()
const authchainIdentities = ref<AuthchainIdentity[]>()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
const paginatedNftAuthchainIdentities = ref<PaginatedData>({
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
const watchtower = ref<Watchtower>(new Watchtower())
const commitmentFormat = ref<'hex' | 'decimal'>('decimal')
const formatCommitment = computed(() => {
  return (commitment: string | undefined) => {
    if (commitment && commitmentFormat.value === 'decimal') {
      return binToBigIntUintLE(hexToBin(commitment))
    }
    return commitment
  }
})
const openMintChildDialog = (identity: AuthchainIdentity) => {
  const ct = new CashToken({ ...identity })
  ct.tokenCategory = identity.tokenCategory
  ct.tokenUris = identity.tokenUris
  openDialog(NFTMinterDialog.__name, ct)
}
const openMintingContractDeployerDialog = async (identity: AuthchainIdentity) => {
  // check if wallet has a minter
  if (!identity.tokenCategory) {
    ui.setStatusMessage({
      statusMessage: `Sorry, we only allow deploying a minting contract if the token has a valid registry`,
      statusMessageType: 'error',
    })
    return
  }
  ui.setStatusMessage({
    statusMessage: `Checking if you have a minter for ${identity.tokenCategory!.symbol} token in your wallet...`,
    statusMessageType: 'info',
    statusMessageSpinner: true
  })
  await delay(1500)
  const utxos = await user.wallet!.getAddressUtxos()
  const mintingNFT = utxos.find(u => u.token && u.token.capability === NFTCapability.minting && u.token.tokenId === identity.token!.tokenId)
  if (!mintingNFT) {
    ui.setStatusMessage({
      statusMessage: `The contract requires you to have a minter for token ${shortenTokenId(identity.token!.tokenId)} ${identity.tokenCategory!.symbol ? `(${identity.tokenCategory!.symbol})` : ''} in your wallet which currently you don't have. Although you own the NFT reserve, it is not in your wallet it's in the AuthGuard contract. Don't worry you can create a minter from the Mint Child NFT menu.`,
      statusMessageType: 'error',
    })
    return
  }
  // encapsulating mintingNFT utxo as CashToken
  const ct = new CashToken({ ...mintingNFT })
  // borrowing the already present metadata from the authchain identity output

  ct.tokenCategory = identity.tokenCategory
  ct.tokenUris = identity.tokenUris
  ct.ownerWallet = identity.ownerWallet
  ui.clearStatusMessage()
  openDialog(NFTMintingContractDeployerDialog.__name, ct)
}
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
const initPagination = () => {
  if (paginatedNftAuthchainIdentities.value && paginatedNftAuthchainIdentities.value?.count > 0) {
    pagination.value.currentPage = Math.ceil((paginatedNftAuthchainIdentities.value.offset + 1) / paginatedNftAuthchainIdentities.value.limit)
    pagination.value.maxRowsPerPage = paginatedNftAuthchainIdentities.value.limit
    pagination.value.rowCount = paginatedNftAuthchainIdentities.value.count
    pagination.value.numberOfPages = Math.ceil(paginatedNftAuthchainIdentities.value.count / paginatedNftAuthchainIdentities.value.limit)
    pagination.value.offset = paginatedNftAuthchainIdentities.value.offset
  }
}
const refreshData = async () => {
  if (user.wallet) {
    paginatedNftAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(),
      { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset, token_amount__eq: 0, token_is_nft: true }
    )
    user.paginatedNftAuthchainIdentities = paginatedNftAuthchainIdentities.value
    initPagination()
  }
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
    paginatedNftAuthchainIdentities.value = await watchtower.value.fetchAuthchainIdentities(
      user.wallet.getTokenDepositAddress(),
      { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset, token_amount__eq: 0, token_is_nft: true }
    )
    populateAuthchainIdentities(paginatedNftAuthchainIdentities.value)
    user.paginatedNftAuthchainIdentities = paginatedNftAuthchainIdentities.value
  }
})

onMounted(async () => {
  if (user.wallet) {
    /**
     * Load from store by default then refresh
     */
    if (user.paginatedNftAuthchainIdentities) {
      paginatedNftAuthchainIdentities.value = user.paginatedNftAuthchainIdentities
      populateAuthchainIdentities(paginatedNftAuthchainIdentities.value)
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

const onMint = (minted: { tokenId: string, capability: NFTCapability, commitment: string }) => {
  // refreshData().then(() => {
  //   if (paginatedNftAuthchainIdentities.value) {
  //     populateAuthchainIdentities(paginatedNftAuthchainIdentities.value)
  //   }
  // })
  hideDialog()
}

</script>
