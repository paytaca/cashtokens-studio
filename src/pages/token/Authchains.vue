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
            <tr v-if="authchainIdentity?.processing === 'Identities'">
              <td><q-skeleton type="text" /></td>
              <td><q-skeleton type="text" /></td>
              <td><q-skeleton type="text" /></td>
              <td><q-skeleton type="text" /></td>
              <td><q-skeleton type="text" /></td>
            </tr>
            <tr v-for="ai, i in authchainIdentities" :key="'ai-rec-' + i">
              <td>{{ i }}</td>
              <td>{{ ai.tokenId }}</td>
              <td>{{ ai.amount }}</td>
              <td>{{ ai.capability }}</td>
              <td>{{ ai.commitment }}</td>
              <td style="position:sticky">
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="openDialog(AuthchainRegistryPublisher.name as string, ai)">Publish
                        Registry</q-item>
                      <q-item clickable v-close-popup @click="openDialog(AuthchainTransferer.name as string, ai)">Transfer
                        Ownership</q-item>
                      <q-item clickable v-close-popup @click="openDialog(AuthchainBurner.name as string, ai)">Burn
                        Identity
                        Output</q-item>
                      <q-item clickable v-close-popup @click="openDialog(AuthchainReleaser.name as string, ai)">Release
                        Identity
                        Output</q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
          </tbody>

        </q-markup-table>
        <AuthchainRegistryPublisher v-model="openARPDialog" :identity-output="(authchainIdentity as AuthchainIdentity)"
          v-close-popup />
        <AuthchainBurner v-model="openABDialog" :identity-output="(authchainIdentity as AuthchainIdentity)"
          v-close-popup />
        <AuthchainTransferer v-model="openATDialog" :identity-output="(authchainIdentity as AuthchainIdentity)"
          v-close-popup />
        <AuthchainReleaser v-model="openARDialog" :identity-output="(authchainIdentity as AuthchainIdentity)"
          v-close-popup />
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { nextTick, onMounted, ref } from 'vue';
import { useUser } from 'src/stores/user';
import { Wallet } from 'mainnet-js';
import AuthchainRegistryPublisher from 'src/components/AuthchainRegistryPublisher.vue'
import AuthchainBurner from 'src/components/AuthchainBurner.vue'
import AuthchainTransferer from 'src/components/AuthchainTransferer.vue'
import AuthchainReleaser from 'src/components/AuthchainReleaser.vue'

defineOptions({ name: 'AuthchainsPage' })

const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
/**
 * current authchain identity in view/dialog
 */
const authchainIdentity = ref<AuthchainIdentity>()
const openARPDialog = ref<boolean>(false)
const openABDialog = ref<boolean>(false)
const openATDialog = ref<boolean>(false)
const openARDialog = ref<boolean>(false)

onMounted(async () => {
  if (user.wallet) {
    authchainIdentity.value = new AuthchainIdentity({ ownerWallet: user.wallet as Wallet })
    authchainIdentities.value = await authchainIdentity.value.getIdentities()
  }
})

const openDialog = (d: string, data: AuthchainIdentity) => {
  authchainIdentity.value = data
  nextTick(() => {
    openARPDialog.value = d === AuthchainRegistryPublisher.name
    openABDialog.value = d === AuthchainBurner.name
    openATDialog.value = d === AuthchainTransferer.name
    openARDialog.value = d === AuthchainReleaser.name
  })
}

const onDialogHide = () => {
  // delete authchainIdentity.value
  // openARPDialog.value = false
  // openABDialog.value = false
  // openATDialog.value = false
  // openARDialog.value = false
}

</script>
