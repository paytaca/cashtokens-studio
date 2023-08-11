<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Your AuthGuard Keys</h5>
        <p>AuthKeys are NFTs that you'd use to manage the authchain, fungible reserves and/or NFT minters. Don't send
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
                      <q-item clickable v-close-popup @click="openDialog('ft-creator', authNft as AuthNFT)">Use to create
                        FT</q-item>
                      <q-item clickable v-close-popup @click="openDialog('ft-creator', authNft as AuthNFT)">Use to create
                        NFT</q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </div>
    <q-dialog :model-value="dialog === 'ft-creator'" v-close-popup @hide="onDialogHide">
      <q-card class="full-width q-pa-lg">
        <FungibleToken :auth-nft="targetAuthNft" :token-id-options="user.genesisInputs" action="genesis" />
      </q-card>
    </q-dialog>
  </q-page>
</template>
<script setup lang="ts">

type Dialog = 'ft-creator' | 'nft-creator' | 'hybrid-creator' | undefined

import { Wallet } from 'mainnet-js';
import AuthNFT from 'src/models/AuthNFT';
import { useUser } from 'src/stores/user';
import { onMounted, ref } from 'vue';
import TokenCategory from 'src/components/TokenCategory.vue';
import FungibleToken from 'src/components/FungibleToken.vue';
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue';
import AuthGuard from 'src/models/AuthGuard';
const user = useUser()
// const authNfts = ref<AuthNFT[] | undefined>()
const authNfts = ref<AuthNFT[] | undefined>()

const dialog = ref<Dialog>()
const targetAuthNft = ref<AuthNFT>() // AuthNFT to pass to open dialog

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

const openDialog = (dialogName: Dialog, authNft: AuthNFT) => {
  dialog.value = dialogName
  targetAuthNft.value = authNft
}

const onDialogHide = () => {
  dialog.value = undefined
  targetAuthNft.value = undefined
}

</script>
