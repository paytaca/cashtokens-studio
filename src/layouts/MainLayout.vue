<template>
  <q-layout view="lHh Lpr lFf">
    <!-- <TransactionLogger /> -->
    <q-header v-if="showHeader" class="bg-dark">
      <q-toolbar class="q-py-sm">
        <q-btn v-if="$q.screen.lt.sm && walletIsReady" flat dense round icon="menu" aria-label="Menu" size="lg"
          @click="toggleLeftDrawer" />
        <q-toolbar-title>
          <!-- <q-img @click.stop="router.push('/')" :src="$q.screen.xs
              ? 'images/cts_icon.png'
              : 'images/cts_transparent.png'
            " class="cursor-pointer app-logo"></q-img> -->
          <code v-if="network === 'chipnet'" class="text-caption text-italic q-ml-sm">Chipnet</code>
        </q-toolbar-title>
        <q-btn v-if="!Boolean(manager) || state === 'disconnected'" to="/wizard-connect" style="
            color: rgb(20, 20, 20);
            padding: 10px;
            border-radius: 10px;
            background-color: #282829d4;
            border: 2px solid #484854d4;
          " rounded class="text-grey-2">
          <template v-slot:default>
            <q-avatar rounded size="md" :class="{
              pulse: state === 'connecting' || state === 'reconnecting',
            }">
              <q-img v-if="manager?.walletIcon" :src="manager?.walletIcon"></q-img>
              <q-img v-else :src="WIZARDCONNECT_LOGO"></q-img>
            </q-avatar>
            {{ $t('Connect') }}
          </template>
        </q-btn>
        <div v-else-if="
          Boolean(manager) && (state !== 'disconnected' || wallet?.ready)
        " class="q-mx-sm">
          <q-btn-group class="text-right" style="position: relative">
            <q-btn-dropdown size="lg" @before-show="onBeforeMenuShow" style="
                color: rgb(20, 20, 20);
                padding: 10px;
                border-radius: 10px;
                background-color: #282829d4;
                border: 2px solid #484854d4;
              " auto-close rounded :disable="!wallet?.ready">
              <template v-slot:label>
                <q-avatar rounded size="md" :class="{
                  pulse: state === 'connecting' || state === 'reconnecting',
                }">
                  <q-img v-if="manager.walletIcon" :src="manager.walletIcon"></q-img>
                  <q-img v-else :src="WIZARDCONNECT_LOGO"></q-img>
                </q-avatar>
              </template>
              <q-list padding style="width: 300px">
                <q-item clickable :to="{ name: 'dashboard' }">
                  <q-item-section avatar>
                    <q-avatar icon="dashboard"> </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>
                      <span style="position: relative">
                        Dashboard
                        <q-badge v-if="pendingMultisigTransactions?.length > 0" color="orange" label="!" floating
                          rounded></q-badge>
                      </span>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-separator inset class="q-my-md" />
                <q-item-label header></q-item-label>
                <q-item clickable to="/wizard-connect/requests">
                  <q-item-section avatar>
                    <q-avatar color="bch" text-color="white">
                      <q-icon name="pending"></q-icon>
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>WizardConnect Requests</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator inset class="q-my-md" />
                <q-item clickable @click="disconnect">
                  <q-item-section avatar>
                    <q-avatar color="negative" icon="link_off"></q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Disconnect</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <!-- <q-badge v-if="pendingMultisigTransactions?.length > 0" color="orange" label="!" floating></q-badge> -->
          </q-btn-group>
        </div>
        <!-- <light-switch /> -->
      </q-toolbar>
    </q-header>
    <q-drawer v-if="walletIsReady" v-model="leftDrawerOpen" show-if-above :breakpoint="$q.screen.sizes.sm - 1"
      v-close-popup class="sidebar-drawer">
      <div v-if="$q.screen.lt.sm" class="text-right q-ma-lg">
        <q-btn size="md" text-color="grey-6" icon="chevron_left" label="hide" @click="toggleLeftDrawer"
          class="justify-right" dense flat />
      </div>
      <q-scroll-area style="position: relative; height: 100vh; max-width: 100vw" :bar-style="{ width: '0px' }">
        <div class="row justify-center q-gutter-sm q-pt-lg">
          <div class="col-12 text-center">
            <q-btn to="/" size="2em" flat color="primary">
              <q-avatar size="4em">
                <q-img src="images/cts_icon.png"></q-img>
              </q-avatar>
            </q-btn>
          </div>
        </div>
        <SidebarMenu />
      </q-scroll-area>
    </q-drawer>
    <q-scroll-area style="position: relative; height: 100vh; max-width: 100vw" :bar-style="{ width: '0px' }"
      :thumb-style="{ width: '0px' }">
      <q-page-container>
        <!-- <q-linear-progress v-if="scanning" indeterminate color="primary" class="q-mt-none" />
        <div v-if="scanning" class="q-ml-sm q-mt-sm text-italic text-grey-200 text-caption">
          {{ scanning }}
        </div>
        <q-toolbar v-if="ui.routeBack" class="q-mt-sm q-mb-sm">
          <q-toolbar-title class="text-h6">{{
            ui.pageTitle || $route.meta?.pageTitle
          }}</q-toolbar-title>
        </q-toolbar>
        <template v-if="
          user.wallet?.isMultisig() && pendingMultisigTransactions?.length > 0
        ">
          <div class="q-pa-md q-gutter-sm">
            <q-banner inline-actions rounded class="bg-orange-400 text-warning">
              It looks like you still have a pending multisig transaction.
              Please make sure to finalize and broadcast it first, before
              creating a new transaction in Cashtokens Studio, to avoid any
              issues.
              <template v-slot:action>
                <q-btn v-if="route.name !== 'recent-transactions'" color="warning" icon="launch" label="Check it out"
                  text-color="black" :to="{ name: 'recent-transactions' }" no-caps />
              </template>
            </q-banner>
          </div>
        </template> -->
        <router-view />
        <!-- <q-ajax-bar /> -->
      </q-page-container>
    </q-scroll-area>
    <q-footer class="bg-grey-9 text-white">
      <div class="row items-center justify-center q-pa-sm">
        <div class="text-caption">
          Made with <span style="color: #e25555">❤️</span> by
          <a href="https://paytaca.com" target="_blank" rel="noopener" class="text-white q-ml-xs">Paytaca</a>
        </div>
      </div>
    </q-footer>
    <!-- <WizardConnectQRDialog :show="showQR" :qr-uri="(qrUri as string)" :uri="(uri as string)" :onClose="closeQR"
      @update:show="onQRUpdateShow" />
    <MessageDialog v-model="messageDialog" /> -->
  </q-layout>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { EventBus, useQuasar } from 'quasar';
