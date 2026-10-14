<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container q-mt-xl q-gutter-y-lg">
      <ExplainerBanner class="q-my-md" icon="mdi-rhombus-split" :title="$t('dashboard.pageTitle.collectedTokens')"
        :description="$t('dashboard.collected.caption')" />
      <q-card class="q-pa-lg rounded-borders">
        <div class="row q-gutter-sm q-mb-md">
          <q-btn outline no-caps :color="collectedTokenTypeFilter === 'all' ? 'white' : 'grey-6'"
            :class="{ 'text-weight-bold': collectedTokenTypeFilter === 'all' }" :label="$t('dashboard.managed.filterAll', {
              count: allCollectedRows.length,
            })
              " @click="collectedTokenTypeFilter = 'all'" class="q-px-sm" />
          <q-btn outline no-caps :color="collectedTokenTypeFilter === 'fungible' ? 'white' : 'grey-6'" :class="{
            'text-weight-bold': collectedTokenTypeFilter === 'fungible',
          }" :label="$t('dashboard.managed.filterFungible', {
            count: collectedFungibleCount,
          })
            " @click="collectedTokenTypeFilter = 'fungible'" class="q-px-sm" />
          <q-btn outline no-caps :color="collectedTokenTypeFilter === 'nft' ? 'white' : 'grey-6'"
            :class="{ 'text-weight-bold': collectedTokenTypeFilter === 'nft' }" :label="$t('dashboard.managed.filterNft', { count: collectedNftCount })
              " @click="collectedTokenTypeFilter = 'nft'" class="q-px-sm" />
          <q-btn outline no-caps :color="collectedTokenTypeFilter === 'mixed' ? 'white' : 'grey-6'"
            :class="{ 'text-weight-bold': collectedTokenTypeFilter === 'mixed' }" :label="$t('dashboard.managed.filterMixed', { count: collectedMixedCount })
              " @click="collectedTokenTypeFilter = 'mixed'" class="q-px-sm" />
          <q-input v-model="collectedSearchQuery" dark dense outlined
            :placeholder="$t('dashboard.managed.searchPlaceholder')" class="bg-grey-10"
            style="border-radius: 0.75rem; min-width: 200px; margin-left: auto">
            <template v-slot:prepend>
              <q-icon name="search" color="grey-6" size="xs" />
            </template>
            <template v-slot:append v-if="collectedSearchQuery">
              <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer" @click="collectedSearchQuery = ''" />
            </template>
          </q-input>
        </div>
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
        <template v-else>
          <q-table :rows="collectedUtxosWithIdentity" :columns="collectedColumns"
            :row-key="(row: any) => row.isAggregated ? row.token.category : `${row.txid}:${row.vout}`" flat
            class="border-radius-12 token-reserves-table" @row-click.stop="onCollectedRowClick">
            <template v-slot:body-cell-collectedToken="props">
              <q-td :props="props">
                <div class="flex items-center no-wrap q-gutter-x-md">
                  <div class="flex column items-center">
                    <q-avatar size="md">
                      <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                        :src="ipfsToGatewayUrl(props.row.identitySnapshot?.uris?.icon)!" fit="cover"></q-img>
                      <q-img v-else
                        :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token.commitment}`"
                        fit="cover">
                        <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ $t('dashboard.managed.noIconTooltip')
                        }}
                        </q-tooltip>
                      </q-img>
                    </q-avatar>
                    <span v-if="!props.row.identitySnapshot?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                      style="line-height: 1">{{ $t('dashboard.managed.noIcon') }}</span>
                  </div>
                  <div>
                    <div class="flex items-center q-gutter-x-xs">
                      <span class="text-caption token-symbol">
                        {{
                          props.row.identitySnapshot?.token?.symbol ||
                          $t('dashboard.managed.symbolUnknown')
                        }}
                        {{
                          props.row.token?.nft?.commitment
                            ? `- ${props.row.token?.nft?.commitment}`
                            : ''
                        }}
                      </span>
                    </div>
                    <div class="flex items-center q-gutter-x-xs q-mt-xs">
                      <span class="text-caption text-grey-5 text-mono">
                        {{ shortenTokenId(props.row.token!.category) }}
                        <CopyText :text="props.row.token!.category" />
                      </span>
                    </div>
                    <div class="flex items-center q-gutter-x-xs q-mt-xs">
                      <q-badge v-if="getTokenType(props.row) === 'mixed'" color="dark" text-color="purple-4"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeMixed') }}
                      </q-badge>
                      <q-badge v-else-if="getTokenType(props.row) === 'nft'" color="dark" text-color="blue-6"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="token" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeNft') }}
                      </q-badge>
                      <q-badge v-else color="dark" text-color="green-4"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="money" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeFungible') }}
                      </q-badge>

                      <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="dark" text-color="purple-4"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeMinting') }}
                      </q-badge>
                      <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark"
                        text-color="teal-8"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeMutable') }}
                      </q-badge>
                      <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark" text-color="grey-6"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                        <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeImmutable') }}
                      </q-badge>
                      <q-badge v-if="isAuthKeyNft(props.row)" color="dark" text-color="secondary"
                        class="styled-capability-badge">
                        <q-icon name="key" size="xs" color="warning" />
                      </q-badge>
                    </div>
                  </div>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-collectedAmount="props">
              <q-td :props="props" class="text-right">
                <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                  class="text-subtitle1 text-weight-bold text-mono text-white">
                  {{
                    formatAmount(
                      props.row.token?.amount,
                      props.row.identitySnapshot?.token?.decimals
                    )
                  }}
                </div>
                <div v-else class="text-grey-6 text-caption text-mono">
                  {{ $t('dashboard.managed.unavailable') }}
                </div>
                <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                  class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                  <span>{{ $t('dashboard.managed.decimals') }}</span>
                  <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                    {{
                      props.row.identitySnapshot?.token?.decimals === undefined
                        ? $t('dashboard.managed.decimalsUnknown')
                        : props.row.identitySnapshot?.token?.decimals
                    }}
                  </q-badge>
                  <q-badge v-if="props.row.isAggregated" color="blue-grey-8" text-color="grey-3"
                    class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                    {{
                      props.row.utxoCount !== 1
                        ? $t('dashboard.collected.utxoCountPlural', {
                          count: props.row.utxoCount,
                        })
                        : $t('dashboard.collected.utxoCount', {
                          count: props.row.utxoCount,
                        })
                    }}
                  </q-badge>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-collectedActions="value">
              <q-td :props="value">
                <q-btn round icon="more_vert" size="sm" @click.stop>
                  <q-menu dark auto-close class="bg-dark-2 shadow-2">
                    <q-list dark class="bg-dark" dense style="min-width: 180px">
                      <!-- Mixed rows get both directions: an amount out, or the whole UTXO out. -->
                      <q-item v-if="getTokenType(value.row) !== 'nft'" clickable
                        @click="sendCollectedTokens(value.row)">
                        <q-item-section avatar>
                          <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{
                            getTokenType(value.row) === 'mixed'
                              ? $t('dashboard.collected.actionTransferFt')
                              : $t('dashboard.collected.actionSend')
                          }}
                        </q-item-section>
                      </q-item>

                      <q-item v-if="getTokenType(value.row) !== 'fungible'" clickable
                        @click="transferCollectedNft(value.row)">
                        <q-item-section avatar>
                          <q-icon name="mdi-transfer-right" color="primary" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.collected.actionTransferNft') }}
                        </q-item-section>
                      </q-item>

                      <q-separator dark inset />

                      <q-item clickable @click="burnCollectedTokens(value.row)">
                        <q-item-section avatar>
                          <q-icon name="mdi-fire" color="orange" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{
                            getTokenType(value.row) === 'nft'
                              ? $t('dashboard.collected.actionBurnNft')
                              : $t('dashboard.collected.actionBurn')
                          }}
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </template>
      </q-card>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { ref, computed, onMounted, onUnmounted, watch, triggerRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthguardStore } from 'src/stores/authguard';
import { useRegistryStore } from 'src/stores/registry';
import { storeToRefs } from 'pinia';
import { QTableColumn, useQuasar } from 'quasar';
import type { UtxoWithPath } from 'src/core/types';
import { getTokenType, isPureFungible, shortenTokenId } from 'src/core/utils';
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import { transferFts, transferNfts } from 'src/core/transaction';
import { broadcastTransaction } from 'src/services/transaction';
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog';
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils';
import { useRouter } from 'vue-router';
import CopyText from 'components/CopyText.vue';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue';
import NFTTransferDialog from 'src/components/dialogs/NFTTransferDialog.vue';
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue';
import PromptDialog from 'src/components/dialogs/PromptDialog.vue';
import { Network } from 'cashscript';
import { decodeCashAddress } from 'bitauth-libauth-v3';
import { decodeCashAddress as decodeCashAddressV3, encodeCashAddress } from 'bitauth-libauth-v3';
import { BaseWallet, NetworkType } from 'mainnet-js';
import { db } from 'src/core/client-db';

const { t } = useI18n();
const $q = useQuasar();
const router = useRouter();
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog();

const { wallet, manager, walletIsReady } = useWizardConnectWallet();

const authguardStore = useAuthguardStore();
const { authkeysLoading, authheadsLoading } = storeToRefs(authguardStore);

const registryStore = useRegistryStore();
const { fetchIdentitySnapshot } = useRegistryStore();

const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void;
  stopWatchingChangeWallet?: () => void;
  stopWatchingDefiWallet?: () => void;
}>({});

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
function formatAmount(value: any, decimals: number = 0): string {
  if (value == null || value === '') return '—';
  let formattedValue = value;
  if (
    typeof formattedValue === 'bigint' ||
    typeof formattedValue === 'number'
  ) {
    if (decimals > 0) {
      formattedValue = Number(formattedValue) / Math.pow(10, decimals);
    }
  } else if (!isNaN(Number(formattedValue)) && decimals > 0) {
    formattedValue = Number(formattedValue) / Math.pow(10, decimals);
  }
  return formattedValue.toLocaleString();
}

const walletTokenUtxos = computed(() =>
  (wallet.value?.utxos || []).filter((u: any) => !!u.token)
);

const allCollectedRows = computed(() => {
  let rows = walletTokenUtxos.value.map((utxo: any) => {
    const snapshot = registryStore.identitySnapshotCache[utxo.token!.category!];
    return { ...utxo, identitySnapshot: snapshot || undefined };
  });
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    const cat = row.token!.category!;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(row);
  }
  const result: any[] = [];
  for (const [, catRows] of grouped) {
    if (catRows.every((r: any) => isPureFungible(r))) {
      const totalAmount = catRows.reduce(
        (sum: bigint, r: any) => sum + BigInt(r.token.amount),
        BigInt(0)
      );
      result.push({
        ...catRows[0],
        token: { ...catRows[0].token, amount: totalAmount },
        utxoCount: catRows.length,
        isAggregated: true,
        aggregatedUtxos: catRows,
      });
    } else {
      result.push(...catRows);
    }
  }
  return result;
});

const collectedTokenTypeFilter = ref<'all' | 'fungible' | 'nft' | 'mixed'>(
  'all'
);
const collectedSearchQuery = ref('');

const collectedFungibleCount = computed(
  () =>
    allCollectedRows.value.filter((r) => getTokenType(r) === 'fungible').length
);
const collectedNftCount = computed(
  () => allCollectedRows.value.filter((r) => getTokenType(r) === 'nft').length
);
const collectedMixedCount = computed(
  () => allCollectedRows.value.filter((r) => getTokenType(r) === 'mixed').length
);

// An AuthKey NFT is created with capability 'none' and commitment '00'.
const isAuthKeyNft = (row: any) =>
  row.token?.nft?.commitment === '00' && row.token?.nft?.capability === 'none';

function matchesSearch(row: any, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const symbol = row.identitySnapshot?.token?.symbol?.toLowerCase() || '';
  const category = row.token?.category?.toLowerCase() || '';
  return symbol.includes(q) || category.includes(q);
}

const collectedUtxosWithIdentity = computed(() => {
  let rows = allCollectedRows.value;
  if (collectedTokenTypeFilter.value !== 'all') {
    rows = rows.filter(
      (r) => getTokenType(r) === collectedTokenTypeFilter.value
    );
  }
  if (collectedSearchQuery.value) {
    rows = rows.filter((r) => matchesSearch(r, collectedSearchQuery.value));
  }
  return rows;
});

const collectedColumns = computed<QTableColumn[]>(() => {
  const cols: QTableColumn[] = [
    {
      name: 'collectedToken',
      label: t('dashboard.collected.columnToken'),
      field: (row) => row.token?.category,
      align: 'left',
      sortable: true,
    },
    {
      name: 'collectedAmount',
      label: t('dashboard.collected.columnAmount'),
      field: (row) => row.token?.amount,
      align: 'right',
      sortable: true,
    },
    {
      name: 'collectedActions',
      label: '',
      field: 'actions',
      align: 'right',
    },
  ];
  if (collectedTokenTypeFilter.value === 'nft') {
    return cols.filter((c) => c.name !== 'collectedAmount');
  }
  return cols;
});

const loadCollectedIdentitySnapshots = async () => {
  const categories = [
    ...new Set(
      walletTokenUtxos.value.map((u: any) => u.token?.category).filter(Boolean)
    ),
  ];
  const results = await Promise.allSettled(
    categories.map(async (category) => {
      try {
        return await fetchIdentitySnapshot(category as string);
      } catch (e) {
        return undefined;
      }
    })
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.log(
        'Identity snapshot rejected for category',
        categories[index],
        result.reason
      );
    } else if (result.value === null || result.value === undefined) {
      console.log('No identity snapshot found for category', categories[index]);
    }
  });
};

const onCollectedRowClick = (_evt: Event, row: any, index: number) => {
  const type = getTokenType(row);
  if (type !== 'nft') return;

  authguardStore.setActiveAuthhead(null as any);

  registryStore.setActiveNft({
    contentHash: '',
    authbase: '',
    timestamp: '',
    category: row.token?.category || '',
    commitmentOrBottomAltStack: row.token?.nft?.commitment || '',
    nftType: undefined,
    utxo: row as any,
    allowEdit: false,
  });

  router.push({
    name: 'nft-detail',
    params: {
      category: row.token!.category
    }
  });
};

const performSendCollectedTokens = (row: any) => {
  $q.dialog({
    component: FungibleTransferDialog,
    componentProps: {
      transferType: 'send',
      tokenCategory: row.token!.category,
      balance: BigInt(row.token!.amount),
      decimals: row.identitySnapshot?.token?.decimals ?? 0,
      identitySnapshot: row.identitySnapshot,
      selfAddress: wallet.value?.getTokenDepositAddress(0),
    },
    focus: 'none',
  }).onOk(async (userInputs: { tokenAmount: bigint; recipient: string }) => {
    startLoader(txTaskList, () => {
      $q.notify({ type: 'warning', message: t('info.cancelled') });
    });

    updateStep(TASK_INPUTS_CHECK, 'done');
    updateStep(TASK_PREPARE_TX, 'running');

    try {
      const signRequest = transferFts({
        category: row.token!.category,
        tokenAmount: userInputs.tokenAmount,
        recipientAddress: userInputs.recipient,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        transferType: 'send',
      });

      updateStep(TASK_PREPARE_TX, 'done');
      updateStep(TASK_WAIT_FOR_SIG, 'running');

      const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() });

      updateStep(TASK_WAIT_FOR_SIG, 'done');
      updateStep(TASK_BROADCASTING, 'running');

      const [broadcastError, txid] = await broadcastTransaction({
        transactionHex: response.signedTransaction,
        network: import.meta.env.VITE_BCH_NETWORK,
        onProgress: (progress: string) => {
          const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress });
          updateStep(TASK_BROADCASTING, 'running', newLabel);
        },
      });

      if (broadcastError) {
        updateStep(TASK_BROADCASTING, 'failed');
        throw broadcastError;
      }

      updateStep(TASK_BROADCASTING, 'done');
      updateStep(TASK_WAITING_PROPAGATION, 'running');

      const networkType =
        import.meta.env.VITE_BCH_NETWORK === 'chipnet'
          ? NetworkType.Testnet
          : NetworkType.Mainnet;
      await new BaseWallet(networkType).waitForTransaction({ txHash: txid });

      updateStep(TASK_WAITING_PROPAGATION, 'done');
      updateStep(TASK_REFRESH_UTXOS, 'running');

      await wallet.value?.sync();
      triggerRef(wallet);

      updateStep(TASK_REFRESH_UTXOS, 'done');

      await db.saveActivity({
        event: t('dashboard.notify.activityEventTransferFts'),
        txid,
        status: 'success',
      });

      stopLoader(1000);

      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: t('dashboard.notify.transferSent'),
          txid,
        },
      });
    } catch (error: any) {
      stopLoader(3000);
      if (error?.name === 'AbortError') return
      $q.notify({ type: 'Error', message: error.message });
    }
  });
};

/** NFTs move whole through transferNfts: the token (amount, capability, commitment) travels as-is. */
const performSendCollectedNft = (row: any) => {
  $q.dialog({
    component: NFTTransferDialog,
    componentProps: {
      category: row.token!.category,
      capability: row.token?.nft?.capability,
      commitment: row.token?.nft?.commitment,
      amount: row.token?.amount?.toString(),
      identitySnapshot: row.identitySnapshot,
      selfAddress: wallet.value?.getTokenDepositAddress(0),
    },
    focus: 'none',
  }).onOk(async (userInputs: { recipient: string }) => {
    startLoader(txTaskList, () => {
      $q.notify({ type: 'warning', message: t('info.cancelled') });
    });

    updateStep(TASK_INPUTS_CHECK, 'done');
    updateStep(TASK_PREPARE_TX, 'running');

    try {
      const signRequest = transferNfts({
        nfts: [row],
        recipientAddress: userInputs.recipient,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        userPrompt: t('nftTransfer.walletPromptSend'),
      });

      updateStep(TASK_PREPARE_TX, 'done');
      updateStep(TASK_WAIT_FOR_SIG, 'running');

      const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() });

      updateStep(TASK_WAIT_FOR_SIG, 'done');
      updateStep(TASK_BROADCASTING, 'running');

      const [broadcastError, txid] = await broadcastTransaction({
        transactionHex: response.signedTransaction,
        network: import.meta.env.VITE_BCH_NETWORK,
        onProgress: (progress: string) => {
          const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress });
          updateStep(TASK_BROADCASTING, 'running', newLabel);
        },
      });

      if (broadcastError) {
        updateStep(TASK_BROADCASTING, 'failed');
        throw broadcastError;
      }

      updateStep(TASK_BROADCASTING, 'done');
      updateStep(TASK_WAITING_PROPAGATION, 'running');

      const networkType =
        import.meta.env.VITE_BCH_NETWORK === 'chipnet'
          ? NetworkType.Testnet
          : NetworkType.Mainnet;
      await new BaseWallet(networkType).waitForTransaction({ txHash: txid });

      updateStep(TASK_WAITING_PROPAGATION, 'done');
      updateStep(TASK_REFRESH_UTXOS, 'running');

      await wallet.value?.sync();
      triggerRef(wallet);

      updateStep(TASK_REFRESH_UTXOS, 'done');

      await db.saveActivity({
        event: t('dashboard.notify.activityEventTransferNfts'),
        txid,
        status: 'success',
      });

      stopLoader(1000);

      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: t('dashboard.notify.nftTransferSent'),
          txid,
        },
      });
    } catch (error: any) {
      stopLoader(3000);
      if (error?.name === 'AbortError') return
      $q.notify({ type: 'Error', message: error.message });
    }
  });
};

/**
 * The burn address configured in env, normalised to the token-aware form a token output needs.
 * The env value may or may not already carry its network prefix, and it may already be token-aware
 * (the current one is a `p2shWithTokens` address).
 */
const getTokenAwareBurnAddress = (): string => {
  const networkPrefix = wallet.value!.getTokenDepositAddress(0).split(':')[0];
  const configured = (import.meta.env.VITE_BURN_ADDRESS || '').trim();
  const burnAddress = configured.includes(':') ? configured : `${networkPrefix}:${configured}`;

  const decoded = decodeCashAddressV3(burnAddress);
  if (typeof decoded === 'string') throw new Error(decoded);
  if (decoded.type.includes('WithTokens')) return burnAddress;
  return encodeCashAddress({
    ...decoded,
    throwErrors: true,
    type: `${decoded.type as 'p2pkh' | 'p2sh'}WithTokens`,
  }).address;
};

/** Burning an NFT sends the whole UTXO to the burn address, so there is no recipient to pick. */
const performBurnCollectedNft = (row: any) => {
  let burnAddress: string;
  try {
    burnAddress = getTokenAwareBurnAddress();
  } catch (error: any) {
    $q.notify({ type: 'Error', message: error.message });
    return;
  }

  $q.dialog({
    component: NFTTransferDialog,
    componentProps: {
      category: row.token!.category,
      capability: row.token?.nft?.capability,
      commitment: row.token?.nft?.commitment,
      amount: row.token?.amount?.toString(),
      identitySnapshot: row.identitySnapshot,
      burnAddress,
    },
    focus: 'none',
  }).onOk(async (userInputs: { recipient: string }) => {
    startLoader(txTaskList, () => {
      $q.notify({ type: 'warning', message: t('info.cancelled') });
    });

    updateStep(TASK_INPUTS_CHECK, 'done');
    updateStep(TASK_PREPARE_TX, 'running');

    try {
      const signRequest = transferNfts({
        nfts: [row],
        recipientAddress: userInputs.recipient,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        userPrompt: t('nftTransfer.walletPromptBurn'),
      });

      updateStep(TASK_PREPARE_TX, 'done');
      updateStep(TASK_WAIT_FOR_SIG, 'running');

      const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() });

      updateStep(TASK_WAIT_FOR_SIG, 'done');
      updateStep(TASK_BROADCASTING, 'running');

      const [broadcastError, txid] = await broadcastTransaction({
        transactionHex: response.signedTransaction,
        network: import.meta.env.VITE_BCH_NETWORK,
        onProgress: (progress: string) => {
          const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress });
          updateStep(TASK_BROADCASTING, 'running', newLabel);
        },
      });

      if (broadcastError) {
        updateStep(TASK_BROADCASTING, 'failed');
        throw broadcastError;
      }

      updateStep(TASK_BROADCASTING, 'done');
      updateStep(TASK_WAITING_PROPAGATION, 'running');

      const networkType =
        import.meta.env.VITE_BCH_NETWORK === 'chipnet'
          ? NetworkType.Testnet
          : NetworkType.Mainnet;
      await new BaseWallet(networkType).waitForTransaction({ txHash: txid });

      updateStep(TASK_WAITING_PROPAGATION, 'done');
      updateStep(TASK_REFRESH_UTXOS, 'running');

      await wallet.value?.sync();
      triggerRef(wallet);

      updateStep(TASK_REFRESH_UTXOS, 'done');

      await db.saveActivity({
        event: t('dashboard.notify.activityEventBurnNfts'),
        txid,
        status: 'success',
      });

      stopLoader(1000);

      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: t('dashboard.notify.nftBurned'),
          txid,
        },
      });
    } catch (error: any) {
      stopLoader(3000);
      if (error?.name === 'AbortError') return
      $q.notify({ type: 'Error', message: error.message });
    }
  });
};

const performBurnCollectedTokens = (row: any) => {
  const sampleAddress = wallet.value!.getTokenDepositAddress(0);
  const sampleDecodedAddress = decodeCashAddress(sampleAddress);
  if (typeof sampleDecodedAddress === 'string') {
    throw new Error(sampleDecodedAddress);
  }
  const burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS
    }`;

  $q.dialog({
    component: FungibleTransferDialog,
    componentProps: {
      transferType: 'burn',
      tokenCategory: row.token!.category,
      balance: BigInt(row.token!.amount),
      decimals: row.identitySnapshot?.token?.decimals ?? 0,
      identitySnapshot: row.identitySnapshot,
      burnAddress,
    },
    focus: 'none',
  }).onOk(async (userInputs: { tokenAmount: bigint }) => {
    startLoader(txTaskList, () => {
      $q.notify({ type: 'warning', message: t('info.cancelled') });
    });

    updateStep(TASK_INPUTS_CHECK, 'done');
    updateStep(TASK_PREPARE_TX, 'running');

    try {
      const signRequest = transferFts({
        category: row.token!.category,
        tokenAmount: userInputs.tokenAmount,
        recipientAddress: burnAddress,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        transferType: 'burn',
      });

      updateStep(TASK_PREPARE_TX, 'done');
      updateStep(TASK_WAIT_FOR_SIG, 'running');

      const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() });

      updateStep(TASK_WAIT_FOR_SIG, 'done');
      updateStep(TASK_BROADCASTING, 'running');

      const [broadcastError, txid] = await broadcastTransaction({
        transactionHex: response.signedTransaction,
        network: import.meta.env.VITE_BCH_NETWORK,
        onProgress: (progress: string) => {
          const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress });
          updateStep(TASK_BROADCASTING, 'running', newLabel);
        },
      });

      if (broadcastError) {
        updateStep(TASK_BROADCASTING, 'failed');
        throw broadcastError;
      }

      updateStep(TASK_BROADCASTING, 'done');
      updateStep(TASK_WAITING_PROPAGATION, 'running');

      const networkType =
        import.meta.env.VITE_BCH_NETWORK === 'chipnet'
          ? NetworkType.Testnet
          : NetworkType.Mainnet;
      await new BaseWallet(networkType).waitForTransaction({ txHash: txid });

      updateStep(TASK_WAITING_PROPAGATION, 'done');
      updateStep(TASK_REFRESH_UTXOS, 'running');

      await wallet.value?.sync();
      triggerRef(wallet);

      updateStep(TASK_REFRESH_UTXOS, 'done');

      await db.saveActivity({
        event: t('dashboard.notify.activityEventBurnFts'),
        txid,
        status: 'success',
      });

      stopLoader(1000);

      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: t('dashboard.notify.transferBurned'),
          txid,
        },
      });
    } catch (error: any) {
      stopLoader(3000);
      if (error?.name === 'AbortError') return
      $q.notify({ type: 'Error', message: error.message });
    }
  });
};

