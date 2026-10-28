<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container q-mt-xl q-gutter-y-lg">
      <ExplainerBanner class="q-my-md" icon="mdi-inbox-arrow-down" :title="t('wizardConnect.requests.title')"
        :description="t('wizardConnect.requests.caption')" />

      <q-card class="q-pa-lg rounded-borders">
        <template v-if="requests.length > 0">
          <q-table :rows="requests" :columns="columns" :row-key="rowKey" :grid="$q.screen.lt.sm" flat
            :pagination="{ rowsPerPage: 20 }" :rows-per-page-options="[20]"
            class="border-radius-12 token-reserves-table">
            <template v-slot:body-cell-request="props">
              <q-td :props="props">
                <div class="flex items-center no-wrap q-gutter-x-md">
                  <q-avatar size="36px" class="bg-grey-9 border-radius-8 shadow-1">
                    <q-icon name="mdi-draw-pen" size="18px" color="grey-5" />
                  </q-avatar>
                  <div>
                    <div class="text-caption text-white">
                      {{ props.row.transaction?.userPrompt || t('wizardConnect.requests.unknownRequest') }}
                    </div>
                    <div class="flex items-center q-gutter-x-xs q-mt-xs">
                      <q-badge v-if="props.row.action" color="dark" text-color="orange-4"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="mdi-send" size="10px" class="q-mr-xs" />
                        {{ props.row.action }}
                      </q-badge>
                      <span class="text-caption text-grey-6 text-mono">#{{ props.row.sequence }}</span>
                    </div>
                  </div>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-sent="props">
              <q-td :props="props" class="text-caption text-grey-5 text-mono">
                {{ formatTime(props.row.time) }}
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn flat dense round icon="close" color="negative" size="sm" @click.stop="cancelRequest(props.row)">
                  <q-tooltip class="bg-grey-9 text-caption text-grey-4">
                    {{ t('wizardConnect.requests.cancelTooltip') }}
                  </q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </template>
        <template v-else>
          <div class="bg-dark q-pa-lg rounded-borders">
            <div class="flex flex-center column q-py-lg text-center">
              <q-icon name="mdi-inbox-check-outline" size="48px" color="grey-6" />
              <div class="text-grey-5 text-h6 q-mt-lg">{{ t('wizardConnect.requests.empty') }}</div>
              <div class="text-grey-6 text-caption q-mt-sm" style="max-width: 34rem">
                {{ t('wizardConnect.requests.emptyCaption') }}
              </div>
            </div>
          </div>
        </template>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';

type PendingSignRequest = {
  sequence: number;
  action?: string;
  time?: number;
  transaction?: { userPrompt?: string } & Record<string, unknown>;
};

type PendingMap = Map<number, { request: PendingSignRequest }>;

const { t } = useI18n();
const $q = useQuasar();
const { manager } = useWizardConnectWallet();

const requests = ref<PendingSignRequest[]>([]);

/**
 * `pendingSignatureRequests` is a private, non-reactive Map on the dapp manager,
 * so the list is rebuilt from it. Entries are deleted when a response arrives
 * without the manager emitting anything, hence the extra poll below.
 */
const refresh = () => {
  const pending = (manager.value as unknown as { pendingSignatureRequests?: PendingMap })
    ?.pendingSignatureRequests;
  requests.value = pending ? [...pending.values()].map((entry) => entry.request) : [];
};

const MANAGER_EVENTS = ['messagesent', 'messagereceived', 'walletready', 'disconnect'];
let poll: ReturnType<typeof setInterval> | null = null;

const attach = () => {
  const mgr = manager.value as unknown as { on?: (evt: string, fn: () => void) => void };
  if (mgr?.on) MANAGER_EVENTS.forEach((evt) => mgr.on!(evt, refresh));
};

const detach = () => {
  const mgr = manager.value as unknown as { off?: (evt: string, fn: () => void) => void };
  if (mgr?.off) MANAGER_EVENTS.forEach((evt) => mgr.off!(evt, refresh));
};

// The manager instance is replaced when the wallet (re)connects, so listeners
// have to follow it.
watch(
  () => manager.value,
  (mgr, previous) => {
    const old = previous as unknown as { off?: (evt: string, fn: () => void) => void };
    if (old?.off) MANAGER_EVENTS.forEach((evt) => old.off!(evt, refresh));
    if (mgr) attach();
    refresh();
  },
  { immediate: true }
);

const rowKey = (row: PendingSignRequest) => row.sequence;

const columns: QTableColumn[] = [
  {
    name: 'request',
    label: t('wizardConnect.requests.columnRequest'),
    field: (row: PendingSignRequest) => row.transaction?.userPrompt || row.action || '',
    align: 'left',
    sortable: true,
  },
  {
    name: 'sent',
    label: t('wizardConnect.requests.columnTime'),
    field: (row: PendingSignRequest) => row.time ?? 0,
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: '',
    field: 'actions',
    align: 'right',
  },
];

const formatTime = (time?: number) => (time ? new Date(time * 1000).toLocaleString() : '—');

const cancelRequest = async (row: PendingSignRequest) => {
  const mgr = manager.value as unknown as {
    sendSignCancel?: (sequence: number, reason?: string) => Promise<void>;
  };
  if (!mgr?.sendSignCancel) return;

  try {
    await mgr.sendSignCancel(row.sequence, t('info.cancelled'));
    $q.notify({ type: 'warning', message: t('info.cancelled') });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error?.message || t('wizardConnect.requests.cancelError'),
    });
  } finally {
    refresh();
  }
};

onMounted(() => {
  refresh();
  poll = setInterval(refresh, 1000);
});

onUnmounted(() => {
  detach();
  if (poll) clearInterval(poll);
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

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}

.font-8 {
  font-size: 0.75em;
}

.styled-capability-badge {
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
