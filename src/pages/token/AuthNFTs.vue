<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Your Auth Tokens</h5>
        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Token Id</th>
              <th>No. of managed tokens</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody v-if="AuthNFT.processing">
            <PageContentSpinner :caption="AuthNFT.processing"/>
          </tbody>
          <tbody v-else  class="text-center">
            <tr v-for="authNft, i in authNfts" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <TokenCategory :tokenId="authNft?.utxo?.token?.tokenId" />
              </td>
              <td> n/a </td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="openDialog('ft-creator', authNft)">Use to create FT</q-item>
                      <!-- <q-item clickable v-close-popup @click="openDialog(AuthchainTransferer.name as string, ai)">Transfer
                        Ownership</q-item>
                      <q-item clickable v-close-popup @click="openDialog(AuthchainBurner.name as string, ai)">Burn
                        Identity
                        Output</q-item>
                      <q-item clickable v-close-popup @click="openDialog(AuthchainReleaser.name as string, ai)">Release
                        Identity
                        Output</q-item>
                      <q-item clickable v-close-popup @click="openDialog(FungibleTokenIssuer.name as string, ai)">
                        Issue Fungible Tokens
                      </q-item> -->
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
      <q-card class="full-width q-pa-lg" >
        <FungibleToken :auth-nft="dialogAuthNft" action="genesis"/>
      </q-card>
    </q-dialog>
  </q-page>
</template>
<script setup lang="ts">
import { Wallet } from 'mainnet-js';

import AuthNFT from 'src/models/AuthNFT';
import { useUser } from 'src/stores/user';
import { onMounted, ref } from 'vue';
import PageContentSpinner from 'src/components/PageContentSpinner.vue';
import TokenCategory from 'src/components/TokenCategory.vue';
import FungibleToken from 'src/components/FungibleToken.vue';
const user = useUser()
const authNfts = ref<AuthNFT[]>()
const dialog = ref<'ft-creator'|'nft-creator'|'hybrid-creator'|undefined>()
const dialogAuthNft = ref<AuthNFT>() // AuthNFT to pass to open dialog

onMounted(async () => {
  try {
    authNfts.value = await AuthNFT.scanWalletForAuthNFTs(user.wallet as Wallet)
  } catch (error) {
    console.log(error)
  }
})

const openDialog = (dialogName:string, authNft: AuthNFT) => {
  dialog.value = dialogName
  dialogAuthNft.value = authNft
}

const onDialogHide = () => {
  dialog.value = undefined
  dialogAuthNft.value = undefined
}

</script>
