<template>
  <span
    @click.stop="walletConnect.walletConnectWalletAddress ? walletConnect.walletConnectDisconnect : walletConnect.walletConnectConnect"
    stack dense>
    <q-avatar v-if="variant === 'icon'" rounded size="lg">
      <q-img src="images/walletconnect_icon.png"></q-img>
    </q-avatar>
    <q-avatar v-else rounded style="width: 300px; height: 100px">
      <q-img src="images/walletconnect.png"></q-img>
    </q-avatar>
  </span>
</template>

<script setup lang="ts">

import { onMounted } from 'vue';
import { useUserWallet } from 'src/composables/useUserWallet';

defineProps<{ variant?: 'icon' | 'icon-text' }>()

const { walletConnect } = useUserWallet()

onMounted(() => {
  console.log('WalletConnect', walletConnect)
})


</script>
