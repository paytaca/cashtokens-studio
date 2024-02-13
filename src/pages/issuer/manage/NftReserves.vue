<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          NFT Reserves
          <q-badge class="q-px-sm q-py-xs text-bold" color="negative" text-color="white" align="top" rounded>
            {{ identityOutputs.nftReserves.count || 0 }}
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
          <q-pagination v-model="identityOutputs.paginator.currentPage" :max="identityOutputs.paginator.numberOfPages"
            :max-pages="identityOutputs.paginator.maxRowsPerPage" :boundary-numbers="false" />
        </div>
        <!-- {{
          identityOutputs.nftReserves?.results
        }} -->
        <q-markup-table>
          <thead>
            <!-- <tr v-if="watchtower.processing && authchainIdentities">
              <th colspan="7">
                <q-spinner-grid size="xs"></q-spinner-grid> Loading
              </th>
            </tr> -->
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
          <!-- <TableBodySkeleton v-if="watchtower.processing && !authchainIdentities" :col-count="7" :row-count="4"
            :caption="'Scanning wallet for NFT reserves'" /> -->
          <tbody class="text-center">
            <tr v-for="identity, i in identityOutputs.nftReserves?.results" :key="'ai-rec-' + i">
              <td>{{ i + identityOutputs.paginator.offset + 1 }}</td>
              <td>
                <q-avatar v-if="identity.identitySnapshot?.uris?.icon" square>
                  <q-img :src="String(identity.identitySnapshot.uris.icon)" alt="na" />
                </q-avatar>
                <q-icon v-else name="token" size="xl" color="grey-9" class="token-default-avatar" />
              </td>
              <td>
                <q-chip v-if="identity.identitySnapshot?.token?.symbol" color="primary" class="q-p-sm" square outline>
                  {{ identity.identitySnapshot?.token?.symbol }}
                </q-chip>
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
                  :disable="identity.token?.capability !== NFTCapability.minting || !!identity.processing">
                  <q-menu>
                    <q-list>
                      <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openMintChildDialog(identity)" clickable v-close-popup>
                        Mint Child NFT
                      </q-item>
                      <q-item v-if="identity.token?.capability === NFTCapability.minting" clickable
                        @click.stop="openMintChildNftPage(identity)">
                        Mint Child NFT Page
                      </q-item>
                      <!-- <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openMintingContractDeployerDialog(identity)" clickable v-close-popup>
                        Deploy a Minting Contract
                      </q-item> -->
                      <!-- <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openMintingContractDeployerDialog(identity)" clickable v-close-popup>
                        Load a Minting Contract
                      </q-item> -->
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
            <tr v-if="identityOutputs.nftReserves?.results?.length === 0 && !watchtower.processing">
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
import { binToBigIntUintLE, hexToBin } from '@bitauth/libauth';
import { EventBus } from 'quasar';
import { onMounted, ref, computed, watch, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user';
import { useUI } from 'src/stores/ui';
import { useDialogs } from 'src/composables'
import {
  CashToken,
  Watchtower,
  AuthKey, AuthchainIdentity,
  TOKEN_CATEGORY_CACHE_MAX_KEYS, TOKEN_URIS_CACHE_MAX_KEYS, ADDRESS_WATCHER_TRIGGERED
} from 'src/app';
import { PaginatedData } from 'src/app/types';
import { getWalletClass, shortenTokenId } from 'src/app/utils';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import NFTMinterDialog from 'src/components/dialogs/NFTMinterDialog.vue';
import NFTMintingContractDeployerDialog from 'src/components/dialogs/NFTMintingContractDeployerDialog.vue'
import { useRouter } from 'vue-router';
import { useIdentityOutputs } from 'src/stores/identityoutputs';
import { useMinter } from 'src/stores/minter';

const user = useUser()
const ui = useUI()
const router = useRouter()
const minter = useMinter()
const identityOutputs = useIdentityOutputs()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
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
  const ct = new CashToken({ ...identity }, user.transactionSigner)
  ct.tokenCategory = identity.tokenCategory
  ct.tokenUris = identity.tokenUris
  openDialog(NFTMinterDialog.__name, ct)
}

const openMintChildNftPage = (identity: AuthchainIdentity) => {
  const ct = new CashToken({ ...identity }, user.transactionSigner)
  ct.tokenCategory = identity.tokenCategory
  ct.tokenUris = identity.tokenUris
  ct.identitySnapshot = identity.identitySnapshot
  minter.value = ct
  router.push(`/issuer/tokens/mint-child-nft?tokenId=${identity.token!.tokenId}`)
}

// const openMintingContractDeployerDialog = async (identity: AuthchainIdentity) => {
//   // check if wallet has a minter
//   if (!identity.tokenCategory) {
//     ui.setStatusMessage({
//       statusMessage: `Sorry, we only allow deploying a minting contract if the token has a valid registry`,
//       statusMessageType: 'error',
//     })
//     return
//   }
//   ui.setStatusMessage({
//     statusMessage: `Checking if you have a minter for ${identity.tokenCategory!.symbol} token in your wallet...`,
//     statusMessageType: 'info',
//     statusMessageSpinner: true
//   })
//   await delay(1500)
//   const utxos = await user.wallet!.getAddressUtxos()
//   const mintingNFT = utxos.find(u => u.token && u.token.capability === NFTCapability.minting && u.token.tokenId === identity.token!.tokenId)
//   if (!mintingNFT) {
//     ui.setStatusMessage({
//       statusMessage: `The contract requires you to have a minter for token ${shortenTokenId(identity.token!.tokenId)} ${identity.tokenCategory!.symbol ? `(${identity.tokenCategory!.symbol})` : ''} in your wallet which currently you don't have. Although you own the NFT reserve, it is not in your wallet it's in the AuthGuard contract. Don't worry you can create a minter from the Mint Child NFT menu.`,
//       statusMessageType: 'error',
//     })
//     return
//   }
//   // encapsulating mintingNFT utxo as CashToken
//   const ct = new CashToken({ ...mintingNFT })
//   // borrowing the already present metadata from the authchain identity output

//   ct.tokenCategory = identity.tokenCategory
//   ct.tokenUris = identity.tokenUris
//   ct.ownerWallet = identity.ownerWallet
//   ui.clearStatusMessage()
//   openDialog(NFTMintingContractDeployerDialog.__name, ct)
// }

watch(() => identityOutputs.paginator.currentPage, async (pageNumber) => {
  identityOutputs.paginator.offset = (pageNumber - 1) * identityOutputs.paginator.maxRowsPerPage
  identityOutputs.populateNftReserves({ wallet: user.wallet as Wallet, transactionSigner: user.transactionSigner })
})

onBeforeMount(async () => {
  if (user.wallet) {
    identityOutputs.populateNftReserves(
      { wallet: user.wallet as Wallet, transactionSigner: user.transactionSigner }
    )
  }
})

onMounted(async () => {
  eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
    identityOutputs.populateNftReserves(
      { wallet: user.wallet as Wallet, transactionSigner: user.transactionSigner }
    )
  })
})

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

const onMint = (minted: { tokenId: string, capability: NFTCapability, commitment: string }) => {
  hideDialog()
}

</script>
