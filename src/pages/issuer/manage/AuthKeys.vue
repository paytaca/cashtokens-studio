<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">List of AuthKeys</h5>
        <p>An AuthKey is an NFT that you'd use to manage the authchain, fungible reserves and/or NFT minters. Don't send
          these
          keys to anyone unless you intend to give them permission to manage your tokens. </p>
        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Id</th>
              <th>No. of managed categories</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="AuthNFT.processing" :col-count="4" :row-count="3" :caption="AuthNFT.processing" />
          <tbody v-else class="text-center">
            <tr v-for="authNft, i in authNfts" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <TokenCategory :tokenId="authNft?.utxo?.token?.tokenId" />
              </td>
              <td>
                <template v-if="authNft.processing">
                  <q-spinner color="cyan"></q-spinner><i>{{ authNft.processing }}</i>
                </template>
                <template v-else>
                  {{ authNft.unlockableTokens.length }}
                </template>
              </td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="openDialog(FungibleTokenDialog.__name, authNft as AuthNFT)">Use to create
                        FT</q-item>
                      <q-item clickable v-close-popup
                        @click="openDialog(AuthKeyTransferDialog.__name, authNft as AuthNFT)">Transfer AuthKey</q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </div>
    <FungibleTokenDialog v-if="dialog" :auth-nft="dialogData" :model-value="dialog === FungibleTokenDialog.__name"
      :token-id-options="user.genesisInputs" action="genesis" @hide="onHide" />
    <AuthKeyTransferDialog v-if="dialog" :auth-key="dialogData" :model-value="dialog === AuthKeyTransferDialog.__name"
      @hide="onHide" />
  </q-page>
</template>
<script setup lang="ts">

import { Wallet } from 'mainnet-js';
import AuthNFT from 'src/models/AuthNFT';
import { useUser } from 'src/stores/user';
import { onMounted, ref } from 'vue';
import TokenCategory from 'src/components/TokenCategory.vue';
import FungibleTokenDialog from 'src/components/dialogs/FungibleTokenDialog.vue';
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue';
import AuthKeyTransferDialog from 'src/components/dialogs/AuthKeyTransferDialog.vue'
import { useDialogs } from 'src/composables'
const user = useUser()

const authNfts = ref<AuthNFT[] | undefined>()

const { dialog, dialogData, openDialog, onHide } = useDialogs()

onMounted(async () => {
  try {
    authNfts.value = await AuthNFT.scanWalletForAuthNFTs(user.wallet as Wallet)
  } catch (error) {
    console.log(error)
  }
  scanAuthNftsForManagedCategories()
})


const scanAuthNftsForManagedCategories = async () => {
  if (authNfts.value) {
    for (let i = 0; i < authNfts.value.length; i++) {
      authNfts.value[i].ownerWallet = user.wallet as Wallet
      await authNfts.value[i].loadUnlockableTokens()
    }
  }
}


</script>