const promptAuthKeyGuard = (action: 'send' | 'burn', onConfirm: () => void) => {
  const isBurn = action === 'burn';
  $q.dialog({
    component: PromptDialog,
    componentProps: {
      title: t('dashboard.collected.authKeyGuard.title'),
      icon: 'key',
      iconColor: 'warning',
      message: t(
        isBurn
          ? 'dashboard.collected.authKeyGuard.messageBurn'
          : 'dashboard.collected.authKeyGuard.messageSend'
      ),
      expectedPromptOkResponse: t('dashboard.collected.authKeyGuard.expected'),
      inputLabel: t('dashboard.collected.authKeyGuard.inputLabel'),
      inputPlaceholder: t('dashboard.collected.authKeyGuard.inputPlaceholder'),
      okLabel: t(
        isBurn
          ? 'dashboard.collected.authKeyGuard.confirmBurn'
          : 'dashboard.collected.authKeyGuard.confirmSend'
      ),
      okColor: 'warning',
      cancelLabel: t('dashboard.collected.authKeyGuard.cancel'),
    },
    focus: 'none',
  }).onOk(() => onConfirm());
};

const sendCollectedTokens = (row: any) => {
  if (isAuthKeyNft(row)) {
    promptAuthKeyGuard('send', () => performSendCollectedTokens(row));
    return;
  }
  performSendCollectedTokens(row);
};

