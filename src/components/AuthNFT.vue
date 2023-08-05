<template>
  <q-card class="full-width">
    <q-toolbar>
      <q-toolbar-title>Create Auth NFT</q-toolbar-title>
    </q-toolbar>
    <q-card-section>
      <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
        <template v-if="authNft && authNft.processing">
          <q-spinner-grid></q-spinner-grid>
          {{ authNft.processing }}
        </template>
        <q-input v-if="authNft" :model-value="authNft.txid" :filled="true" disable dense square />
        <p v-else>No utxo suitable as auth NFT in your address. Please send BCH to your address.</p>
      </q-form>
    </q-card-section>
    <q-card-actions class="justify-end">
      <BusyButton v-if="authNft" @click="createAuthNFTGenesis" :busy-label="authNft?.processing"
        label="Create Auth NFT" />
    </q-card-actions>
  </q-card>
</template>
<script setup lang="ts">
import { Wallet } from 'mainnet-js';
import AuthNFT from 'src/models/AuthNFT';
import { useUser } from 'src/stores/user';
import { ref, onMounted } from 'vue';
import BusyButton from './BusyButton.vue';
import { useQuasar } from 'quasar';
const props = defineProps<{ authNft: AuthNFT }>()
const $q = useQuasar()
const user = useUser()
const createAuthNFTGenesis = async () => {
  try {
    const tx = await props.authNft?.createGenesis()
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Auth NFT created.Tx=' + tx })
      if (!user.authNFTs) {
        user.authNFTs = []
      }
      user.authNFTs?.push(props.authNft as AuthNFT)
    }
  } catch (error: any) {
    $q.notify({ type: 'negative', message: 'Txn Failed!' + error.message })
  }

}
</script>
