<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch, provide, ref, onMounted, triggerRef } from 'vue';
import { useWizardConnectWallet } from './composables/useWizardConnectWallet';
import { useWalletSigner } from './composables/useWalletSigner';
import { isWalletConnectEnabled, useWalletConnectWallet } from './composables/useWalletConnectWallet';
import { useRoute, useRouter } from 'vue-router';
import { useAuthguardStore } from './stores/authguard';
import { UtxoWithAuthKey, UtxoWithPath } from './core/types';
import { AuthheadId } from './core/authguard';

import { useRegistryStore } from './stores/registry';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { setActiveIdentitySnapshot } = useRegistryStore();
const wizardConnectWallet = useWizardConnectWallet();
const { state, manager, connect } = wizardConnectWallet;

// `wallet` and `walletIsReady` come from the signer so both connect paths are visible app-wide;
// WizardConnect's own `state`/`manager` still drive its reconnect and QR flow.
const walletSigner = useWalletSigner();
const { wallet, walletIsReady } = walletSigner;
const { restore: restoreWalletConnect } = useWalletConnectWallet();

const authguardStore = useAuthguardStore();
const { setActiveAuthhead, loadAuthhead, loadAuthkeys, loadAuthheads } =
  authguardStore;
const { activeAuthhead } = storeToRefs(authguardStore);

provide('wizardConnectWallet', wizardConnectWallet);
provide('walletSigner', walletSigner);

/**
 * False until the WalletConnect restore attempt has settled. The redirect watcher below has to wait
 * for it, otherwise a restored WalletConnect session would be bounced to the index page on load.
 */
const walletConnectRestoreDone = ref(!isWalletConnectEnabled());

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
  () => wallet.value?.ready,
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

/**
 * Redirects to the index page when no wallet is connected. `flush: 'sync'` matters: the mount hook
 * restores the current path with `router.replace` right after the WalletConnect restore settles, and
 * a queued watcher would otherwise push '/' after that replace and lose the deep link.
 */
watch(
  () => [state.value, walletConnectRestoreDone.value, walletSigner.activeProvider.value] as const,
  () => {
    if (!walletConnectRestoreDone.value) return;
    if (walletSigner.activeProvider.value === 'wallet-connect') return;
    if (
      state.value === 'disconnected' ||
      (state.value === 'idle' && !Boolean(manager.value))
    ) {
      router.push('/');
    }
  },
  { immediate: true, flush: 'sync' }
);

onMounted(async () => {
  // Re-attach to a WalletConnect session the wallet still remembers. Runs here (not during setup)
  // because it touches localStorage and the relay.
  try {
    await restoreWalletConnect();
  } finally {
    walletConnectRestoreDone.value = true;
  }

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
