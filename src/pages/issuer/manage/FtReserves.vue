<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Fungible Token Reserves</h5>
        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Token Id/Category</th>
              <th>Reserved Supplies</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="AuthchainIdentity.processing || authchainIdentities === undefined" :col-count="4"
            :row-count="3"
            :caption="AuthchainIdentity.processing || authchainIdentities === undefined ? AuthchainIdentity.processing || 'Scanning wallet for fungible reserves' : ''" />
          <tbody v-else class="text-center">
            <tr v-for="identity, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <TokenCategory :tokenId="identity.token?.tokenId" />
              </td>
              <td>{{ BigInt(identity.token!.amount! as number) || 'n/a' }}</td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
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
        <FungibleTokenIssuerDialog v-if="dialog" :model-value="dialog === FungibleTokenIssuerDialog.__name"
          :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @tokens-issued="onTokensIssuance" />
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { Wallet } from 'mainnet-js';
import { onMounted, ref, computed } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'

import FungibleTokenIssuerDialog from 'src/components/dialogs/FungibleTokenIssuerDialog.vue'

const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
const { dialog, dialogData, openDialog, onHide } = useDialogs()

onMounted(async () => {
  if (user.wallet) {
    authchainIdentities.value = [
      ...await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)].filter((ai) => ai.token?.amount && ai.token.amount > 0) || []
  }
})

const onTokensIssuance = (issued: { tokenId: string, to: string, amount: string }) => {
  AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    .then((values) => {
      authchainIdentities.value = [...values]
    })
}

</script>
