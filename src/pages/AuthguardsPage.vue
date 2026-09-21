<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container">
      <ExplainerBanner class="q-my-md authguard-banner" icon="lock" :title="$t('dashboard.authguards.bannerTitle')">
        <template #subtitle>
          <div>
            <div ref="bannerMessageEl" class="banner-message text-body2 text-grey-4"
              :class="{ clamped: !bannerExpanded }" v-html="$t('dashboard.authguards.bannerMessage')"></div>
            <q-btn v-if="showBannerToggle && !bannerExpanded" flat dense no-caps size="sm"
              class="text-primary q-pa-none q-mt-xs" :label="$t('dashboard.authguards.readMore')"
              icon-right="keyboard_arrow_down" @click="bannerExpanded = true" />
            <q-btn v-if="bannerExpanded" flat dense no-caps size="sm" class="text-primary q-pa-none q-mt-xs"
              :label="$t('dashboard.authguards.showLess')" icon-right="keyboard_arrow_up"
              @click="bannerExpanded = false" />
          </div>
        </template>
      </ExplainerBanner>

      <template v-if="authkeysLoading || authheadsLoading">
        <div v-for="i in 3" :key="i" class="row items-center q-gutter-x-md q-pa-md bg-dark q-mb-sm rounded-borders">
          <q-skeleton type="rect" size="36px" class="rounded-borders" />
          <div class="column q-gutter-y-xs" style="flex: 1">
            <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
            <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
          </div>
          <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
        </div>
      </template>
      <template v-else-if="rows.length > 0">
        <div class="row justify-end q-gutter-sm q-mb-md">
          <q-input v-model="searchQuery" dark dense outlined :placeholder="$t('dashboard.authguards.searchPlaceholder')"
            class="bg-grey-10" style="border-radius: 0.75rem; min-width: 280px">
            <template v-slot:prepend>
              <q-icon name="search" color="grey-6" size="xs" />
            </template>
            <template v-slot:append v-if="searchQuery">
              <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer" @click="searchQuery = ''" />
            </template>
          </q-input>
        </div>
        <div class="table-scroll-wrapper">
          <q-table :rows="filteredRows" :columns="columns" :row-key="(row: AuthguardRow) => row.authkeyCategory" flat
            class="border-radius-12 token-reserves-table" style="min-width: 440px" @row-click.stop="onRowClick">
            <template v-slot:body-cell-authguardAddress="props">
              <q-td :props="props">
                <div class="flex items-center q-gutter-x-xs no-wrap">
                  <q-icon name="lock" color="yellow-8" size="xs" />
                  <span class="text-caption text-mono text-grey-3">{{
                    shortenCashAddress(props.row.address)
                    }}</span>
                  <CopyText :text="props.row.address" />
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-lockedTokens="props">
              <q-td :props="props">
                <div v-if="props.row.lockAvatars.length > 0" class="flex items-center q-gutter-x-xs flex-wrap">
                  <q-avatar v-for="av in props.row.lockAvatars" :key="av.key" size="40px"
                    class="bg-grey-9 shadow-1 token-avatar" :title="shortenTokenId(av.category)">
                    <img v-if="av.iconSrc" :src="av.iconSrc" alt="" fit="cover" />
                    <span v-else class="text-grey-5 text-weight-bold text-caption token-placeholder">{{
                      $t('dashboard.authguards.unknownTokenIcon') }}</span>
                  </q-avatar>
                </div>
                <div v-else>
                  <q-avatar size="40px" class="bg-grey-9 shadow-1 token-avatar">
                    <span class="text-grey-5 text-weight-bold text-caption token-placeholder">{{
                      $t('dashboard.authguards.unknownTokenIcon') }}</span>
                    <q-tooltip class="bg-grey-9 text-caption text-grey-4">
                      {{ $t('dashboard.authguards.noLockedTokensTooltip') }}
                    </q-tooltip>
                  </q-avatar>
                </div>
              </q-td>
            </template>
          </q-table>
        </div>
      </template>
      <template v-else>
        <div class="bg-dark q-pa-lg rounded-borders">
          <div class="flex flex-center column q-py-lg">
            <div class="flex flex-center q-mb-lg" style="height: 120px; width: 260px">
              <div class="playing-card" style="
                  z-index: 1;
                  transform: rotate(-12deg) translateX(22px);
                  margin-right: -30px;
                ">
                <q-icon name="key" size="32px" color="grey-5" />
              </div>
              <div class="playing-card" style="z-index: 2; transform: rotate(-2deg)">
                <q-icon name="lock" size="32px" color="grey-5" />
              </div>
              <div class="playing-card" style="
                  z-index: 3;
                  transform: rotate(8deg) translateX(-22px);
                  margin-left: -30px;
                ">
                <q-icon name="token" size="32px" color="grey-5" />
              </div>
            </div>
            <div class="text-grey-5 text-h6 q-mb-lg">
              {{ $t('dashboard.authguards.noAuthguards') }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  triggerRef,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthguardStore } from 'src/stores/authguard';
