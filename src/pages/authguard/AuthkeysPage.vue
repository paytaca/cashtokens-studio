<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container">
      <ExplainerBanner class="q-my-md" icon="key" :title="$t('dashboard.pageTitle.authkeys')">
        <template #subtitle>
          <div>{{ $t('dashboard.authkeys.caption') }}</div>
          <div class="text-warning q-mt-xs">
            {{ $t('dashboard.authkeys.selfCustodyWarning') }}
          </div>
        </template>
      </ExplainerBanner>

      <q-card class="q-pa-lg rounded-borders">
        <template v-if="authkeysLoading">
          <div v-for="i in 3" :key="i" class="row items-center q-gutter-x-md q-pa-md bg-dark q-mb-sm rounded-borders">
            <q-skeleton type="rect" size="36px" class="rounded-borders" />
            <div class="column q-gutter-y-xs" style="flex: 1">
              <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
              <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
            </div>
            <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
          </div>
        </template>
        <template v-else-if="authkeys.length > 0">
          <div class="row justify-end q-gutter-sm q-mb-md">
            <q-input v-model="searchQuery" dark dense outlined :label="$t('dashboard.authkeys.searchPlaceholder')"
              class="bg-grey-10" style="border-radius: 0.75rem; min-width: 280px">
              <template v-slot:prepend>
                <q-icon name="search" color="grey-6" size="xs" />
              </template>
              <template v-slot:append v-if="searchQuery">
                <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer" @click="searchQuery = ''" />
              </template>
            </q-input>
          </div>
          <q-table :rows="filteredRows" :columns="columns" :row-key="(row: AuthkeyRow) => row.category"
            :visible-columns="visibleColumns" :hide-header="isXs" flat class="border-radius-12 token-reserves-table"
            @row-click.stop="onRowClick">
            <template v-slot:header-cell-authkey="props">
              <q-th :props="props">
                <div>{{ props.col.label }}</div>
                <div class="column-caption">
                  {{ $t('dashboard.authkeys.columnAuthkeyCaption') }}
                </div>
              </q-th>
            </template>

            <template v-slot:header-cell-authguardAddress="props">
              <q-th :props="props">
                <div>{{ props.col.label }}</div>
                <div class="column-caption">
                  {{ $t('dashboard.authkeys.columnAuthguardCaption') }}
                </div>
              </q-th>
            </template>

            <template v-slot:body-cell-authkey="props">
              <q-td :props="props">
                <div class="flex items-center q-gutter-x-xs no-wrap">
                  <!-- xs hides the header and the authguard column, so the labels move into the cell. -->
                  <span v-if="isXs" class="text-caption text-grey-6">{{ $t('dashboard.authkeys.columnAuthkey')
                    }}:</span>
                  <q-icon name="key" color="yellow-8" size="xs" />
                  <span class="text-caption text-mono text-grey-3">{{
                    shortenTokenId(props.row.category)
                    }}</span>
                  <CopyText :text="props.row.category" />
                </div>
                <template v-if="isXs">
                  <div class="text-caption text-grey-6 q-mt-sm">
                    {{ $t('dashboard.authkeys.columnAuthguard') }}:
                  </div>
                  <div class="flex items-center q-gutter-x-xs no-wrap q-mt-xs">
                    <q-icon name="mdi-safe-square-outline" color="yellow-8" size="xs" />
                    <span class="text-caption text-mono text-grey-3">{{
                      shortenCashAddress(props.row.authguardAddress)
                      }}</span>
                    <CopyText :text="props.row.authguardAddress" />
                  </div>
                </template>
              </q-td>
            </template>

            <template v-slot:body-cell-authguardAddress="props">
              <q-td :props="props">
                <div class="flex items-center q-gutter-x-xs no-wrap">
                  <q-icon name="mdi-safe-square-outline" color="yellow-8" size="xs" />
                  <span class="text-caption text-mono text-grey-3">{{
                    shortenCashAddress(props.row.authguardAddress)
                    }}</span>
                  <CopyText :text="props.row.authguardAddress" />
                </div>
              </q-td>
            </template>
          </q-table>
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
                  <q-icon name="mdi-safe-square-outline" size="32px" color="grey-5" />
                </div>
                <div class="playing-card" style="
                    z-index: 3;
                    transform: rotate(8deg) translateX(-22px);
                    margin-left: -30px;
                  ">
                  <q-icon name="add" size="32px" color="grey-5" />
                </div>
              </div>
              <div class="text-grey-5 text-h6 q-mb-lg">
                {{ $t('dashboard.authkeys.noAuthkeys') }}
              </div>
            </div>
          </div>
        </template>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch, triggerRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthguardStore } from 'src/stores/authguard';
