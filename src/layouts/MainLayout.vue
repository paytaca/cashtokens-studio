<template>
  <q-layout view="hHh lpr fFf">
    <q-header v-if="showAppChrome" class="header-subtle">
      <q-toolbar class="q-py-sm">
        <q-btn v-if="$q.screen.lt.sm && showAppChrome" flat dense round icon="menu" aria-label="Menu" size="lg"
          @click="toggleLeftDrawer" />
        <q-toolbar-title>
          <q-img v-if="showHeaderLogo" @click.stop="router.push('/')" src="/images/cts_transparent.png"
            alt="CashTokens Studio" class="cursor-pointer app-logo" />
        </q-toolbar-title>
        <q-btn v-if="(!Boolean(manager) || state === 'disconnected') && !isIndexPage" to="/wizard-connect" style="
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
          <q-btn-group class="text-right q-my-sm" style="position: relative">
            <q-btn-dropdown size="lg" style="
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
              <q-list padding style="width: 200px">
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
          </q-btn-group>
        </div>
      </q-toolbar>
    </q-header>
    <q-drawer v-if="showAppChrome" v-model="leftDrawerOpen" show-if-above :breakpoint="$q.screen.sizes.sm - 1"
      class="sidebar-drawer">
      <div v-if="$q.screen.lt.sm" class="text-right q-ma-lg">
        <q-btn size="md" text-color="grey-6" icon="chevron_left" label="hide" @click="toggleLeftDrawer"
          class="justify-right" dense flat />
      </div>
      <q-scroll-area style="position: relative; height: 100%; max-width: 100vw" :bar-style="{ width: '0px' }">
        <div class="row justify-center q-gutter-sm q-pt-lg">
          <div class="col-12 text-center">
            <q-btn to="/" size="2em" flat color="primary">
              <q-avatar size="3em">
                <q-img src="/images/cts_icon.png"></q-img>
              </q-avatar>
            </q-btn>
          </div>
        </div>
        <SidebarMenu />
      </q-scroll-area>
    </q-drawer>
    <q-scroll-area style="position: relative; height: 100vh; max-width: 100vw" :bar-style="{ width: '0px' }"
      :thumb-style="{ width: '0px' }" class="q-pt-lg">
      <q-page-container>
        <PageSkeleton v-if="wallet?.initializing && !isIndexPage" :message="$t('info.initializingWallet')" />
        <router-view v-else />
      </q-page-container>
    </q-scroll-area>
    <q-footer class="footer-subtle text-white">
      <div class="row items-center justify-center q-pa-sm">
        <div class="text-caption">
          Made with <span style="color: #e25555">❤️</span> by
          <a href="https://paytaca.com" target="_blank" rel="noopener" class="text-white q-ml-xs">Paytaca</a>
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import SidebarMenu from 'components/SidebarMenu.vue';
import PageSkeleton from 'src/components/PageSkeleton.vue';
import { WIZARDCONNECT_LOGO } from 'wizardconnect-vue';

const leftDrawerOpen = ref(false);
const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const isIndexPage = computed(() => route.path === '/');

const showHeaderLogo = computed(() => $q.screen.gt.xs);

const { state, manager, disconnect, wallet } =
  inject('wizardConnectWallet') as any;

const showAppChrome = computed(
  () =>
    Boolean(manager.value) ||
    Boolean(wallet.value?.ready) ||
    Boolean(wallet.value?.initializing)
);

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};


</script>

<style scoped>
.sidebar-drawer {
  background-color: #002b5c;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
    radial-gradient(rgba(0, 0, 0, 0.4) 1px, transparent 1px);
  background-size: 4px 4px;
  background-position: 0 0, 2px 2px;
}

.app-logo {
  max-height: 3em;
  max-width: 8em;
  object-fit: contain;
}

.header-subtle {
  background: rgba(13, 15, 19, 0.028) !important;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}

.footer-subtle {
  background: transparent !important;
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

<style lang="scss">
.q-drawer--standard {
  background: rgba(13, 15, 19, 0.028) !important;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}

.q-drawer--mobile {
  background: rgba(18, 20, 26, 0.72) !important;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}
</style>
