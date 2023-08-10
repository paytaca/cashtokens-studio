<template>
  <q-dialog>
    <FungibleTokenIssuer :authchain-identity="authchainIdentity" @tokens-issued="(val) => $emit('tokensIssued', val)" />
  </q-dialog>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity'
import FungibleTokenIssuer from 'src/components/FungibleTokenIssuer.vue';
defineOptions({ name: 'FungibleTokenIssuerDialog' })
defineProps<{ authchainIdentity: AuthchainIdentity }>()
defineEmits<{
  (e: 'tokensIssued', val: { tokenId: string, to: string, amount: number }): void
}>()
</script>