import { storeToRefs } from 'pinia';
import { QTableColumn } from 'quasar';
import type { DecoratedUtxo } from 'src/core/types';
import { shortenCashAddress, shortenTokenId } from 'src/core/utils';
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import { getAuthguardContractAddress } from 'src/core/authguard';
import { useRouter } from 'vue-router';
import { Network } from 'cashscript';
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import CopyText from 'components/CopyText.vue';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';

interface LockedTokenAvatar {
  key: string;
  category: string;
  iconSrc?: string;
}

interface AuthguardRow {
  authkeyCategory: string;
  address: string;
  lockedCount: number;
  lockAvatars: LockedTokenAvatar[];
  firstAuthhead?: DecoratedUtxo;
}

const { t } = useI18n();
const router = useRouter();

const { wallet, walletLasySync, walletIsReady } = useWizardConnectWallet();

const authguardStore = useAuthguardStore();
const { loadAuthkeys, loadAuthheads } = authguardStore;
const { authheads, authkeysLoading, authheadsLoading } =
  storeToRefs(authguardStore);

const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void;
  stopWatchingChangeWallet?: () => void;
  stopWatchingDefiWallet?: () => void;
}>({});

const searchQuery = ref('');
const network = import.meta.env.VITE_BCH_NETWORK as Network;

const bannerExpanded = ref(false);
const showBannerToggle = ref(false);
const bannerMessageEl = ref<HTMLDivElement | undefined>();

const updateBannerMessageOverflow = () => {
  const el = bannerMessageEl.value;
  if (!el) return;
  showBannerToggle.value = el.scrollHeight > el.clientHeight;
};

const onWindowResize = () => updateBannerMessageOverflow();

const columns: QTableColumn[] = [
  {
    name: 'authguardAddress',
    label: t('dashboard.authguards.columnAddress'),
    field: (row: AuthguardRow) => row.address,
    align: 'left',
    sortable: true,
  },
  {
    name: 'lockedTokens',
    label: t('dashboard.authguards.columnLockedTokens'),
    field: (row: AuthguardRow) => row.lockedCount,
    align: 'left',
    sortable: false,
  },
];

const rows = computed<AuthguardRow[]>(() => {
  const byAuthkey = new Map<string, DecoratedUtxo[]>();
  for (const a of authheads.value) {
    const authkeyCategory = a.authkey?.token?.category;
    if (!authkeyCategory) continue;
    const list = byAuthkey.get(authkeyCategory) ?? [];
    list.push(a);
    byAuthkey.set(authkeyCategory, list);
  }

  const result: AuthguardRow[] = [];
  for (const [authkeyCategory, authheadsForAuthkey] of byAuthkey) {
    const address = getAuthguardContractAddress({
      authkeyTokenId: authkeyCategory,
      network,
    });

    const byTokenCategory = new Map<string, DecoratedUtxo[]>();
    for (const a of authheadsForAuthkey) {
      const category = a.token?.category;
      if (!category) continue;
      const list = byTokenCategory.get(category) ?? [];
      list.push(a);
      byTokenCategory.set(category, list);
    }

    const lockAvatars: LockedTokenAvatar[] = Array.from(
      byTokenCategory,
      ([category, entries]) => {
        const withIcon = entries.find((e) => e.identitySnapshot?.uris?.icon);
        const icon = withIcon?.identitySnapshot?.uris?.icon;
        return {
          key: `${authkeyCategory}:${category}`,
          category,
          iconSrc: icon ? ipfsToGatewayUrl(icon) : undefined,
        } as LockedTokenAvatar;
      }
    );

    result.push({
      authkeyCategory,
      address,
      lockedCount: authheadsForAuthkey.length,
      lockAvatars,
      firstAuthhead: authheadsForAuthkey[0],
    });
  }
  return result;
});

