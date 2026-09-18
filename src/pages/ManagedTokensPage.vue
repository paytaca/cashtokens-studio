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

      <div class="row items-center justify-between q-pa-md q-my-md" style="background-color: #292828; ">
        <div class="col-xs-12 col-sm-6 text-subtitle1 text-weight-medium" style=" color: #e0e0e0; word-break: break-all; ">
          {{ $t('dashboard.managed.caption') }}
        </div>
        <div class="col-xs-12 col-sm-6 text-right">
          <q-btn v-if="authheads.length > 0" icon="mdi-creation" :label="$t('dashboard.managed.createNew')"
            color="secondary" no-caps @click="router.push({ name: 'create-token' })" rounded />
        </div>
      </div>

      <template v-if="authkeysLoading || authheadsLoading">
        <div v-for="i in 3" :key="i"
          class="row items-center q-gutter-x-md q-pa-md bg-dark q-mb-sm rounded-borders">
          <q-skeleton type="rect" size="36px" class="rounded-borders" />
          <div class="column q-gutter-y-xs" style="flex: 1;">
            <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
            <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
          </div>
          <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
        </div>
      </template>
      <template v-else-if="authheads.length > 0">
        <div class="row q-gutter-sm q-mb-md">
          <q-btn flat unelevated :color="tokenTypeFilter === 'all' ? 'grey-8' : 'transparent'"
            :text-color="tokenTypeFilter === 'all' ? 'white' : 'grey-5'"
            :label="$t('dashboard.managed.filterAll', { count: authheads.length })" @click="tokenTypeFilter = 'all'"
            class="q-px-sm" no-caps />
          <q-btn flat unelevated :color="tokenTypeFilter === 'fungible' ? 'green-4' : 'transparent'"
            :text-color="tokenTypeFilter === 'fungible' ? 'white' : 'grey-5'"
            :label="$t('dashboard.managed.filterFungible', { count: fungibleCount })" @click="tokenTypeFilter = 'fungible'"
            class="q-px-sm" no-caps />
          <q-btn flat unelevated :color="tokenTypeFilter === 'nft' ? 'blue-6' : 'transparent'"
            :text-color="tokenTypeFilter === 'nft' ? 'white' : 'grey-5'"
            :label="$t('dashboard.managed.filterNft', { count: nftCount })" @click="tokenTypeFilter = 'nft'"
            class="q-px-sm" no-caps />
          <q-btn flat unelevated :color="tokenTypeFilter === 'mixed' ? 'purple-4' : 'transparent'"
            :text-color="tokenTypeFilter === 'mixed' ? 'white' : 'grey-5'"
            :label="$t('dashboard.managed.filterMixed', { count: mixedCount })" @click="tokenTypeFilter = 'mixed'"
            class="q-px-sm" no-caps />
          <q-input v-model="createdSearchQuery" dark dense outlined :placeholder="$t('dashboard.managed.searchPlaceholder')"
            class="bg-grey-10" style="border-radius: 0.75rem; min-width: 200px; margin-left: auto;">
            <template v-slot:prepend>
              <q-icon name="search" color="grey-6" size="xs" />
            </template>
            <template v-slot:append v-if="createdSearchQuery">
              <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer" @click="createdSearchQuery = ''" />
            </template>
          </q-input>
        </div>
        <q-table :rows="filteredAuthheads" :columns="columns" :row-key="(row: any) => `${row.txid}:${row.vout}`"
          flat class="border-radius-12 token-reserves-table" @row-click.stop="onAuthheadsRowClick">
          <template v-slot:body-cell-token="props">
            <q-td :props="props">
              <div class="flex items-center no-wrap q-gutter-x-md">
                <div class="flex column items-center">
                  <q-avatar size="36px" class="bg-grey-9 border-radius-8 shadow-1">
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
                    </span>
                    <span class="text-grey-7">-</span>
                    <span class="flex items-center text-caption text-grey-5 text-mono">
                      {{ shortenTokenId(props.row.token!.category) }}
                      <CopyText :text="props.row.token!.category" />
                    </span>
                  </div>
                  <div class="flex items-center q-gutter-x-xs q-mt-xs">
                    <q-badge v-if="getTokenType(props.row) === 'mixed'" color="dark" text-color="orange-4"
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
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8"
                      dense>
                      <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeImmutable') }}
                    </q-badge>
                  </div>
                </div>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-fungibleReserves="props">
            <q-td :props="props" class="text-right">
              <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                class="text-subtitle1 text-weight-bold text-mono text-white">
                {{ formatTokenAmount(props.value, props.row.identitySnapshot?.token?.symbol || '',
                props.row.identitySnapshot?.token?.decimals, 'none') }}
              </div>
              <div v-else class="text-grey-6 text-caption text-mono">{{ $t('dashboard.managed.unavailable') }}</div>
              <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                <span>{{ $t('dashboard.managed.decimals') }}</span>
                <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                  {{ props.row.identitySnapshot?.token?.decimals === undefined ?
                    $t('dashboard.managed.decimalsUnknown') : props.row.identitySnapshot?.token?.decimals }}
                </q-badge>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="value">
            <q-td :props="value">
              <q-btn round icon="more_vert" size="sm" @click.stop>
                <q-menu dark auto-close class="bg-dark-2 shadow-2">
                  <q-list dark class="bg-dark" dense style="min-width: 180px">
                    <q-item clickable @click="viewRegistry(value.row)">
                      <q-item-section avatar>
                        <q-icon name="description" color="secondary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionViewRegistry') }}
                      </q-item-section>
                    </q-item>

                    <q-item clickable @click="navigateToAuthguard(value.row)">
                      <q-item-section avatar>
                        <q-icon name="lock" color="secondary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionTokenVault') }}
                      </q-item-section>
                    </q-item>

                    <q-separator dark inset />

                    <q-item v-if="['fungible', 'mixed'].includes(getTokenType(value.row))" clickable
                      @click="openTransferDialog(value.row, 'issuance')">
                      <q-item-section avatar>
                        <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionReleaseReserves') }}
                      </q-item-section>
                    </q-item>

                    <q-item v-if="['fungible', 'mixed'].includes(getTokenType(value.row))" clickable
                      @click="openTransferDialog(value.row, 'burn')">
                      <q-item-section avatar>
                        <q-icon name="mdi-fire" color="orange" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionBurnReserves') }}
                      </q-item-section>
                    </q-item>

                    <q-item
                      v-if="getTokenType(value.row) !== 'fungible' && value.row.token?.nft?.capability === 'minting'"
                      clickable @click="navigateToMint(value.row)">
                      <q-item-section avatar>
                        <q-icon name="add_circle" color="primary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionMintChildNft') }}
                      </q-item-section>
                    </q-item>

                    <q-item v-if="getTokenType(value.row) !== 'fungible'" clickable
                      @click="openTransferDialog(value.row, 'burn')">
                      <q-item-section avatar>
                        <q-icon name="mdi-fire" color="orange" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionBurn') }}
                      </q-item-section>
                    </q-item>
                    <q-separator dark inset />
                    <q-separator dark inset />
                    <q-item clickable @click="refreshCache(value.row.token!.category as string)">
                      <q-item-section avatar>
                        <q-icon name="refresh" color="grey-5" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionRefreshCache') }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </template>
      <template v-else>
        <div class="bg-dark q-pa-lg rounded-borders">
          <div class="flex flex-center column q-py-lg">
            <div class="flex flex-center q-mb-lg" style="height: 120px; width: 260px;">
              <div class="playing-card" style="z-index: 1; transform: rotate(-12deg) translateX(22px); margin-right: -30px;">
                <q-icon name="brush" size="32px" color="grey-5" />
              </div>
              <div class="playing-card" style="z-index: 2; transform: rotate(-2deg);">
                <q-icon name="token" size="32px" color="grey-5" />
              </div>
              <div class="playing-card"
                style="z-index: 3; transform: rotate(8deg) translateX(-22px); margin-left: -30px;">
                <q-icon name="auto_awesome" size="32px" color="grey-5" />
              </div>
            </div>
            <div class="text-grey-5 text-h6 q-mb-lg">{{ $t('dashboard.managed.noCreatedTokens') }}</div>
            <q-btn color="primary" icon="add" :label="$t('dashboard.managed.createToken')" unelevated size="lg"
              @click="router.push({ name: 'create-token' })" />
          </div>
        </div>
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
import { useAppStore } from 'src/stores/app'
import { storeToRefs } from 'pinia'
import { QTableColumn, useQuasar } from 'quasar'
import type { DecoratedUtxoFormSafe, UtxoWithPath, UtxoWithAuthKey, DecoratedUtxo } from 'src/core/types'
import { getTokenType, formatTokenAmount, shortenTokenId } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { transferFungibleReserves, jsonFormSafeUtxoReviver, jsonReplacer } from 'src/core/transaction'
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

