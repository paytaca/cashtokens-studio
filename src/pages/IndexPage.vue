<template>
  <q-page class="index-page bg-dark text-white">
    <div class="index-container column items-center q-pa-md q-pa-sm-lg">

      <!-- Hero -->
      <div class="hero column items-center text-center">
        <q-img src="images/cts_transparent.png" :style="bannerSize" class="hero-logo" alt="CashTokens Studio" />

        <div class="hero-tagline text-subtitle1 text-grey-5">
          {{ t('index.hero.tagline') }}
        </div>
      </div>

      <!-- Wallet connection -->
      <div class="connect-section">
        <q-card class="connect-card">
          <q-card-section class="row items-center no-wrap q-pa-md q-pa-sm-lg">

            <div class="connect-icon">
              <q-icon name="mdi-wizard-hat" size="30px" color="primary" />
            </div>

            <div class="col q-ml-md">
              <template v-if="isConnecting">
                <div class="text-subtitle1 text-weight-bold text-white">
                  {{
                    state === 'reconnecting'
                      ? t('index.connect.reconnecting')
                      : t('index.connect.connecting')
                  }}
                </div>

                <div class="text-caption text-grey-5 q-mt-xs">
                  {{ t('index.connect.hint') }}
                </div>

                <q-linear-progress indeterminate rounded color="primary" track-color="dark" class="q-mt-sm"
                  style="height: 4px" />
              </template>

              <template v-else>
                <div class="text-subtitle1 text-weight-bold text-white">
                  {{ t('index.connect.title') }}
                </div>

                <div class="text-caption text-grey-5 q-mt-xs">
                  {{ t('index.connect.subtitle') }}
                </div>
              </template>
            </div>

            <q-btn v-if="!isConnecting" color="primary" unelevated rounded no-caps
              class="connect-button text-weight-bold" :label="t('index.connect.action')" @click="onConnect" />

          </q-card-section>
        </q-card>
      </div>

      <!-- Create token -->
      <div class="create-section full-width">
        <div class="section-heading">
          <div class="text-overline text-grey-6">
            {{ t('index.create.title', 'CREATE TOKEN') }}
          </div>

          <div class="text-h5 text-weight-bold">
            {{ t('index.create.subtitle', 'Choose what you want to create') }}
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div v-for="card in featureCards" :key="card.name" class="col-12 col-sm-6">
            <q-card class="feature-card" :class="{ 'card-muted': !walletIsReady }" :clickable="walletIsReady"
              :aria-disabled="!walletIsReady" @click="onFeatureCardClick(card)">
              <q-card-section class="feature-card-content">

                <div class="feature-graphic" :class="`graphic-${card.name}`">
                  <q-icon :name="card.icon" size="42px" />
                </div>

                <div class="feature-info">
                  <div class="feature-title">
                    {{ card.title }}
                  </div>

                  <div class="feature-caption">
                    {{ card.caption }}
                  </div>
                </div>

                <q-icon name="arrow_forward" class="feature-arrow" size="22px" />

              </q-card-section>
            </q-card>
          </div>
        </div>

        <div v-if="!walletIsReady" class="wallet-required text-center text-caption text-grey-6 q-mt-md">
          <q-icon name="lock_outline" size="15px" class="q-mr-xs" />
          {{ t('index.connect.hint') }}
        </div>
      </div>

    </div>

    <WizardConnectQRDialog :show="showQR" :qr-uri="qrUri as string" :uri="uri as string" :onClose="closeQR"
      @update:show="onQRUpdateShow" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { WizardConnectQRDialog } from 'wizardconnect-vue';
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';

const { t } = useI18n();
const $q = useQuasar();
const router = useRouter();

$q.dark.set(true);

const { walletIsReady, state, connect, showQR, uri, qrUri } =
  useWizardConnectWallet();

const bannerSize = computed(() => {
  if ($q.screen.lt.sm) {
    return { width: '280px' };
  }
  return { width: '450px' };
});

const isConnecting = computed(
  () => state.value === 'connecting' || state.value === 'reconnecting'
);

const featureCards = computed(() => [
  {
    name: 'fungible',
    icon: 'payments',
    title: t('index.createFungible.title'),
    caption: t('index.createFungible.caption'),
    query: { type: 'Fungible' },
  },
  {
    name: 'nft',
    icon: 'art_track',
    title: t('index.createNft.title'),
    caption: t('index.createNft.caption'),
    query: { type: 'NonFungible' },
  },
]);

const onFeatureCardClick = (card: { query: Record<string, string> }) => {
  if (!walletIsReady.value) return;
  router.push({ name: 'create-token', query: card.query });
};

const onConnect = () => {
  connect();
};

const closeQR = () => {
  showQR.value = false;
};

const onQRUpdateShow = (val: boolean) => {
  if (!val) showQR.value = false;
};

watch(
  () => state.value,
  (newState) => {
    if (newState === 'connected') {
      showQR.value = false;
    }
  }
);
</script>

<style scoped>
/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

.index-page {
  min-height: 100%;
  overflow-x: hidden;
}

