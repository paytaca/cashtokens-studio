<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">Fungible Token Balance</h5>
        <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
          <q-markup-table>
            <thead>
              <tr>
                <th>#</th>
                <th>Token Id</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <TableBodySkeleton v-if="AuthchainIdentity.processing" :col-count="8" :row-count="3"
              :caption="AuthchainIdentity.processing" />
            <tbody v-else class="text-center">
              <tr v-for="t, i in tokens" :key="'ai-rec-' + i">
                <td>{{ i + 1 }}</td>
                <td>
                  <TokenCategory :tokenId="t.token?.tokenId" />
                </td>
                <td>{{ t.token?.amount || 'n/a' }}</td>
                <td>
                  <q-btn icon="more_vert" size="md" round flat dense>
                    <q-menu>
                      <q-list>
                        <!-- <q-item clickable v-close-popup @click="openDialog(FungibleTokenIssuerDialog.__name, t)">
                          Issue Tokens
                        </q-item> -->
                      </q-list>
                    </q-menu>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-scroll-area>

      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { UtxoI, Wallet } from 'mainnet-js';
import { onMounted, ref, computed } from 'vue';
import { useUser } from 'src/stores/user';
import { useDialogs } from 'src/composables'
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'

import FungibleToken from 'src/models/FungibleToken';
defineOptions({ name: 'FungibleTokens' })
const user = useUser()
const tokens = ref<FungibleToken[]>()
const { dialog, dialogData, openDialog, onHide } = useDialogs()

onMounted(async () => {
  if (user.wallet) {
    tokens.value = []
    const utxos = (await user.wallet.getAddressUtxos()).filter((u: UtxoI) => u.token && u.token?.amount > 0)
    utxos.forEach((f) => tokens.value.push(new FungibleToken({ ...f, ownerWallet: user.wallet as Wallet })))
  }
})
</script>