const { wallet, walletLasySync, manager, walletIsReady } = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { loadAuthkeys, loadAuthheads } = authguardStore
const { authheads, authkeysLoading, authheadsLoading } = storeToRefs(authguardStore)

const appStore = useAppStore()
const registryStore = useRegistryStore()
const { loadRegistry, setActiveIdentitySnapshot } = useRegistryStore()

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

const tokenTypeFilter = ref<'all' | 'fungible' | 'nft' | 'mixed'>('all')
const createdSearchQuery = ref('')

const fungibleCount = computed(() => authheads.value.filter(r => getTokenType(r) === 'fungible').length)
const nftCount = computed(() => authheads.value.filter(r => getTokenType(r) === 'nft').length)
const mixedCount = computed(() => authheads.value.filter(r => getTokenType(r) === 'mixed').length)

const columns: QTableColumn[] = [
  {
    name: 'token',
    label: t('dashboard.managed.columnToken'),
    field: (row) => row.identitySnapshot?.token?.symbol || row.identitySnapshot?.name,
    align: 'left',
    sortable: true
  },
  {
    name: 'fungibleReserves',
    label: t('dashboard.managed.columnFungibleReserves'),
    field: (row) => row.token?.amount,
    align: 'right',
    sortable: true
  },
  {
    name: 'actions',
    label: '',
    field: 'actions',
    align: 'right'
  }
]