.bg-dark {
  background:
    radial-gradient(circle at 50% 15%,
      #252a36 0%,
      #171a21 38%,
      #0d0f13 100%) !important;
}

.index-container {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.hero {
  margin-top: 24px;
  margin-bottom: 40px;
}

.hero-logo {
  filter:
    drop-shadow(0 0 18px rgba(255, 255, 255, 0.06)) drop-shadow(0 12px 30px rgba(0, 0, 0, 0.3));
}

.hero-tagline {
  max-width: 460px;
  margin-top: 12px;
  line-height: 1.5;
}

/* -------------------------------------------------------------------------- */
/* Connect Wallet                                                             */
/* -------------------------------------------------------------------------- */

.connect-section {
  width: 100%;
  max-width: 680px;
  margin-bottom: 40px;
}

.connect-card {
  border-radius: 18px;

  background:
    linear-gradient(135deg,
      rgba(35, 40, 51, 0.98),
      rgba(25, 28, 36, 0.98));

  border: 1px solid rgba(var(--q-primary), 0.25);

  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.3),
    0 0 25px rgba(var(--q-primary), 0.05);
}

.connect-icon {
  width: 52px;
  height: 52px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 15px;

  background: rgba(var(--q-primary), 0.1);
  border: 1px solid rgba(var(--q-primary), 0.2);
}

.connect-button {
  flex-shrink: 0;
  min-width: 150px;
  padding: 9px 20px;

  box-shadow:
    0 5px 15px rgba(var(--q-primary), 0.18);
}

/* -------------------------------------------------------------------------- */
/* Create section                                                             */
/* -------------------------------------------------------------------------- */

.create-section {
  max-width: 680px;
}

.section-heading {
  margin-bottom: 18px;
  padding-left: 4px;
}

.section-heading .text-overline {
  letter-spacing: 1.5px;
  font-size: 11px;
}

.section-heading .text-h5 {
  margin-top: 2px;
}

/* -------------------------------------------------------------------------- */
/* Feature cards                                                              */
/* -------------------------------------------------------------------------- */

.feature-card {
  position: relative;

  min-height: 180px;

  border-radius: 22px;

  background:
    linear-gradient(145deg,
      rgba(30, 34, 43, 0.98),
      rgba(20, 23, 30, 0.98));

  border: 1px solid rgba(255, 255, 255, 0.08);

  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.025);

  overflow: hidden;

  transition:
    transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.feature-card::after {
  content: '';

  position: absolute;
  inset: 0;

  background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.035),
      transparent 45%);

  pointer-events: none;
}

.feature-card:not(.card-muted):hover {
  transform: translateY(-5px);

  border-color: rgba(255, 255, 255, 0.16);

  box-shadow:
    0 16px 35px rgba(0, 0, 0, 0.45),
    0 0 25px rgba(var(--q-primary), 0.05);
}

.feature-card:not(.card-muted):active {
  transform: translateY(-1px);
}

.feature-card-content {
  position: relative;
  z-index: 1;

  min-height: 180px;

  display: flex;
  align-items: center;

  padding: 28px;
}

/* -------------------------------------------------------------------------- */
/* Feature graphic                                                            */
/* -------------------------------------------------------------------------- */

.feature-graphic {
  width: 76px;
  height: 76px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 20px;

  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.feature-card:not(.card-muted):hover .feature-graphic {
  transform: scale(1.06);
}

.graphic-fungible {
  color: #81c784;

  background:
    radial-gradient(circle at 30% 25%,
      rgba(129, 199, 132, 0.3),
      rgba(46, 125, 50, 0.08));

  border: 1px solid rgba(129, 199, 132, 0.25);

  box-shadow:
    0 8px 25px rgba(46, 125, 50, 0.1);
}

.graphic-nft {
  color: #64b5f6;

  background:
    radial-gradient(circle at 30% 25%,
      rgba(100, 181, 246, 0.3),
      rgba(2, 119, 189, 0.08));

  border: 1px solid rgba(100, 181, 246, 0.25);

  box-shadow:
    0 8px 25px rgba(2, 119, 189, 0.1);
}

/* -------------------------------------------------------------------------- */
/* Feature text                                                               */
/* -------------------------------------------------------------------------- */

.feature-info {
  flex: 1;
  min-width: 0;
  margin-left: 22px;
  padding-right: 12px;
}

.feature-title {
  color: white;

  font-size: 18px;
  font-weight: 700;

  line-height: 1.25;
}

.feature-caption {
  margin-top: 7px;

  color: #8d929e;

  font-size: 13px;
  line-height: 1.5;
}

.feature-arrow {
  color: rgba(255, 255, 255, 0.28);

  transition:
    transform 0.25s ease,
    color 0.25s ease;
}

.feature-card:not(.card-muted):hover .feature-arrow {
  color: rgba(255, 255, 255, 0.75);
  transform: translateX(4px);
}

/* -------------------------------------------------------------------------- */
/* Disabled state                                                             */
/* -------------------------------------------------------------------------- */

.card-muted {
  opacity: 0.42;
  filter: grayscale(0.65);
  cursor: not-allowed;
}

.card-muted .feature-arrow {
  opacity: 0.4;
}

.wallet-required {
  opacity: 0.8;
}

/* -------------------------------------------------------------------------- */
/* Mobile                                                                     */
/* -------------------------------------------------------------------------- */

@media (max-width: 599px) {
  .index-container {
    padding-top: 12px;
    padding-bottom: 24px;
  }

  .hero {
    margin-top: 12px;
    margin-bottom: 30px;
  }

  .connect-section {
    margin-bottom: 32px;
  }

  .connect-card {
    border-radius: 16px;
  }

  .connect-card .q-card__section {
    flex-wrap: wrap;
  }

  .connect-button {
    width: 100%;
    margin-top: 14px;
  }

  .feature-card,
  .feature-card-content {
    min-height: 150px;
  }

  .feature-card-content {
    padding: 22px;
  }

  .feature-graphic {
    width: 62px;
    height: 62px;
    border-radius: 17px;
  }

  .feature-graphic .q-icon {
    font-size: 34px !important;
  }

  .feature-info {
    margin-left: 16px;
  }

  .feature-title {
    font-size: 16px;
  }

  .feature-caption {
    font-size: 12px;
  }
}
</style>
