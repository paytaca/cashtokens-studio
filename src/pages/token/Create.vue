<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-end">
          <q-btn to="/token/create/fungible">FT</q-btn>
          <q-btn to="/token/create/nonfungible">NFT</q-btn>
          <q-btn>FNFT</q-btn>
        </div>
        <div class="row justify-center q-my-lg">
          <template v-if="!user.genesisInputs?.length || user.genesisInputs?.length < 2">

            <q-icon name="warning"></q-icon>
            <p>Your wallet has {{ user.genesisInputs?.length || 0 }} vout-0 utxo.
              Cashtoken Studio requires 2 vout-0
              utxos as genesis inputs when creating a token. </p>
            <BusyButton :busy-label="GenesisInput.processing" label="Generate genesis input"
              @click="generateGenesisInputs" />
          </template>
          <template v-else>
            <FungibleToken v-if="tokenType === 'fungible' && authNFT && tokenIdOptions"
              :owner="user.connectedPaytacaAddress" action="genesis" :token-id-options="tokenIdOptions"
              :auth-nft="authNFT" />
            <NonFungibleToken v-if="tokenType === 'nonfungible' && authNFT && tokenIdOptions"
              :owner="user.connectedPaytacaAddress" action="genesis" :token-id-options="tokenIdOptions"
              :auth-nft="authNFT" />
            <AuthNFTView v-if="tokenType === 'authnft'" :owner="user.connectedPaytacaAddress" action="genesis"
              :auth-nft="authNFT" />
          </template>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { computed, ref, watch, onMounted } from 'vue'
import { UtxoI, Wallet } from 'mainnet-js';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';

import NonFungibleToken from 'src/components/NonFungibleToken.vue';
import FungibleToken from 'src/components/FungibleToken.vue';
import BusyButton from 'src/components/BusyButton.vue'
import AuthNFTView from 'src/components/AuthNFT.vue'
import GenesisInput from 'src/models/GenesisInput'
import AuthNFT from 'src/models/AuthNFT';

defineOptions({ name: 'CreateToken' })

const $q = useQuasar()
const user = useUser()
const route = useRoute()
const authNFT = ref<AuthNFT>()
const tokenIdOptions = ref<UtxoI[]>()
const tokenType = computed(() => route.params.tokenType)

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 2) {
    // use first for AuthNFT
    authNFT.value = new AuthNFT({ ...user.genesisInputs![0], ownerWallet: user.wallet! as Wallet })
    // the rest for token
    tokenIdOptions.value = user.genesisInputs!.slice(1)
  }
})

onMounted(async () => {
  if (user.genesisInputs && user.genesisInputs?.length >= 2) {
    // use first for AuthNFT
    authNFT.value = new AuthNFT({ ...user.genesisInputs[0], ownerWallet: user.wallet! as Wallet })
    // the rest for token
    tokenIdOptions.value = user.genesisInputs.slice(1)
  }
})

const generateGenesisInputs = async () => {
  if (!user.wallet) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }
  try {
    const tx = await GenesisInput.generate(user.wallet! as Wallet, 2)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
    }
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }

}
</script>

