<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch, provide } from 'vue';
import { useWizardConnectWallet } from './composables/useWizardConnectWallet';
import { useRoute, useRouter } from 'vue-router';
import { useAuthguardStore } from './stores/authguard';
import { UtxoWithAuthKey, UtxoWithPath } from './core/types';

const wizardConnectWallet = useWizardConnectWallet()
const { activeAuthhead, setActiveAuthhead, loadAuthhead } = useAuthguardStore()

provide('wizardConnectWallet', wizardConnectWallet)

const route = useRoute()
const router = useRouter()

router.beforeEach(async (to) => {
  if (to.path === '/authhead' && to.query.authkey && !activeAuthhead) {
    const [txid, vout] = (to.query.authkey as string).split(':')
    if (!txid || !vout) {
      return {
        path: '/dashboard'
      }
    }
    const authkey = wizardConnectWallet.wallet?.value?.utxos?.find((authkeyUtxo) => {
      return authkeyUtxo.txid === txid && Number(vout) === Number(vout)
    })

    if (!authkey) {
      return {
        path: '/dashboard'
      }
    }

    if (authkey) {
      const authhead = await loadAuthhead(authkey as UtxoWithPath)
      setActiveAuthhead(authhead as UtxoWithAuthKey)
    }
  }

})

watch(() => wizardConnectWallet.walletIsReady.value, (isReady) => {
  if (isReady && route.path === '/loading') {
    const path = route.redirectedFrom?.fullPath || '/dashboard'
    router.replace({
      path: path,
      query: {
        ...route.redirectedFrom?.query
      }
    })
  }
}, { immediate: true })

</script>
