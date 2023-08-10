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
                <th>Balance</th>
                <th>Utxo Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <TableBodySkeleton v-if="AuthchainIdentity.processing" :col-count="8" :row-count="3"
              :caption="AuthchainIdentity.processing" />
            <tbody v-else class="text-center">
              <tr v-for="b, i in balances" :key="'ai-rec-' + i">
                <td>{{ i + 1 }}</td>
                <td>
                  <TokenCategory :tokenId="b.tokenId" />
                </td>
                <td>{{ b.balance || 0 }}</td>
                <td>{{ b.sourceUtxos.length }}</td>
                <td>
                  <q-btn color="secondary" dense no-caps>Send</q-btn>
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
const { dialog, dialogData, openDialog, onHide } = useDialogs()
const balances = ref<{ tokenId: string, sourceUtxos: UtxoI[], balance: bigint }[]>([])
onMounted(async () => {
  if (user.wallet) {
    const utxos = (await user.wallet.getAddressUtxos()).filter((u: UtxoI) => u.token && u.token?.amount > 0)
    utxos.forEach((u: UtxoI) => {
      let b = balances.value.find((b) => b.tokenId === u.token?.tokenId)
      if (b) {
        b.sourceUtxos.push(u)
        b.balance += BigInt(u.token!.amount)
      } else {
        balances.value.push({ tokenId: u.token!.tokenId, sourceUtxos: [u], balance: BigInt(u.token!.amount) })
      }
    })

  }
})
</script>
