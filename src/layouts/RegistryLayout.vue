<template>
  <div>
    <template v-if="wallet?.initializing">
      <WalletInitializing :message="$t('info.initializingWallet')" />
    </template>
    <template v-else>
      <div class="row justify-center registry-row">
        <div class="col-xs-12 col-sm-10 col-md-8 registry-col">
          <div class="q-mb-md q-px-sm">
            <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="router.back()" />
          </div>
          <q-card flat class="bg-dark q-pa-sm q-mx-md rounded-borders registry-card q-py-lg">
            <div class="row justify-end">
              <q-btn
                v-if="activeAuthhead && (!route.name?.toString().includes('edit') && route.name !== 'view-authhead')"
                icon="mdi-text-box-edit" :label="$q.screen.gt.xs ? 'Edit' : ''" dense flat color="secondary"
                @click="toggleWriteMode">
              </q-btn>
            </div>
            <div class="flex justify-center items-start header-row">
              <div class="flex justify-center no-wrap items-center header-main">
                <q-btn @click="triggerUpload" class="row justify-center text-center" dense flat no-caps>
                  <div class="col-12">
                    <q-avatar :size="$q.screen.lt.sm ? '4rem' : '6rem'" class="bg-grey-9 border-radius-8 shadow-1">
                      <q-img v-if="activeIdentitySnapshot?.uris?.icon"
                        :src="ipfsToGatewayUrl(activeIdentitySnapshot.uris.icon)!" fit="cover" />
                      <q-icon v-else name="token" color="primary" size="32px" />
                    </q-avatar>
                  </div>
                  <div v-if="route.name === 'edit-identity-snapshot'" class="col-12 text-grey-8 text-italic">Click To
                    Change
                  </div>
                </q-btn>

                <div class="q-gutter-y-sm header-text q-ml-lg q-py-md" style="min-width: 0">
                  <div class="flex items-center q-mt-xs token-symbol">
                    {{ activeIdentitySnapshot?.token?.symbol || 'Unknown' }}
                  </div>
                  <div class="text-mono text-grey-2 ellipsis">
                    <q-chip color="grey-8">
                      <CopyText v-if="activeIdentitySnapshot?.token?.category"
                        :text="activeIdentitySnapshot?.token?.category" />
                      {{
                        $q.screen.lt.lg
                          ? shortenTokenId(
                            activeIdentitySnapshot?.token?.category as string
                          )
                          : activeIdentitySnapshot?.token?.category
                      }}
                    </q-chip>


                  </div>
                  <div v-if="activeIdentitySnapshot?.uris?.web">
                    <a :href="activeIdentitySnapshot.uris.web" target="_blank" rel="noopener noreferrer"
                      class="web-chip-link">
                      <q-chip icon="mdi-web" color="secondary" clickable>
                        {{ activeIdentitySnapshot.uris.web }}
                      </q-chip>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Only this nav scrolls horizontally when the links don't fit -->
            <div class="inline-nav-wrap" :style="$q.screen.lt.sm ? { maxWidth: '380px' } : undefined">
              <nav ref="navRef" class="inline-nav q-py-lg" @scroll.passive="updateScrollState">
                <div class="inline-nav-row">
                  <q-item v-for="link in navLinks" :key="link.title" clickable v-ripple :to="link.to" exact
                    active-class="inline-item-active" class="inline-item q-px-md q-py-sm rounded-borders text-no-wrap">
                    <q-item-section v-if="link.icon" avatar class="inline-icon-section q-mr-sm">
                      <q-icon :name="link.icon" size="20px" class="inline-icon" />
                    </q-item-section>
                    <q-item-section class="inline-text-section">
                      <span class="nav-text-wrapper">
                        <q-item-label class="text-weight-medium text-body2">
                          {{ link.title }}
                        </q-item-label>
                      </span>
                    </q-item-section>
                  </q-item>
                </div>
              </nav>

              <!-- Scroll indicators: visible only when there's more content in that direction -->
              <div class="nav-fade nav-fade-left" :class="{ visible: canScrollLeft }">
                <q-icon name="chevron_left" size="20px" class="nav-chevron" @click="scrollNav(-1)" />
              </div>
              <div class="nav-fade nav-fade-right" :class="{ visible: canScrollRight }">
                <q-icon name="chevron_right" size="20px" class="nav-chevron" @click="scrollNav(1)" />
              </div>
            </div>
          </q-card>
        </div>
      </div>
      <router-view />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import { shortenTokenId } from 'src/core/utils';
