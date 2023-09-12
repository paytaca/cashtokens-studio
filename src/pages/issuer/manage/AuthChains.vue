<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Authchains</h5>
        <p class="text-center">List of authchain identity outputs. You can use this to manage the authchain of your tokens
        </p>
        <div class="row justify-end q-my-sm">
          <q-btn-toggle v-model="viewType" push toggle-color="teal" :options="[
            { label: 'Simple View', value: 'simple' },
            { label: 'Detailed View', value: 'detailed' },
          ]" size="sm" dense no-caps />
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
                  <th>NFT Commitment</th>
                </template>
                <th>AuthGuard Contract Address</th>
                <th>AuthKey</th>
                <th>Action</th>
              </tr>
            </thead>
            <TableBodySkeleton v-if="!authchainIdentities && AuthchainIdentity.processing"
              :col-count="viewType === 'simple' ? 7 : 8" :row-count="3" :caption="AuthchainIdentity.processing" />
            <tbody v-else class="text-center">
              <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i">
                <td>{{ i + 1 }}</td>
                <td>
                  <q-avatar v-if="identity.tokenUris?.icon">
                    <img :src="identity.tokenUris?.icon" alt="na">
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="disabled" />
                </td>
                <td>
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
                    tool-tip="Copy Contract Address" />
                </td>
                <td>
                  <TokenCategory :token-id="identity.authKey?.token?.tokenId" icon-right="key" />
                </td>
                <td>
                  <q-btn icon="more_vert" size="md" round flat dense>
                    <q-menu>
                      <q-list>
                        <q-item clickable v-close-popup
                          @click="openDialog(AuthchainRegistryPublisherDialog.__name, identity)">
                          Publish Registry
                        </q-item>
                        <q-item clickable v-close-popup @click="openDialog(UnguardAuthchainDialog.__name, identity)">
                          Unguard Authchain
                        </q-item>
                        <q-item clickable v-close-popup @click="openDialog(AuthchainBurnerDialog.__name, identity)">
                          Burn Authchain
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
              <tr v-if="authchainIdentities && AuthchainIdentity.processing">
                <td :colspan="viewType === 'simple' ? 7 : 8">
                  <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
                </td>
              </tr>
              <tr v-if="authchainIdentities?.length === 0 && !AuthchainIdentity.processing">
                <td :colspan="viewType === 'simple' ? 7 : 8">
                  No data
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-scroll-area>
        <AuthchainRegistryPublisherDialog v-if="dialog" :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
        <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
        <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
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
import { AuthchainIdentity } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import CashAddress from 'src/components/CashAddress.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';

const user = useUser()
const viewType = ref<string>('simple')
const authchainIdentities = ref<AuthchainIdentity[]>()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
onMounted(async () => {
  if (user.wallet) {
    if (user.authchainIdentities) {
      authchainIdentities.value = user.authchainIdentities as AuthchainIdentity[]
    }
    authchainIdentities.value = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    user.authchainIdentities = authchainIdentities.value
    authchainIdentities.value.forEach(async (a: AuthchainIdentity) => {
      await a.resolveTokenCategory()
      await a.resolveTokenUris()
    })
  }

})

</script>
