<template>
  <q-page class="row justify-evenly items-center bg-dark text-white">
    <div class="col-12">
      <div v-if="wallet.ready" class="row justify-center q-pa-md q-gutter-md">
        <div class="col-12 text-center q-mb-md">
          <div class="text-center text-h4 text-weight-bold">
            <div>Welcome to</div>
            <q-img src="images/cts_transparent.png" :style="bannerSize" />
          </div>
          <div class="text-subtitle1 text-grey-5 q-mt-sm">
            Create, manage, and explore Cash Tokens on Bitcoin Cash
          </div>
        </div>
        <q-card class="action-card" @click="router.push({ name: 'create-token' })">
          <q-card-section class="text-center">
            <q-icon name="add_circle" size="48px" color="primary" />
            <div class="text-h6 q-mt-sm">Create Token</div>
            <div class="text-caption text-grey-5">
              Create a new token
            </div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'ft-reserves' })">
          <q-card-section class="text-center">
            <q-icon name="account_balance" size="48px" color="warning" />
            <div class="text-h6 q-mt-sm">FT Reserves</div>
            <div class="text-caption text-grey-5">
              Manage fungible token reserves
            </div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'nft-reserves' })">
          <q-card-section class="text-center">
            <q-icon name="photo_library" size="48px" color="accent" />
            <div class="text-h6 q-mt-sm">NFT Reserves</div>
            <div class="text-caption text-grey-5">Manage NFT reserves</div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'my-fts' })">
          <q-card-section class="text-center">
            <q-icon name="money" size="48px" color="positive" />
            <div class="text-h6 q-mt-sm">My FTs</div>
            <div class="text-caption text-grey-5">View your fungible tokens in your wallet</div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'my-nfts' })">
          <q-card-section class="text-center">
            <q-icon name="art_track" size="48px" color="info" />
            <div class="text-h6 q-mt-sm">My NFTs</div>
            <div class="text-caption text-grey-5">View your NFTs in your wallet</div>
          </q-card-section>
        </q-card>
      </div>

      <div v-else-if="state === 'connecting' || state === 'reconnecting'"
        class="absolute-center column items-center justify-center q-pa-xl loading-container">
        <div class="text-center q-mb-xl">
          <q-img src="images/cts_transparent.png" :style="bannerSize" class="glowing-logo" />
        </div>

        <div class="column items-center q-gutter-md full-width" style="max-width: 320px;">
          <div class="spinner-wrapper q-mb-sm">
            <q-spinner-eclipse size="64px" color="primary" />
            <q-icon name="mdi-wizard-hat" size="2em" color="primary" class="absolute-center hat-bounce" />
          </div>

          <div class="text-subtitle1 text-weight-medium text-grey-4 tracking-wide">
            {{ state === 'reconnecting' ? 'Reconnecting Wallet...' : 'Connecting Wallet...' }}
          </div>

          <q-linear-progress indeterminate rounded color="primary" track-color="dark" class="glow-progress q-mt-xs"
            style="height: 6px;" />

          <div class="text-caption text-grey-6 text-center q-px-md">
            Please authorize the connection request inside your WizardConnect extension.
          </div>
        </div>
      </div>
      <div v-else class="row justify-center items-center q-px-lg q-pt-lg q-gutter-sm">
        <div class="col-12 text-center">
          <q-img src="images/cts_transparent.png" :style="bannerSize" />
        </div>
        <q-card class="action-card q-py-md" style="width: 320px" @click="() => connect()">
          <q-card-section class="text-center">
            <div class="flex no-wrap items-center justify-center text-primary q-mb-sm" style="height: 60px">
              <q-avatar size="md" class="q-mr-sm">
                <q-icon name="mdi-wizard-hat" size="2em"></q-icon>
              </q-avatar>
              <span class="text-bold text-h5">WizardConnect</span>
            </div>
            <div class="text-caption text-grey-5">
              To get started, click here to connect your wallet through WizardConnect.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { delay } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const $q = useQuasar();
// Set dark mode context globally for this component
$q.dark.set(true);

const isMobileBrowser = ref<boolean>(false);
const router = useRouter();
const bannerSize = computed(() => {
  let size = { width: '450px' }

  if ($q.screen.lt.sm) {
    size = { width: '280px' }
  }
  return size;
});

const {
  wallet,
  manager,
  state,
  connect
} = useWizardConnectWallet()

onMounted(async () => {
  await delay(100);
  isMobileBrowser.value = /Mobi/.test(navigator?.userAgent);

  // Optional: Auto-trigger connection if the app launches completely disconnected
  if (!wallet.value?.ready && state.value === 'idle') {
    connect();
  }
});
</script>

<style scoped>
.bg-dark {
  background: radial-gradient(circle at center, #1e222d 0%, #0f1115 100%) !important;
}

.loading-container {
  width: 100%;
  max-width: 500px;
  animation: fadeIn 0.6s ease-out;
}

.spinner-wrapper {
  position: relative;
  display: inline-block;
}

.hat-bounce {
  animation: float 2s ease-in-out infinite;
}

.glow-progress {
  box-shadow: 0 0 12px rgba(var(--q-primary), 0.4);
}

.glowing-logo {
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.05));
}

.tracking-wide {
  letter-spacing: 0.75px;
}

.action-card {
  width: 180px;
  cursor: pointer;
  border-radius: 16px;
  background: #191c24;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s, border-color 0.25s;
}

.action-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), 0 0 15px rgba(var(--q-primary), 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

@keyframes float {

  0%,
  100% {
    transform: translate(-50%, -55%);
  }

  50% {
    transform: translate(-50%, -45%);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
