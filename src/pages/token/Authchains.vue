<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Token Id</th>
              <th>Fungible Reserves</th>
              <th>Capability</th>
              <th>Commitment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ai, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i }}</td>
              <td>{{ ai.tokenId }}</td>
              <td>{{ ai.amount }}</td>
              <td>{{ ai.capability }}</td>
              <td>{{ ai.commitment }}</td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup @click="dialog = 'authchain-publish'">Publish Registry</q-item>
                      <q-item clickable v-close-popup @click="dialog = 'authchain-transfer'">Transfer Ownership</q-item>
                      <q-item clickable v-close-popup @click="dialog = 'authchain-burn'">Burn Identity Output</q-item>
                      <q-item clickable v-close-popup @click="dialog = 'authchain-release'">Release Identity
                        Output</q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { onMounted, ref } from 'vue';
import { useUser } from 'src/stores/user';
import { Wallet } from 'mainnet-js';

defineOptions({ name: 'AuthchainsPage' })
const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
const dialog = ref<'authchain-publish' | 'authchain-transfer' | 'authchain-burn' | 'authchain-release' | undefined>()
onMounted(async () => {
  if (user.wallet) {
    const authchain = new AuthchainIdentity({ ownerWallet: user.wallet as Wallet })
    authchainIdentities.value = await authchain.getIdentities()
    console.log(authchainIdentities.value)
  }

})
</script>
