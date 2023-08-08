<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Authchain Identities</h5>
        <p class="text-center">List of authchain identity outputs. You can use this to manage the authchain of your tokens
        </p>
        {{ AuthchainIdentity.processing }}
        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Token Id/Category</th>
              <th>Fungible Reserves</th>
              <th>NFT Capability</th>
              <th>NFT Commitment</th>
              <th>AuthGuard Address</th>
              <th>Auth NFT</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="AuthchainIdentity.processing" :col-count="8" :row-count="3"
            :caption="AuthchainIdentity.processing" />
          <tbody v-else class="text-center">
            <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <TokenCategory :tokenId="identity.token?.tokenId" />
              </td>
              <td>{{ identity.token?.amount || 'n/a' }}</td>
              <td>{{ identity.token?.capability || 'n/a' }}</td>
              <td>{{ identity.token?.commitment || 'n/a' }}</td>
              <td>{{ identity.authNFT?.authGuard?.contract?.getTokenDepositAddress() }}</td>
              <td>
                <TokenCategory :token-id="identity.authNFT?.token?.tokenId" icon-right="key" />
              </td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup @click="openDialog(AuthchainRegistryPublisher.__name, identity)">
                        Publish Registry
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
        <AuthchainRegistryPublisher v-if="dialog" :model-value="dialog === AuthchainRegistryPublisher.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { Wallet } from 'mainnet-js';
import { onMounted, ref } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import AuthchainRegistryPublisher from 'src/components/dialogs/AuthchainRegistryPublisher.vue'

const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
onMounted(async () => {
  if (user.wallet) {
    authchainIdentities.value = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    console.log(authchainIdentities.value)
  }
})

</script>
