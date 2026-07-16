<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch, provide, ref } from 'vue';
import { useWizardConnectWallet } from './composables/useWizardConnectWallet';
import { useRoute, useRouter } from 'vue-router';
import { useAuthguardStore } from './stores/authguard';
import { UtxoWithAuthKey, UtxoWithPath } from './core/types';
import { AuthheadId } from './core/authguard';
import { useRegistryStore } from './stores/registry';
import { storeToRefs } from 'pinia';
const { setActiveIdentitySnapshot } = useRegistryStore()
const wizardConnectWallet = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { setActiveAuthhead, loadAuthhead } = authguardStore
const { activeAuthhead } = storeToRefs(authguardStore)

provide('wizardConnectWallet', wizardConnectWallet)

const route = useRoute()
const router = useRouter()
const dashboardVisited = ref<boolean>(false)

router.beforeEach(async (to) => {
  console.log('@route to', to, activeAuthhead.value)
  if (to.path.startsWith('/registry') && activeAuthhead.value) return

  if (to.path.startsWith('/registry') && to.query.authkey && !activeAuthhead.value) {
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
      const authhead = await loadAuthhead({ authkey, authheadId: route.query?.authhead as AuthheadId })
      if (!authhead) {
        return {
          path: '/dashboard'
        }
      }
      setActiveAuthhead(authhead as UtxoWithAuthKey)
      setActiveIdentitySnapshot(authhead.identitySnapshot)
    }
  }

})

watch(() => wizardConnectWallet.walletIsReady.value, (isReady) => {
  console.log('wallet is ready', isReady)
  if (isReady && (route.path === '/loading' || !dashboardVisited.value)) {
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
