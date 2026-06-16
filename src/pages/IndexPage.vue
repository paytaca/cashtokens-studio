<template>
  <q-page class="row justify-evenly items-center">
    <div class="col-12">
      <div v-if="wallet.ready" class="row justify-center q-pa-md q-gutter-md">
        <div class="col-12 text-center q-mb-md">
          <div class="text-center text-h4 text-weight-bold">
            <div>Welcome to</div>
            <q-img src="images/cts_transparent.png" :style="bannerSize" />
          </div>
          <div class="text-subtitle1 text-grey q-mt-sm">
            Create, manage, and explore Cash Tokens on Bitcoin Cash
          </div>
        </div>
        <q-card class="action-card" @click="router.push({ name: 'create-token' })">
          <q-card-section class="text-center">
            <q-icon name="add_circle" size="48px" color="primary" />
            <div class="text-h6 q-mt-sm">Create Token</div>
            <div class="text-caption text-grey">
              Create a new token
            </div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'ft-reserves' })">
          <q-card-section class="text-center">
            <q-icon name="account_balance" size="48px" color="warning" />
            <div class="text-h6 q-mt-sm">FT Reserves</div>
            <div class="text-caption text-grey">
              Manage fungible token reserves
            </div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'nft-reserves' })">
          <q-card-section class="text-center">
            <q-icon name="photo_library" size="48px" color="accent" />
            <div class="text-h6 q-mt-sm">NFT Reserves</div>
            <div class="text-caption text-grey">Manage NFT reserves</div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'my-fts' })">
          <q-card-section class="text-center">
            <q-icon name="money" size="48px" color="positive" />
            <div class="text-h6 q-mt-sm">My FTs</div>
            <div class="text-caption text-grey">View your fungible tokens in your wallet</div>
          </q-card-section>
        </q-card>
        <q-card class="action-card" @click="router.push({ name: 'my-nfts' })">
          <q-card-section class="text-center">
            <q-icon name="art_track" size="48px" color="info" />
            <div class="text-h6 q-mt-sm">My NFTs</div>
            <div class="text-caption text-grey">View your NFTs in your wallet</div>
          </q-card-section>
        </q-card>
      </div>
      <div v-else class="row justify-center items-center q-px-lg q-pt-lg q-gutter-sm">
        <div class="col-12 text-center">
          <q-img src="images/cts_transparent.png" :style="bannerSize" />
        </div>
        <q-card class="action-card q-py-xs" style="width: 280px" @click="() => connect()">
          <q-card-section class="text-center">
            <div class="flex no-wrap items-center justify-center text-primary" style="width: 250px; height: 100px">
              <q-avatar>
                <q-icon name="mdi-wizard-hat" size="2.5em"></q-icon>
              </q-avatar>
              <span class="text-bold text-h5">WizardConnect</span>
            </div>
            <div class="text-caption text-grey">
              To get started, click here to connect your wallet thru WizardConnect.
            </div>
          </q-card-section>
          <q-inner-loading :showing="state === 'reconnecting'">
            <q-spinner-gears size="50px" color="primary" />
          </q-inner-loading>
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
const isMobileBrowser = ref<boolean>(false);
const router = useRouter();
const bannerSize = computed(() => {
  let size = { width: '500px' }

  if ($q.screen.lt.sm) {
    size = { width: '320px' }
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
});
</script>

<style scoped>
.action-card {
  width: 180px;
  cursor: pointer;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  border-color: rgba(255, 255, 255, 0.2);
}

.wallet-connect-wrapper {
  max-width: 100%;
  overflow: hidden;
}
</style>
