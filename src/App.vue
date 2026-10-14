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
import { useI18n } from 'vue-i18n';

const { setActiveIdentitySnapshot } = useRegistryStore();
const wizardConnectWallet = useWizardConnectWallet();
const { state, manager, connect, walletIsReady, wallet } = wizardConnectWallet;

const authguardStore = useAuthguardStore();
const { setActiveAuthhead, loadAuthhead, loadAuthkeys, loadAuthheads } =
  authguardStore;
const { activeAuthhead } = storeToRefs(authguardStore);

provide('wizardConnectWallet', wizardConnectWallet);

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const dashboardVisited = ref<boolean>(false);

/**
 * Warm the authguard store the moment a wallet is available, so the managed tokens page opens with
 * rows instead of a skeleton. Silent and fire-and-forget: it must not delay the connect flow, and
 * it must not replace rows that are already on screen. The wallet's UTXO set is already cached by
 * then (initWallet syncs it), so this costs no extra chain request.
 */
const warmUpAuthguardData = () => {
  loadAuthkeys(wallet.value, undefined, true).catch((error) =>
    console.error(error)
  );
};

watch(
  () => wallet.value.ready,
  async (walletIsReady) => {
    if (walletIsReady) warmUpAuthguardData();
    if (
      walletIsReady &&
      route.query.authkey &&
      route.query.authhead &&
      !activeAuthhead.value
    ) {
      const [txid, vout] = (route.query.authkey as string).split(':');
      if (!txid || !vout) {
        return;
      }
      const authkey = wallet.value?.utxos?.find((authkeyUtxo) => {
        return authkeyUtxo.txid === txid && Number(vout) === Number(vout);
      });

      if (!authkey) {
        return;
      }

      if (authkey) {
        const authhead = await loadAuthhead({
          authkey,
          authheadId: route.query?.authhead as AuthheadId,
        });
        if (!authhead) {
          return;
        }
        setActiveAuthhead(authhead as UtxoWithAuthKey);
        setActiveIdentitySnapshot(authhead.identitySnapshot);
      }
    }
  }
);

watch(
  () => state.value,
  (newState, oldState) => {
    if (
      newState === 'disconnected' ||
      (newState === 'idle' && !Boolean(manager.value))
    ) {
      router.push('/');
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (process.env.CLIENT) {
    const [navigation] = performance.getEntriesByType('navigation');
    if ((navigation as PerformanceNavigationTiming)?.type === 'reload') {
      const url = new URL(navigation!.name);
      router.replace({
        path: url.pathname,
        query: {
          ...Object.fromEntries(new URLSearchParams(url.search)),
        },
      });
    }
  }
});
</script>