const filteredRows = computed(() => {
  if (!searchQuery.value) return rows.value;
  const q = searchQuery.value.toLowerCase();
  return rows.value.filter(
    (r) =>
      r.address.toLowerCase().includes(q) ||
      r.authkeyCategory.toLowerCase().includes(q)
  );
});

const onRowClick = (_evt: Event, row: AuthguardRow) => {
  if (row.firstAuthhead) {
    authguardStore.setActiveAuthhead(row.firstAuthhead);
  }
  router.push({
    name: 'view-authguard',
    params: { authkeyCategory: row.authkeyCategory },
  });
};

watch(
  () => walletIsReady.value,
  async (isReady, prevValue) => {
    if (isReady && !prevValue) {
      loadAuthkeys(wallet.value).then((authkeys) => {
        loadAuthheads(authkeys);
      });

      triggerRef(wallet);

      walletWatchers.value.stopWatchingReceiveWallet =
        await wallet.value?.receive?.watchStatus(
          async (status: any, address: any) => {
            await wallet.value?.sync();
            loadAuthkeys(wallet.value).then((authkeys) => {
              loadAuthheads(authkeys);
            });
            triggerRef(wallet);
          }
        );
    }
  },
  { immediate: true }
);

watch(walletLasySync, async () => {
  await loadAuthkeys(wallet.value, true);
});

onMounted(async () => {
  await nextTick();
  updateBannerMessageOverflow();
  window.addEventListener('resize', onWindowResize);

  if (walletIsReady.value) {
    const authkeys = await loadAuthkeys(wallet.value, true);
    loadAuthheads(authkeys);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  walletWatchers.value?.stopWatchingReceiveWallet?.();
  walletWatchers.value?.stopWatchingChangeWallet?.();
  walletWatchers.value?.stopWatchingDefiWallet?.();
});
</script>

<style scoped>
.page-root {
  max-width: 100vw;
  overflow-x: hidden;
}

.content-container {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  box-sizing: border-box;
}

.banner-message :deep(p) {
  margin: 0.3rem 0;
  line-height: 1.5;
}

.banner-message :deep(p:first-child) {
  margin-top: 0;
}

.banner-message :deep(p:last-child) {
  margin-bottom: 0;
}

.banner-message :deep(a) {
  color: #4c9aff;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.banner-message :deep(a:hover) {
  filter: brightness(1.2);
}

.banner-message.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.banner-message.clamped :deep(p) {
  margin: 0;
}

.authguard-banner :deep(.explainer-banner) {
  align-items: flex-start;
}

.border-radius-8 {
  border-radius: 8px;
}

.border-radius-12 {
  border-radius: 12px;
}

.token-reserves-table {
  border-color: #2c2c2c !important;
}

.token-reserves-table :deep(.q-table__card) {
  box-shadow: none;
}

.token-reserves-table :deep(thead tr th) {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 10px;
  color: #888888;
  background-color: #1e1e1e;
  border-bottom: 1px solid #2c2c2c;
}

.token-reserves-table :deep(tbody tr:hover) {
  background-color: #1e1e1e !important;
}

.token-reserves-table :deep(tbody tr) {
  cursor: pointer;
}

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}

.font-8 {
  font-size: 0.75em;
}

.token-avatar {
  border-radius: 50%;
  overflow: hidden;
}

.token-placeholder {
  line-height: 1;
}

.playing-card {
  width: 80px;
  height: 110px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.rounded-borders {
  border-radius: 6px;
}

.table-scroll-wrapper {
  display: block;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.table-scroll-wrapper::-webkit-scrollbar {
  height: 4px;
}

.table-scroll-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
</style>
