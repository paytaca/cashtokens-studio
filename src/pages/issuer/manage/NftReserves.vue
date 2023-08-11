<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">NFT Reserves</h5>
        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Token Id/Category</th>
              <th>Capability</th>
              <th>Commitment</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="AuthchainIdentity.processing || authchainIdentities === undefined" :col-count="5"
            :row-count="4"
            :caption="AuthchainIdentity.processing || authchainIdentities === undefined ? AuthchainIdentity.processing || 'Scanning wallet for fungible reserves' : ''" />
          <tbody v-else class="text-center">
            <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <TokenCategory :tokenId="identity.token?.tokenId" />
              </td>
              <td>{{ identity.token?.capability }}</td>
              <td>{{ identity.token?.commitment }}</td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item v-if="identity.token?.capability === NFTCapability.minting"
                        @click="openDialog(NFTMinterDialog.__name, new NonFungibleToken({ ...identity }))" clickable
                        v-close-popup>
                        Mint Child NFT
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
        <NFTMinterDialog v-if="dialog" :model-value="dialog === NFTMinterDialog.__name"
          :minter="(dialogData as NonFungibleToken)" @hide="onHide" @nft-minted="onMint" />
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { NFTCapability, Wallet } from 'mainnet-js';
import { onMounted, ref, computed } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'

import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'
import NFTMinterDialog from 'src/components/dialogs/NFTMinterDialog.vue';
import NonFungibleToken from 'src/models/NonFungibleToken';

const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
const { dialog, dialogData, openDialog, onHide } = useDialogs()

onMounted(async () => {
  if (user.wallet) {
    authchainIdentities.value = [
      ...await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    ].filter((ai) => !ai.token?.amount && ai.token?.capability) || []
  }
})

const onMint = (minted: { tokenId: string, capability: NFTCapability, commitment: string }) => {
  console.log('MINTED', minted)
}

</script>
