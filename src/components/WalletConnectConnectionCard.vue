<template>
  <div v-if="isActive" class="col-12 col-md-5">
    <q-card flat class="dashboard-section-card">
      <q-card-section>
        <div class="row items-center no-wrap q-gutter-sm">
          <q-avatar rounded>
            <q-img v-if="walletIcon" :src="walletIcon" size="xs"></q-img>
            <q-icon v-else name="mdi-link-variant" color="primary" size="28px" />
          </q-avatar>
          <div class="col" style="min-width: 0">
            <div class="text-subtitle1 text-weight-bold text-white">{{ t('dashboard.walletConnect.title') }}</div>
            <div class="text-caption text-grey-4">{{ t('dashboard.walletConnect.caption') }}</div>
          </div>
        </div>
      </q-card-section>
      <q-separator dark inset />

      <q-card-section class="q-pt-sm q-pb-sm">
        <q-list dense dark>
          <q-item class="px-0">
            <q-item-section>
              <q-item-label caption class="text-grey-5">{{ t('dashboard.walletConnect.wallet') }}</q-item-label>
              <q-item-label class="text-grey-2">{{ walletName || t('dashboard.wallet.notAvailable') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item class="px-0">
            <q-item-section>
              <q-item-label caption class="text-grey-5">{{ t('dashboard.walletConnect.state') }}</q-item-label>
              <q-item-label>
                <q-badge :color="stateColor">
                  <span class="text-black">{{ stateLabel }}</span>
                </q-badge>
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item class="px-0">
            <q-item-section>
              <q-item-label caption class="text-grey-5">{{ t('dashboard.walletConnect.address') }}</q-item-label>
              <q-item-label class="row items-center no-wrap q-gutter-x-sm">
                <span class="ellipsis text-grey-2" :title="address || ''">
                  {{ address || t('dashboard.wallet.notAvailable') }}
                </span>
                <q-btn v-if="address" flat dense round size="sm" icon="content_copy" color="grey-5"
                  @click="copyValue(address)">
                  <q-tooltip>{{ t('dashboard.copy.tooltip') }}</q-tooltip>
                </q-btn>
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item class="px-0">
            <q-item-section>
              <q-item-label caption class="text-grey-5">{{ t('dashboard.walletConnect.chain') }}</q-item-label>
              <q-item-label class="text-grey-2">{{ chainId }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="topic" class="px-0">
            <q-item-section>
              <q-item-label caption class="text-grey-5">{{ t('dashboard.walletConnect.topic') }}</q-item-label>
              <q-item-label class="row items-center no-wrap q-gutter-x-sm">
                <span class="ellipsis text-grey-2" :title="topic">{{ shorten(topic) }}</span>
                <q-btn flat dense round size="sm" icon="content_copy" color="grey-5" @click="copyValue(topic)">
                  <q-tooltip>{{ t('dashboard.copy.tooltip') }}</q-tooltip>
                </q-btn>
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item class="px-0">
            <q-item-section>
              <q-item-label caption class="text-grey-5">{{ t('dashboard.walletConnect.expiry') }}</q-item-label>
              <q-item-label class="text-grey-2">{{ expiresAt }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useWalletConnectWallet } from 'src/composables/useWalletConnectWallet'

/**
 * WalletConnect's counterpart of the WizardConnect connection card on the dashboard.
 *
 * Deliberately self-contained: it reads only its own composable, owns its column wrapper, and hides
 * itself when there is no WalletConnect session. Retiring WalletConnect means deleting this file and
 * the single `<WalletConnectConnectionCard />` tag in `DashboardPage.vue` — the WizardConnect card
 * beside it is never aware of any of this.
 */
const { t } = useI18n()
const $q = useQuasar()
const { walletIsReady, walletName, walletIcon, address, state, session, chainId } = useWalletConnectWallet()

const isActive = computed(() => walletIsReady.value)

const stateColor = computed(() => {
  if (state.value === 'connected') return 'positive'
  if (state.value === 'connecting') return 'info'
  return 'grey-6'
})

const stateLabel = computed(() => t(`dashboard.banner.state.${state.value}`))

const topic = computed(() => session.value?.topic)

const expiresAt = computed(() => {
  const expiry = session.value?.expiry
  return expiry ? new Date(expiry * 1000).toLocaleString() : t('dashboard.walletConnect.noExpiry')
})

function shorten(value: string, head = 12, tail = 6): string {
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

function copyValue(value: string) {
  navigator.clipboard?.writeText(value)
  $q.notify({ type: 'positive', message: t('dashboard.copy.copied'), position: 'top' })
}
</script>

<!--
  Duplicated from DashboardPage's scoped styles on purpose: the card must look identical without
  sharing a stylesheet, so this file stays independently deletable.
-->
<style scoped>
.dashboard-section-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(36, 41, 54, 0.85) 0%, rgba(13, 15, 19, 0.95) 100%);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}

.dashboard-section-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.px-0 {
  padding-left: 0;
  padding-right: 0;
}
</style>