function matchesSearch(row: any, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const symbol = row.identitySnapshot?.token?.symbol?.toLowerCase() || ''
  const category = row.token?.category?.toLowerCase() || ''
  return symbol.includes(q) || category.includes(q)
}

const filteredAuthheads = computed(() => {
  let rows = authheads.value
  if (tokenTypeFilter.value !== 'all') {
    rows = rows.filter(r => getTokenType(r) === tokenTypeFilter.value)
  }
  if (createdSearchQuery.value) {
    rows = rows.filter(r => matchesSearch(r, createdSearchQuery.value))
  }
  return rows
})

const viewRegistry = (authhead: DecoratedUtxo) => {
  authguardStore.setActiveAuthhead(authhead)
  const query: Record<string, string> = { authbase: authhead.token?.category || '' }
  if (authhead.identitySnapshotIdentifier?.contentHash) {
    query.contentHash = authhead.identitySnapshotIdentifier.contentHash
  }
  router.push({ path: '/token/metadata-registry', query })
}

const navigateToAuthguard = (row: UtxoWithAuthKey) => {
  const authkeyCategory = row.authkey?.token?.category
  if (!authkeyCategory) return
  authguardStore.setActiveAuthhead(row)
  router.push(`/authguard/${authkeyCategory}?authhead=${row.txid}:${row.vout}`)
}

const onAuthheadsRowClick = (_evt: Event, row: any, index: number) => {
  _evt.preventDefault()
  authguardStore.setActiveAuthhead(row)
  setActiveIdentitySnapshot(row.identitySnapshot)
  router.push({
    name: 'view-authhead',
    query: {
      authkey: `${row.authkey.txid}:${row.authkey.vout}`,
      authhead: `${row.txid}:${row.vout}`,
      authbase: row.identitySnapshotIdentifier?.identity?.authbase || row.token!.category,
      registryIdentity: row.identitySnapshotIdentifier?.registryIdentity,
      contentHash: row.identitySnapshotIdentifier?.contentHash,
      timestamp: row.identitySnapshotIdentifier?.identity?.timestamp,
    }
  })
}

