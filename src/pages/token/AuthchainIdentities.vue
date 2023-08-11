<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Authchain Identities</h5>
        <p class="text-center">List of authchain identity outputs. You can use this to manage the authchain of your tokens
        </p>
        <q-btn-toggle v-model="viewType" push toggle-color="teal" :options="[
          { label: 'Detailed View', value: 'detailed' },
          { label: 'Simple View', value: 'simple' },
        ]" size="sm" dense no-caps />
        <!-- <q-btn @click="detailedView = true" color="primary" size="sm" dense flat>Detailed View</q-btn> -->
        <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
          <q-markup-table>
            <thead>
              <tr>
                <th>#</th>
                <th>Token Id/Category</th>
                <th v-if="viewType && viewType.value == 'detailed'">Fungible Reserves</th>
                <th v-if="viewType && viewType.value == 'detailed'">NFT Capability</th>
                <th v-if="viewType && viewType.value == 'detailed'">NFT Commitment</th>
                <th>AuthGuard</th>
                <th>AuthKey</th>
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
                <td v-if="viewType && viewType.value == 'detailed'">{{ identity.token?.amount || 'n/a' }}</td>
                <td v-if="viewType && viewType.value == 'detailed'">{{ identity.token?.capability || 'n/a' }}</td>
                <td v-if="viewType && viewType.value == 'detailed'">{{ identity.token?.commitment || 'n/a' }}</td>
                <td>
                  <CashAddress :cashaddr="identity.authNFT?.authGuard?.contract?.getTokenDepositAddress()" />
                </td>
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
                        <q-item clickable v-close-popup @click="openDialog(FungibleTokenIssuerDialog.__name, identity)">
                          Issue Tokens
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </q-markup-table>

        </q-scroll-area>

        <AuthchainRegistryPublisher v-if="dialog" :model-value="dialog === AuthchainRegistryPublisher.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
        <FungibleTokenIssuerDialog v-if="dialog" :model-value="dialog === FungibleTokenIssuerDialog.__name"
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
import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'
import CashAddress from 'src/components/CashAddress.vue'

const user = useUser()
const detailedView = ref<boolean>(false)
const viewType = ref<{ value: string, label: string }>()
const authchainIdentities = ref<AuthchainIdentity[]>()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
onMounted(async () => {
  if (user.wallet) {
    authchainIdentities.value = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    console.log(authchainIdentities.value)
  }
})

</script>
