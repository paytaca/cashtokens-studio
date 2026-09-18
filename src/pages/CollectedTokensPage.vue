<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container">
      <div class="q-pa-md bg-dark text-white q-gutter-y-md"
        style="background: radial-gradient(circle at 50% 45%, #242936 0%, #0d0f13 70%, #050608 100%)">
        <div class="row q-col-gutter-md justify-center" style="max-width: 75rem; margin: 0 0;">
          <div class="col-12">
            <q-card flat class="relative-position overflow-visible" style=" min-height: 8rem; ">
              <div class="rounded-borders" style="
                height: 8rem; 
                width: 100%; 
              ">
              </div>
              <div class="absolute-bottom row justify-center"
                style="margin-bottom: -2.25rem; left: 0; right: 0; z-index: 10;">
                <q-avatar size="7rem" class="shadow-2 bg-dark">
                  <img :src="`https://api.dicebear.com/10.x/miniavs/svg?seed=${primaryXPub}`" alt="avatar">
                </q-avatar>
              </div>
            </q-card>
          </div>
          <div class="col-12 text-center q-mt-lg">
            <div class="text-h5 text-weight-bold text-white">{{ primaryXPub?.replace(primaryXPub.substring(8, 105),
              '...') }}
            </div>
            <div class="flex items-center justify-center">
              <q-btn icon="img:/images/bitcoin-cash-circle.svg" flat no-caps>
                <div class="q-px-sm">{{ formatBch(bchBalance) }}</div>
              </q-btn>
            </div>
          </div>
        </div>
      </div>

      <div class="q-mb-sm text-grey-5 text-caption q-mt-md">
        {{ $t('dashboard.collected.caption') }}
      </div>
      <div class="row q-gutter-sm q-mb-md">
        <q-btn flat unelevated :color="collectedTokenTypeFilter === 'all' ? 'grey-8' : 'transparent'"
          :text-color="collectedTokenTypeFilter === 'all' ? 'white' : 'grey-5'"
          :label="$t('dashboard.managed.filterAll', { count: allCollectedRows.length })"
          @click="collectedTokenTypeFilter = 'all'" class="q-px-sm" no-caps />
        <q-btn flat unelevated :color="collectedTokenTypeFilter === 'fungible' ? 'green-4' : 'transparent'"
          :text-color="collectedTokenTypeFilter === 'fungible' ? 'white' : 'grey-5'"
          :label="$t('dashboard.managed.filterFungible', { count: collectedFungibleCount })"
          @click="collectedTokenTypeFilter = 'fungible'" class="q-px-sm" no-caps />
        <q-btn flat unelevated :color="collectedTokenTypeFilter === 'nft' ? 'blue-6' : 'transparent'"
          :text-color="collectedTokenTypeFilter === 'nft' ? 'white' : 'grey-5'"
          :label="$t('dashboard.managed.filterNft', { count: collectedNftCount })"
          @click="collectedTokenTypeFilter = 'nft'" class="q-px-sm" no-caps />
        <q-btn flat unelevated :color="collectedTokenTypeFilter === 'mixed' ? 'purple-4' : 'transparent'"
          :text-color="collectedTokenTypeFilter === 'mixed' ? 'white' : 'grey-5'"
          :label="$t('dashboard.managed.filterMixed', { count: collectedMixedCount })"
          @click="collectedTokenTypeFilter = 'mixed'" class="q-px-sm" no-caps />
        <q-input v-model="collectedSearchQuery" dark dense outlined :placeholder="$t('dashboard.managed.searchPlaceholder')"
          class="bg-grey-10" style="border-radius: 0.75rem; min-width: 200px; margin-left: auto;">
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
          <div class="column q-gutter-y-xs" style="flex: 1;">
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
                      :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token.commitment}`" fit="cover">
                      <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ $t('dashboard.managed.noIconTooltip') }}
                      </q-tooltip>
                    </q-img>
                  </q-avatar>
                  <span v-if="!props.row.identitySnapshot?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                    style="line-height: 1;">{{ $t('dashboard.managed.noIcon') }}</span>
                </div>
                <div>
                  <div class="flex items-center q-gutter-x-xs">
                    <span class="text-caption token-symbol">
                      {{ props.row.identitySnapshot?.token?.symbol || $t('dashboard.managed.symbolUnknown') }}
                      {{ props.row.token?.nft?.commitment ? `- ${props.row.token?.nft?.commitment}` : '' }}
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
                    <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark" text-color="teal-10"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                      <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeMutable') }}
                    </q-badge>
                    <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark" text-color="grey-6"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                      <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeImmutable') }}
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
                {{ formatAmount(props.row.token?.amount, props.row.identitySnapshot?.token?.decimals) }}
              </div>
              <div v-else class="text-grey-6 text-caption text-mono">{{ $t('dashboard.managed.unavailable') }}</div>
              <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                <span>{{ $t('dashboard.managed.decimals') }}</span>
                <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                  {{ props.row.identitySnapshot?.token?.decimals === undefined ?
                    $t('dashboard.managed.decimalsUnknown') : props.row.identitySnapshot?.token?.decimals }}
                </q-badge>
                <q-badge v-if="props.row.isAggregated" color="blue-grey-8" text-color="grey-3"
                  class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                  {{ props.row.utxoCount !== 1 ?
                    $t('dashboard.collected.utxoCountPlural', { count: props.row.utxoCount }) :
                    $t('dashboard.collected.utxoCount', { count: props.row.utxoCount }) }}
                </q-badge>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-collectedActions="value">
            <q-td :props="value">
              <q-btn round icon="more_vert" size="sm" @click.stop>
                <q-menu dark auto-close class="bg-dark-2 shadow-2">
                  <q-list dark class="bg-dark" dense style="min-width: 180px">
                    <q-item clickable @click="sendCollectedTokens(value.row)">
                      <q-item-section avatar>
                        <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.collected.actionSend') }}
                      </q-item-section>
                    </q-item>

                    <q-separator dark inset />

                    <q-item clickable @click="burnCollectedTokens(value.row)">
                      <q-item-section avatar>
                        <q-icon name="mdi-fire" color="orange" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.collected.actionBurn') }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { ref, computed, onMounted, onUnmounted, watch, triggerRef } from 'vue';
import { useI18n } from 'vue-i18n'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { QTableColumn, useQuasar } from 'quasar'
import type { UtxoWithPath } from 'src/core/types'
import { getTokenType, isPureFungible, shortenTokenId } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { transferFts } from 'src/core/transaction'
import { broadcast } from 'src/core/transaction/broadcast'
import { useRouter } from 'vue-router'
import CopyText from 'components/CopyText.vue'
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { Network } from 'cashscript'
import { decodeCashAddress } from '@bitauth/libauth'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { db } from 'src/core/client-db'

const { t } = useI18n()
const $q = useQuasar()
const router = useRouter()

const { wallet, manager, walletIsReady } = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { authkeysLoading, authheadsLoading } = storeToRefs(authguardStore)

const registryStore = useRegistryStore()
const { fetchIdentitySnapshot } = useRegistryStore()

const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void,
  stopWatchingChangeWallet?: () => void,
  stopWatchingDefiWallet?: () => void,
}>({})

const primaryXPub = computed(() =>
  wallet.value?.session?.paths?.find((p: any) => p.name === 'receive')?.xpub
)

function formatBch(satoshis: bigint): string {
  const bch = Number(satoshis) / 100_000_000
  return bch.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
}

const bchBalance = computed(() => {
  const utxos = wallet.value?.utxos || []
  return utxos.reduce((sum: bigint, u: any) => {
    if (!u.token) {
      return sum + BigInt(u.satoshis)
    }
    return sum
  }, 0n)
})

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
function formatAmount(value: any, decimals: number = 0): string {
  if (value == null || value === '') return '—'
  let formattedValue = value
  if (typeof formattedValue === 'bigint' || typeof formattedValue === 'number') {
    if (decimals > 0) {
      formattedValue = Number(formattedValue) / Math.pow(10, decimals)
    }
  } else if (!isNaN(Number(formattedValue)) && decimals > 0) {
    formattedValue = Number(formattedValue) / Math.pow(10, decimals)
  }
  return formattedValue.toLocaleString()
}

const walletTokenUtxos = computed(() =>
  (wallet.value?.utxos || []).filter((u: any) => !!u.token)
)

const allCollectedRows = computed(() => {
  let rows = walletTokenUtxos.value.map((utxo: any) => {
    const snapshot = registryStore.identitySnapshotCache[utxo.token!.category!]
    return { ...utxo, identitySnapshot: snapshot || undefined }
  })
  const grouped = new Map<string, any[]>()
  for (const row of rows) {
    const cat = row.token!.category!
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(row)
  }
  const result: any[] = []
  for (const [, catRows] of grouped) {
    if (catRows.every((r: any) => isPureFungible(r))) {
      const totalAmount = catRows.reduce((sum: bigint, r: any) => sum + BigInt(r.token.amount), BigInt(0))
      result.push({
        ...catRows[0],
        token: { ...catRows[0].token, amount: totalAmount },
        utxoCount: catRows.length,
        isAggregated: true,
        aggregatedUtxos: catRows,
      })
    } else {
      result.push(...catRows)
    }
  }
  return result
})

const collectedTokenTypeFilter = ref<'all' | 'fungible' | 'nft' | 'mixed'>('all')
const collectedSearchQuery = ref('')

const collectedFungibleCount = computed(() => allCollectedRows.value.filter(r => getTokenType(r) === 'fungible').length)
const collectedNftCount = computed(() => allCollectedRows.value.filter(r => getTokenType(r) === 'nft').length)
const collectedMixedCount = computed(() => allCollectedRows.value.filter(r => getTokenType(r) === 'mixed').length)

function matchesSearch(row: any, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const symbol = row.identitySnapshot?.token?.symbol?.toLowerCase() || ''
  const category = row.token?.category?.toLowerCase() || ''
  return symbol.includes(q) || category.includes(q)
}

const collectedUtxosWithIdentity = computed(() => {
  let rows = allCollectedRows.value
  if (collectedTokenTypeFilter.value !== 'all') {
    rows = rows.filter(r => getTokenType(r) === collectedTokenTypeFilter.value)
  }
  if (collectedSearchQuery.value) {
    rows = rows.filter(r => matchesSearch(r, collectedSearchQuery.value))
  }
  return rows
})

const collectedColumns = computed<QTableColumn[]>(() => {
  const cols: QTableColumn[] = [
    {
      name: 'collectedToken',
      label: t('dashboard.collected.columnToken'),
      field: (row) => row.token?.category,
      align: 'left',
      sortable: true
    },
    {
      name: 'collectedAmount',
      label: t('dashboard.collected.columnAmount'),
      field: (row) => row.token?.amount,
      align: 'right',
      sortable: true
    },
    {
      name: 'collectedActions',
      label: '',
      field: 'actions',
      align: 'right'
    }
  ]
  if (collectedTokenTypeFilter.value === 'nft') {
    return cols.filter(c => c.name !== 'collectedAmount')
  }
  return cols
})

const loadCollectedIdentitySnapshots = async () => {
  const categories = [...new Set(walletTokenUtxos.value.map((u: any) => u.token?.category).filter(Boolean))]
  const results = await Promise.allSettled(categories.map(async (category) => {
    try {
      return await fetchIdentitySnapshot(category as string)
    } catch (e) {
      return undefined
    }
  }))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.log('Identity snapshot rejected for category', categories[index], result.reason)
    } else if (result.value === null || result.value === undefined) {
      console.log('No identity snapshot found for category', categories[index])
    }
  })
}

const onCollectedRowClick = (_evt: Event, row: any, index: number) => {
  const type = getTokenType(row)
  if (type !== 'nft') return

  authguardStore.setActiveAuthhead(null as any)

  registryStore.setActiveNft({
    contentHash: '',
    authbase: '',
    timestamp: '',
    category: row.token?.category || '',
    commitmentOrBottomAltStack: row.token?.nft?.commitment || '',
    nftType: undefined,
    utxo: row as any,
    allowEdit: false
  })

  router.push(`/issuer/nft-collections/${row.token?.category}/nft`)
}

const sendCollectedTokens = (row: any) => {
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
    focus: 'none'
  }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {
    const loadingGroup = $q.loading.show({
      group: 'send-tokens-loading-group',
      message: t('dashboard.notify.preparingCheckingWallet')
    })
    try {
      const signRequest = transferFts({
        category: row.token!.category,
        tokenAmount: userInputs.tokenAmount,
        recipientAddress: userInputs.recipient,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        transferType: 'send'
      })
      loadingGroup({ message: t('dashboard.notify.preparingForSignature') })
      const response = await manager.value!.signTransaction(signRequest)
      loadingGroup({ message: t('dashboard.notify.broadcasting') })
      const broadcastResponse = await broadcast(response.signedTransaction)
      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          loadingGroup({ message: t('dashboard.notify.awaitingPropagation') })

          const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
          await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
          })

          await wallet.value?.sync()
          triggerRef(wallet)
          await db.saveActivity({ event: t('dashboard.notify.activityEventTransferFts'), txid: broadcastResult.txid, status: 'success' })
          loadingGroup()
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: t('dashboard.notify.transferSent'),
              txid: broadcastResult.txid
            }
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error: any) {
      $q.notify({ type: 'Error', message: error.message })
    } finally {
      loadingGroup()
    }
  })
}

const burnCollectedTokens = (row: any) => {
  const sampleAddress = wallet.value!.getTokenDepositAddress(0)
  const sampleDecodedAddress = decodeCashAddress(sampleAddress)
  if (typeof (sampleDecodedAddress) === 'string') {
    throw new Error(sampleDecodedAddress)
  }
  const burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`

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
    focus: 'none'
  }).onOk(async (userInputs: { tokenAmount: bigint }) => {
    const loadingGroup = $q.loading.show({
      group: 'burn-tokens-loading-group',
      message: t('dashboard.notify.preparingCheckingWallet')
    })
    try {
      const signRequest = transferFts({
        category: row.token!.category,
        tokenAmount: userInputs.tokenAmount,
        recipientAddress: burnAddress,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        transferType: 'burn'
      })
      loadingGroup({ message: t('dashboard.notify.preparingForSignature') })
      const response = await manager.value!.signTransaction(signRequest)
      loadingGroup({ message: t('dashboard.notify.broadcasting') })
      const broadcastResponse = await broadcast(response.signedTransaction)
      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          loadingGroup({ message: t('dashboard.notify.awaitingPropagation') })
          const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
          await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
          })

          await wallet.value?.sync()
          triggerRef(wallet)
          await db.saveActivity({ event: t('dashboard.notify.activityEventBurnFts'), txid: broadcastResult.txid, status: 'success' })
          loadingGroup()
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: t('dashboard.notify.transferBurned'),
              txid: broadcastResult.txid
            }
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error: any) {
      $q.notify({ type: 'Error', message: error.message })
    } finally {
      loadingGroup()
    }
  })
}

watch(() => walletIsReady.value, async (isReady, prevValue) => {
  if (isReady && !prevValue) {
    triggerRef(wallet)
    await loadCollectedIdentitySnapshots()
    walletWatchers.value.stopWatchingReceiveWallet = await wallet.value?.receive?.watchStatus(async (status: any, address: any) => {
      await wallet.value?.sync()
      triggerRef(wallet)
      await loadCollectedIdentitySnapshots()
    })
  }
}, { immediate: true })

onMounted(async () => {
  if (walletIsReady.value) {
    await loadCollectedIdentitySnapshots()
  }
})

onUnmounted(() => {
  walletWatchers.value?.stopWatchingReceiveWallet?.()
  walletWatchers.value?.stopWatchingChangeWallet?.()
  walletWatchers.value?.stopWatchingDefiWallet?.()
})
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

.rounded-borders {
  border-radius: 6px;
}
</style>