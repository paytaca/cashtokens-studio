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
          <FungibleToken v-if="tokenType === 'fungible'" :owner="user.connectedPaytacaAddress" action="genesis"
            :token-id-options="user.genesisInputs" />
          <!-- <NonFungibleToken v-if="tokenType === 'nonfungible'" :owner="user.connectedPaytacaAddress" action="genesis"
            :genesis-token-id-options="tokenIdOptions" />
          <FungibleNonFungibleToken v-if="tokenType === 'hybrid'" :owner="user.connectedPaytacaAddress" action="genesis"
            :genesis-token-id-options="tokenIdOptions" /> -->
          <AuthNFTView v-if="tokenType === 'authnft' && authNFT" :owner="user.connectedPaytacaAddress" action="genesis"
            :auth-nft="authNFT" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useUser } from 'src/stores/user';
import { UtxoI, Wallet } from 'mainnet-js';
import FungibleToken from 'src/components/FungibleToken.vue';
import NonFungibleToken from 'src/components/NonFungibleToken.vue';
import FungibleNonFungibleToken from 'src/components/FungibleNonFungibleToken.vue';
import AuthNFTView from 'src/components/AuthNFT.vue'
import { useRoute, useRouter } from 'vue-router';
import AuthNFT from 'src/models/AuthNFT';
defineOptions({ name: 'CreateToken' })

const user = useUser()
const route = useRoute()
const router = useRouter()
const authNFT = ref<AuthNFT>()
const tokenType = computed(() => route.params.tokenType)

onMounted(async () => {
  console.log(user.authNFTs)
  if (route.params.tokenType === 'authnft') {
    let authNFTGenesisInputUtxo = await AuthNFT.scanWalletForSuitableAuthNFTUtxo(user.wallet as Wallet)
    if (authNFTGenesisInputUtxo) {
      authNFT.value = new AuthNFT({ ...authNFTGenesisInputUtxo, ownerWallet: user.wallet! as Wallet })
    }
  }
})
</script>