/** Moving the NFT means moving the whole UTXO, so any fungible amount it carries travels too. */
const transferCollectedNft = (row: any) => {
  if (isAuthKeyNft(row)) {
    promptAuthKeyGuard('send', () => performSendCollectedNft(row));
    return;
  }
  performSendCollectedNft(row);
};

const burnCollectedTokens = (row: any) => {
  // NFTs are burned whole, fungible amounts are burned by amount.
  const burn = getTokenType(row) === 'nft' ? performBurnCollectedNft : performBurnCollectedTokens;
  if (isAuthKeyNft(row)) {
    promptAuthKeyGuard('burn', () => burn(row));
    return;
  }
  burn(row);
};

watch(
  () => walletIsReady.value,
  async (isReady, prevValue) => {
    if (isReady && !prevValue) {
      triggerRef(wallet);
      await loadCollectedIdentitySnapshots();
      walletWatchers.value.stopWatchingReceiveWallet =
        await wallet.value?.receive?.watchStatus(
          async (status: any, address: any) => {
            await wallet.value?.sync();
            triggerRef(wallet);
            await loadCollectedIdentitySnapshots();
          }
        );
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (walletIsReady.value) {
    await loadCollectedIdentitySnapshots();
  }
});

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

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}

.font-8 {
  font-size: 0.75em;
}

.font-10 {
  font-size: 10px;
}

.styled-capability-badge {
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.border-grey-8 {
  border: 1px solid #424242;
}
</style>
