<template>
  <q-dialog>
    <FungibleTokenIssuer :authchain-identity="authchainIdentity" />
  </q-dialog>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity'
import FungibleTokenIssuer from 'src/components/FungibleTokenIssuer.vue';
defineOptions({ name: 'FungibleTokenIssuerDialog' })
defineProps<{ authchainIdentity: AuthchainIdentity }>()
</script>
