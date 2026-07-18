<template>
  <router-view />
</template>


<script setup lang="ts">


import { watch, provide, ref, onMounted, triggerRef } from 'vue';
import { useWizardConnectWallet } from './composables/useWizardConnectWallet';
import { useRoute, useRouter } from 'vue-router';
import { useAuthguardStore } from './stores/authguard';
import { UtxoWithAuthKey, UtxoWithPath } from './core/types';
import { AuthheadId } from './core/authguard';

import { useRegistryStore } from './stores/registry';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n'
import LoadingDialog from 'src/components/dialogs/LoadingDialog.vue'
import { useQuasar } from 'quasar';
import { useStepLoading } from './composables/useStepLoading';

const { setActiveIdentitySnapshot } = useRegistryStore()
const wizardConnectWallet = useWizardConnectWallet()
const { state, manager, connect, walletIsReady, wallet } = wizardConnectWallet

const authguardStore = useAuthguardStore()
const { setActiveAuthhead, loadAuthhead, loadAuthkeys, loadAuthheads } = authguardStore
const { activeAuthhead } = storeToRefs(authguardStore)

provide('wizardConnectWallet', wizardConnectWallet)

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const dashboardVisited = ref<boolean>(false)
const loading = useStepLoading()

watch(() => wallet.value.initializing, (walletInitializing) => {
  if (walletInitializing) {
    loading.show([
      'Initializing wallet...',
    ], { autoDismiss: true })
  } else {
    loading.advance()
  }
})

watch(() => wallet.value.ready, async (walletIsReady) => {
  if (walletIsReady && route.query.authkey && route.query.authhead && !activeAuthhead.value) {
    const [txid, vout] = (route.query.authkey as string).split(':')
    if (!txid || !vout) {
      return
    }
    const authkey = wallet.value?.utxos?.find((authkeyUtxo) => {
      return authkeyUtxo.txid === txid && Number(vout) === Number(vout)
    })

    if (!authkey) {
      return
    }

    if (authkey) {
      const authhead = await loadAuthhead({ authkey, authheadId: route.query?.authhead as AuthheadId })
      if (!authhead) {
        return
      }
      setActiveAuthhead(authhead as UtxoWithAuthKey)
      setActiveIdentitySnapshot(authhead.identitySnapshot)
    }
  }
})

watch(() => state.value, (newState, oldState) => {
  if (newState === 'disconnected' || (newState === 'idle' && !Boolean(manager.value))) {
    router.push('/')
  }
}, { immediate: true })


onMounted(() => {
  if (process.env.CLIENT) {
    const [navigation] = performance.getEntriesByType('navigation')
    if ((navigation as PerformanceNavigationTiming)?.type === 'reload') {
      const url = new URL(navigation!.name)
      router.replace({
        path: url.pathname,
        query: {
          ...Object.fromEntries(new URLSearchParams(url.search))
        }
      })
    }
  }
})
</script>