import { storeToRefs } from 'pinia';
import { QTableColumn, useQuasar } from 'quasar';
import type { UtxoWithPath } from 'src/core/types';
import { shortenCashAddress, shortenTokenId } from 'src/core/utils';
import { getAuthguardContractAddress } from 'src/core/authguard';
import { useRouter } from 'vue-router';
import { Network } from 'cashscript';
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import CopyText from 'components/CopyText.vue';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';

interface AuthkeyRow {
  category: string;
  authguardAddress: string;
}

const { t } = useI18n();
const router = useRouter();
const $q = useQuasar();

const { wallet, walletIsReady } = useWizardConnectWallet();

const authguardStore = useAuthguardStore();
const { loadAuthkeys } = authguardStore;
const { authkeys, authkeysLoading } = storeToRefs(authguardStore);

const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void;
  stopWatchingChangeWallet?: () => void;
  stopWatchingDefiWallet?: () => void;
}>({});

const searchQuery = ref('');
const network = import.meta.env.VITE_BCH_NETWORK as Network;

function getAddressForAuthkey(authkey: UtxoWithPath): string {
  return getAuthguardContractAddress({
    authkeyTokenId: authkey.token!.category,
    network,
  });
}

const filteredRows = computed<AuthkeyRow[]>(() => {
  const rows = authkeys.value.map((authkey) => ({
    category: authkey.token!.category,
    authguardAddress: getAddressForAuthkey(authkey),
  }));
  if (!searchQuery.value) return rows;
  const q = searchQuery.value.toLowerCase();
  return rows.filter(
    (r) =>
      r.category.toLowerCase().includes(q) ||
      r.authguardAddress.toLowerCase().includes(q)
  );
});

const columns: QTableColumn[] = [
  {
    name: 'authkey',
    label: t('dashboard.authkeys.columnAuthkey'),
    field: (row: AuthkeyRow) => row.category,
    align: 'left',
    sortable: true,
  },
  {
    name: '',
    label: '',
    align: 'left',
    sortable: true,
    field: ''
  },
];

/** On xs the two columns fold into one cell and the header is hidden, so labels move into the row. */
const isXs = computed(() => $q.screen.lt.sm);

const visibleColumns = computed(() =>
  isXs.value ? ['authkey'] : ['authkey', 'authguardAddress']
);

const onRowClick = (_evt: Event, row: AuthkeyRow) => {
  const authkey = authkeys.value.find(
    (a) => a.token?.category === row.category
  );
  if (!authkey) return;
  authguardStore.setActiveAuthhead({
    ...authkey,
    authkey,
    isAuthhead: true,
  });
  router.push({
    name: 'view-authguard',
    params: { authkeyCategory: row.category },
  });
};

watch(
  () => walletIsReady.value,
  async (isReady, prevValue) => {
    if (isReady && !prevValue) {
      await loadAuthkeys(wallet.value);
      triggerRef(wallet);

      walletWatchers.value.stopWatchingReceiveWallet =
        await wallet.value?.receive?.watchStatus(
          async (status: any, address: any) => {
            await wallet.value?.sync();
            await loadAuthkeys(wallet.value);
            triggerRef(wallet);
          }
        );
    }
  },
  { immediate: true }
);

onUnmounted(() => {
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


/* Sub-label under a column header, e.g. "(Category)" under "Authkey". */
.column-caption {
  font-size: 9px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  color: #666666;
}
</style>
