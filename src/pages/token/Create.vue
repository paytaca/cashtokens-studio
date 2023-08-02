<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-end">
          <q-btn to="/token/create/fungible">FT</q-btn>
          <q-btn to="/token/create/nonfungible">NFT</q-btn>
          <q-btn>FNFT</q-btn>
        </div>
        <div class="row justify-center">
          <FungibleToken v-if="tokenType === 'fungible'" :owner="user.connectedPaytacaAddress" action="genesis"
            :genesis-token-id-options="tokenIdOptions" />
          <NonFungibleToken v-if="tokenType === 'nonfungible'" :owner="user.connectedPaytacaAddress" action="genesis"
            :genesis-token-id-options="tokenIdOptions" />
          <FungibleNonFungibleToken v-if="tokenType === 'hybrid'" :owner="user.connectedPaytacaAddress" action="genesis"
            :genesis-token-id-options="tokenIdOptions" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUser } from 'src/stores/user';
import { UtxoI } from 'mainnet-js';
import FungibleToken from 'src/components/FungibleToken.vue';
import NonFungibleToken from 'src/components/NonFungibleToken.vue';
import FungibleNonFungibleToken from 'src/components/FungibleNonFungibleToken.vue';
import { useRoute, useRouter } from 'vue-router';
defineOptions({ name: 'CreateToken' })
const user = useUser()
const route = useRoute()
const router = useRouter()
const tokenIdOptions = computed(() => user.genesisInputs?.map((u: UtxoI) => u.txid))
const tokenType = computed(() => route.params.tokenType)
</script>
