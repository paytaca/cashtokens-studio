<template>
  <q-page class="page-skeleton">
    <div class="q-px-md content-container q-mt-xl q-gutter-y-lg">
      <q-card class="skeleton-card q-pa-lg rounded-borders">
        <WalletInitializing :message="message" embedded />
        <div class="q-gutter-y-md q-mt-xl">
          <div v-for="i in 3" :key="i" class="row items-center q-gutter-x-md">
            <q-skeleton type="rect" size="36px" class="rounded-borders" />
            <div class="column q-gutter-y-xs" style="flex: 1">
              <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
              <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
            </div>
            <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
          </div>
        </div>
      </q-card>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import WalletInitializing from 'src/components/WalletInitializing.vue';

defineProps<{
  /** Forwarded to WalletInitializing, e.g. `$t('info.initializingWallet')`. */
  message: string;
}>();
</script>

<style scoped>
.page-skeleton {
  min-height: 100%;
  overflow-x: hidden;
}

.content-container {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  box-sizing: border-box;
}

/* Mirrors ExplainerBanner's frame so the swap is only the contents. */
.skeleton-banner {
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: linear-gradient(135deg,
      rgba(36, 41, 54, 0.85) 0%,
      rgba(13, 15, 19, 0.95) 100%);
}

.skeleton-card {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