const navigateToMint = (row: UtxoWithAuthKey) => {
  authguardStore.setActiveAuthhead(row)
  appStore.setActiveMinter(row as any)
  router.push('/issuer/nft-collections/' + row.token?.category + '/mint')
}

const refreshCache = async (category: string) => {
  await loadRegistry(category)
}

const openTransferDialog = (v: DecoratedUtxoFormSafe, action: 'issuance' | 'burn') => {
  if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
    return $q.notify({
      type: 'Error',
      message: t('dashboard.notify.insufficientBch')
    })
  }

  const componentProps: Record<string, any> = {
    transferType: action,
    tokenCategory: v.token!.category,
    balance: BigInt(v.token!.amount),
    decimals: v.identitySnapshot?.token?.decimals ?? 0,
    identitySnapshot: v.identitySnapshot,
  }

  if (action === 'issuance') {
    componentProps.selfAddress = wallet.value.getTokenDepositAddress(0)
  } else if (action === 'burn') {
    const sampleAddress = wallet.value.getTokenDepositAddress(0)
    const sampleDecodedAddress = decodeCashAddress(sampleAddress)
    if (typeof (sampleDecodedAddress) === 'string') {
      throw new Error(sampleDecodedAddress)
    }
    componentProps.burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`
  }

  $q.dialog({
    component: FungibleTransferDialog,
    componentProps,
    focus: 'none'
  }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {
    const loadingGroup = $q.loading.show({
      group: 'issue-fungible-reserves-loading-group',
      message: t('dashboard.notify.preparingCheckingWallet')
    })

    const issuerTokenUtxo = JSON.parse(
      JSON.stringify(v, jsonReplacer),
      jsonFormSafeUtxoReviver,
    )

    try {
      let recipientAddress = userInputs.recipient
      if (action === 'burn') {
        recipientAddress = componentProps.burnAddress
      }

      const signRequest = transferFungibleReserves({
        issuerTokenUtxo,
        authkeyUtxo: issuerTokenUtxo.authkey,
        recipientAddress: recipientAddress,
        transferTokenAmount: userInputs.tokenAmount,
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
        transferType: action
      })

      loadingGroup({
        message: t('dashboard.notify.preparingForSignature')
      })
      const response = await manager.value!.signTransaction(signRequest)

      loadingGroup({
        message: t('dashboard.notify.broadcasting')
      })

      const broadcastResponse = await broadcast(response.signedTransaction)

      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          loadingGroup({
            message: t('dashboard.notify.awaitingPropagation')
          })

          const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
          await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
          })

          loadingGroup()
          await loadAuthkeys(wallet.value, true)
          triggerRef(wallet)
          await db.saveActivity({
            event: action === 'issuance' ? t('dashboard.notify.activityEventReleaseReserves') : t('dashboard.notify.activityEventBurnReserves'),
            txid: broadcastResult.txid,
            status: 'success'
          })
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: t('dashboard.notify.reservesIssued', {
                action: action === 'issuance' ? t('dashboard.notify.reservesActionIssued') : t('dashboard.notify.reservesActionBurned')
              }),
              txid: broadcastResult.txid
            }
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error: any) {
      $q.notify({
        type: 'Error',
        message: error.message
      })
    } finally {
      loadingGroup()
    }
  })
}

watch(() => walletIsReady.value, async (isReady, prevValue) => {
  if (isReady && !prevValue) {
    loadAuthkeys(wallet.value).then((authkeys) => {
      loadAuthheads(authkeys)
    })

    triggerRef(wallet)

    walletWatchers.value.stopWatchingReceiveWallet = await wallet.value?.receive?.watchStatus(async (status: any, address: any) => {
      await wallet.value?.sync()
      loadAuthkeys(wallet.value).then((authkeys) => {
        loadAuthheads(authkeys)
      })
      triggerRef(wallet)
    })
  }
}, { immediate: true })

watch(walletLasySync, async () => {
  await loadAuthkeys(wallet.value, true)
})

onMounted(async () => {
  if (walletIsReady.value) {
    const authkeys = await loadAuthkeys(wallet.value, true)
    loadAuthheads(authkeys)
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
</style>