import ClientDB from 'src/apps/clientonly/ClientDB';
import SidebarMenu from 'components/SidebarMenu.vue';
import { useUser } from 'src/stores/user';
import { useUI } from 'src/stores/ui';
import TransactionLogger from 'src/components/TransactionLogger.vue';
import getAppEnv from 'src/apps/utils/getAppEnv';
import MessageDialog from 'src/components/dialogs/MessageDialog.vue';
import { useInit } from 'src/composables/useInit';
import { useWalletConnect } from 'src/composables/useWalletConnect';
import { AuthKey, Watchtower } from 'src/apps';
import { delay, Wallet } from 'mainnet-js';
import { WIZARDCONNECT_LOGO } from 'wizardconnect-vue';
// import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
// import { WizardConnectQRDialog } from 'wizardconnect-vue';

const leftDrawerOpen = ref(false);
const user = useUser();
const ui = useUI();
const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const messageDialog = ref<boolean>(false);
const pendingMultisigTransactions = ref([]);
const scanning = ref<string | boolean>(false);
const eventBus = inject<EventBus>('eventBus');

const network = computed(() => import.meta.env.VITE_BCH_NETWORK);

const showHeader = computed(() => walletIsReady);

useWalletConnect();

const { state, manager, disconnect, showQR, uri, qrUri, wallet, walletIsReady } =
  inject('wizardConnectWallet') as any;
// const { wallet, manager, state, disconnect, showQR, uri, qrUri } = useWizardConnectWallet()
// const { wallet, manager, state, disconnect, showQR, uri, qrUri } = wizardConnectWallet

const closeQR = () => {
  showQR.value = false;
};
const onQRUpdateShow = (val: boolean) => {
  if (!val) showQR.value = false;
};

eventBus?.on('updatedPendingMultisigTransactions', async () => {
  pendingMultisigTransactions.value =
    await user.getPendingMultisigTransactions();
});

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};

const onBeforeMenuShow = () => {
  const db = ClientDB.getInstance();
  db.getPendingMultisigTransactions().then((v) => {
    pendingMultisigTransactions.value = v;
  });
};

const scanReserves = async () => {
  scanning.value = 'Checking wallet for AuthKeys...';
  try {
    if (user.wallet) {
      const watchtower = new Watchtower();
      const paginatedAuthKeys = await watchtower.fetchAuthKeys(
        user.wallet.getTokenDepositAddress()
      );
      for (const a of paginatedAuthKeys?.results) {
        const authKey = new AuthKey(
          { ...a, ownerWallet: user.wallet as Wallet },
          user.transactionSigner
        );
        scanning.value = 'AuthKey found, scanning for managed tokens...';
        await delay(2000);
        watchtower.subscribe(
          authKey.authGuard.contract!.getTokenDepositAddress()
        );
      }
    }
  } catch (error) {
  } finally {
    scanning.value = false;
  }
};

useInit();

const onDisconnectClick = async () => {
  await disconnect();
  router.push('/');
};

// watch(
//   () => route.path,
//   () => {
//     ui.clearStatusMessage();
//   }
// );

// watch(
//   () => ui.statusMessage,
//   (value) => {
//     if (value) {
//       messageDialog.value = true;
//     }
//   }
// );

// watch(
//   () => user.wallet,
//   async (wallet) => {
//     if (wallet !== undefined && typeof wallet.isMultisig === 'function') {
//       pendingMultisigTransactions.value =
//         await user.getPendingMultisigTransactions();
//     }
//   }
// );

watch(
  () => state.value,
  (newState, oldState) => {
    console.log('@state mainlayout', newState, oldState);
  }
);
onMounted(async () => {
  const db = ClientDB.getInstance();
  pendingMultisigTransactions.value =
    await user.getPendingMultisigTransactions();

  console.log('manager', manager.value);
});
</script>

<style scoped>
.app-logo {
  max-height: 3em;
  max-width: 8em;
  object-fit: contain;
}

.sidebar-drawer {
  background: #1e1e1e;
}

@media (max-width: 600px) {
  .app-logo {
    max-height: 2.2em;
    max-width: 4.5em;
  }
}

.pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.6);
  }

  70% {
    transform: scale(1.08);
    box-shadow: 0 0 0 12px rgba(25, 118, 210, 0);
  }

  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
}
</style>
