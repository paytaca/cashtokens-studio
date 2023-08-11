<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <FungibleToken :auth-nft="authNft" :action="action" :token-id-options="tokenIdOptions" />
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { UtxoI } from 'mainnet-js';
import { FungibleTokenAction } from '../types';
import FungibleToken from 'src/components/FungibleToken.vue'
import AuthNFT from 'src/models/AuthNFT'

defineProps<{
  action: FungibleTokenAction,
  authNft: AuthNFT,
  tokenIdOptions?: UtxoI[]
}>()

</script>