import { useAuthguardStore } from 'src/stores/authguard';
import { useRegistryStore } from 'src/stores/registry';
import { computed, inject, onBeforeUnmount, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CopyText from 'src/components/CopyText.vue';
import WalletInitializing from 'src/components/WalletInitializing.vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';

const $q = useQuasar()
const registryStore = useRegistryStore();
const { activeIdentitySnapshot } = storeToRefs(registryStore);
const authguardStore = useAuthguardStore();
const { activeAuthhead } = storeToRefs(authguardStore);
const { wallet } = inject('wizardConnectWallet') as any;


const route = useRoute();
const router = useRouter();
const mode = ref<'edit' | 'view'>('view');

const isUploadTriggered = ref(false)

const triggerUpload = () => {
  if (route.name !== 'edit-identity-snapshot') return
  isUploadTriggered.value = true
}

const resetUploadTrigger = () => {
  isUploadTriggered.value = false
}

provide('iconUploadTriggered', {
  isUploadTriggered,
  resetUploadTrigger
})


// --- Nav scroll indicators ---
const navRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const updateScrollState = () => {
  const el = navRef.value;
  if (!el) return;
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
};

const scrollNav = (direction: 1 | -1) => {
  navRef.value?.scrollBy({ left: direction * 150, behavior: 'smooth' });
};

// Recalculate when the nav or its content changes size (resize, links added/removed).
// Watching the ref (instead of onMounted) is deliberate: the nav lives inside a
// v-else block, so it may not exist yet when the component mounts.
let resizeObserver: ResizeObserver | undefined;
watch(navRef, (el) => {
  resizeObserver?.disconnect();
  if (!el) return;
  resizeObserver = new ResizeObserver(updateScrollState);
  resizeObserver.observe(el);
  if (el.firstElementChild) resizeObserver.observe(el.firstElementChild);
  updateScrollState();
});
onBeforeUnmount(() => resizeObserver?.disconnect());


const navModeLinks = {
  view: [
    {
      title: 'Reserves',
      caption: 'Overview & analytics',
      icon: 'mdi-bank',
      to: { name: 'view-authhead', query: route.query },
    },
    {
      title: 'Token Identity',
      caption: 'Overview & analytics',
      icon: 'dashboard',
      to: {
        name: 'view-identity-snapshot',
        params: route.params,
        query: route.query,
      },
    },
    {
      title: 'NFTs',
      caption: 'Manage your tasks',
      icon: 'assignment',
      to: {
        name: 'view-identity-snapshot-nfts',
        params: route.params,
        query: route.query,
      },
    },
    {
      title: 'Registry',
      caption: 'Collaborate with members',
      icon: 'people',
      to: { name: 'view-registry', params: route.params, query: route.query },
    },
  ],
  edit: [
    {
      title: 'Reserves',
      caption: 'Overview & analytics',
      icon: 'mdi-bank',
      to: { name: 'view-authhead', query: route.query },
    },
    {
      title: 'Token Identity',
      caption: 'Overview & analytics',
      icon: 'dashboard',
      to: {
        name: 'edit-identity-snapshot',
        params: route.params,
        query: route.query,
      },
    },
    {
      title: 'NFTs',
      caption: 'Manage your tasks',
      icon: 'assignment',
      to: {
        name: 'edit-identity-snapshot-nfts',
        params: route.params,
        query: route.query,
      },
    },
    {
      title: 'Registry',
      caption: 'Collaborate with members',
      icon: 'people',
      to: { name: 'edit-registry', params: route.params, query: route.query },
    },
  ],
};

const navLinks = computed(() => {
  let links = mode.value === 'edit' ? navModeLinks.edit : navModeLinks.view;
  if (!activeIdentitySnapshot.value) {
    links = [...links];
    links.splice(2, 2);
  }

  return links.map((link) => ({
    ...link,
    to: { ...link.to, query: { ...route.query }, params: { ...route.params } },
  }));
});

const toggleWriteMode = () => {
  const paths = route.path.split('/');
  const currentMode = paths[paths.length - 1];
  mode.value = route.path.endsWith('view') ? 'edit' : 'view';
  router.push({
    path: route.path.replace(currentMode as string, mode.value),
    query: {
      ...route.query,
    },
  });
};

watch(
  () => activeAuthhead.value,
  (value) => {
    if (value) {
      mode.value = 'edit';
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* ---- Containment: nothing above the nav may widen the page ---- */
.registry-row {
  min-width: 0;
  max-width: 100%;
}

.registry-col {
  min-width: 0;
  max-width: 100%;
}

.registry-card {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  /* clip anything that would otherwise push the page sideways */
}

.header-row,
.header-main,
.header-text {
  min-width: 0;
  max-width: 100%;
}

.header-main {
  flex: 1 1 auto;
}

/* ---- The nav is the only horizontal scroll container ---- */
.inline-nav-wrap {
  position: relative;
  min-width: 0;
}

.inline-nav {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
}

/* ---- Scroll indicators ---- */
.nav-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 44px;
  display: flex;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.nav-fade.visible {
  opacity: 1;
}

.nav-fade-left {
  left: 0;
  justify-content: flex-start;
  background: linear-gradient(to right, var(--q-dark), transparent);
}

.nav-fade-right {
  right: 0;
  justify-content: flex-end;
  background: linear-gradient(to left, var(--q-dark), transparent);
}

.nav-chevron {
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  pointer-events: none;
  /* only clickable while the fade is visible */
}

.nav-fade.visible .nav-chevron {
  pointer-events: auto;
}

/* Row is as wide as its content, so the nav scrolls when it exceeds the card */
.inline-nav-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: max-content;
}

/* Each item keeps its natural width */
.inline-item {
  flex: 0 0 auto;
  width: max-content;
  min-width: max-content;
  color: rgba(255, 255, 255, 0.6);
  min-height: auto;
  padding: 8px 16px;
  white-space: nowrap;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.inline-item .inline-icon {
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.25s ease, transform 0.25s ease;
}

.inline-item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.inline-item:hover .inline-icon {
  color: #ffffff;
  transform: translateY(-1px);
}

.inline-item:hover .nav-text-wrapper::after {
  width: 100%;
}

.nav-text-wrapper {
  position: relative;
  display: inline-block;
  padding-bottom: 6px;
}

.nav-text-wrapper::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 3px;
  background-color: var(--q-primary);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 2px;
}

.inline-item-active {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.inline-item-active .inline-icon {
  color: #ffffff !important;
}

.inline-item-active .nav-text-wrapper::after {
  width: 100% !important;
}

.inline-icon-section {
  min-width: auto !important;
  padding-right: 0 !important;
}

.inline-text-section {
  padding: 0 !important;
  overflow: visible !important;
}

/* Web URI chip rendered as a real link so it opens in a new tab */
.web-chip-link {
  display: inline-block;
  text-decoration: none;
  color: inherit;
}
</style>