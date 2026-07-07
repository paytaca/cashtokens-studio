<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useWizardConnectWallet } from './composables/useWizardConnectWallet';
import { WizardConnectExternalWallet } from './core/wallet';
import { PathXpub } from '@wizardconnect/core';
import { WizardConnectState } from 'wizardconnect-vue';
import { useRouter } from 'vue-router';
const { manager, wallet, walletLasySync, state } = useWizardConnectWallet()
const router = useRouter()

watch(() => manager.value, async (newV, oldV) => {
  if (!wallet.value?.ready && !oldV && newV?.getSessionPaths()) {
    wallet.value = new WizardConnectExternalWallet({
      network: import.meta.env.VITE_BCH_NETWORK
    })
    await wallet.value!.initWallet({ paths: manager.value!.getSessionPaths() as PathXpub[] })
    await wallet.value.getBalance({ sync: true })
    walletLasySync.value = Date.now()
  }
})

watch(() => state.value, (v: WizardConnectState) => {
  if (v === 'disconnected') {
    router.push('/')
  }
})

</script>
