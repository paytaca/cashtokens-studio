<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useWizardConnectWallet } from './composables/useWizardConnectWallet';
import { WizardConnectState } from 'wizardconnect-vue';
import { useRoute, useRouter } from 'vue-router';
const { walletIsReady, state } = useWizardConnectWallet()
const route = useRoute()
const router = useRouter()

watch(() => state.value, (v: WizardConnectState) => {
  if (v === 'disconnected') {
    return router.push('/')
  }
  if (v === 'connecting' && !walletIsReady.value) {
    return router.push('/loading')
  }

  if (v === 'connected' && walletIsReady.value && route.path === '/loading') {
    router.push('/dashboard')
  }
})

watch(() => walletIsReady.value, (ready: boolean | undefined) => {
  if (ready && route.path !== '/dashboard') {
    router.push('/dashboard')
  }
}, { immediate: true })

</script>
