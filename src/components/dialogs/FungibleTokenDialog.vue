<template>
  <q-dialog>
    <FungibleToken :auth-nft="authNft" :action="action" :token-id-options="tokenIdOptions" />
  </q-dialog>
</template>
<script setup lang="ts">
import { UtxoI } from 'mainnet-js';
import { AuthNFT } from 'src/models/interfaces';

defineProps<{
  action: FungibleTokenAction,
  authNft: AuthNFT,
  tokenIdOptions?: UtxoI[]
}>()

</script>
