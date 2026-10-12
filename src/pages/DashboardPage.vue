<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container">
      <ExplainerBanner class="q-my-md"
        :avatarSrc="walletIcon || `https://api.dicebear.com/10.x/miniavs/svg?seed=${primaryXPub}`"
        :title="walletDisplayName">
        <template #subtitle>
          <div class="row items-center q-gutter-x-sm">
            <q-btn icon="img:/images/bitcoin-cash-circle.svg" flat dense no-caps class="q-pa-none">
              <span class="q-px-xs">{{ formatBch(bchBalance) }}</span>
            </q-btn>
            <template v-if="primaryXPub">
              <span class="text-grey-6">·</span>
              <span class="text-grey-5">{{ shorten(primaryXPub) }}</span>
            </template>
          </div>
        </template>
        <template #default>
          <div class="row items-center q-gutter-sm">
            <q-chip :color="stateColor" text-color="white" dense :icon="stateIcon">
              {{ stateLabel }}
            </q-chip>
            <q-chip color="grey-9" text-color="grey-3" dense icon="lan">
              {{ networkLabel }}
            </q-chip>
          </div>
        </template>
      </ExplainerBanner>

      <div class="q-pa-md">
        <div class="row q-col-gutter-md">
          <div v-for="card in sectionCards" :key="card.name" class="col-12 col-sm-6 col-md-4">
            <q-card clickable flat class="dashboard-section-card" @click="router.push(card.to)">
              <q-card-section class="q-pa-lg">
                <div class="row items-center no-wrap q-gutter-md">
                  <q-avatar rounded :color="card.color" text-color="white" size="56px">
                    <q-icon :name="card.icon" size="28px" />
                  </q-avatar>
                  <div class="col" style="min-width: 0">
                    <div class="text-subtitle1 text-weight-bold text-white">{{ card.title }}</div>
                    <div class="text-caption text-grey-4">{{ card.description }}</div>
                  </div>
                </div>
              </q-card-section>
              <q-separator dark inset />
              <q-card-actions class="q-px-md q-py-sm">
                <div class="flex items-center q-gutter-x-sm">
                  <q-badge :color="card.count > 0 ? card.color : 'grey-6'"
                    :text-color="card.count > 0 ? 'white' : 'grey-5'" rounded>
                    <span class="text-bold">{{ card.count }}</span>
                  </q-badge>
                  <span class="text-caption text-grey-5">{{ card.countLabel }}</span>
                </div>
                <q-space />
                <q-icon name="chevron_right" color="grey-5" />
              </q-card-actions>
            </q-card>
          </div>
        </div>

        <div class="row q-col-gutter-md q-mt-md">
          <!-- Wallet information -->
          <div class="col-12 col-md-7">
            <q-card flat class="dashboard-section-card">
              <q-card-section>
                <div class="row items-center no-wrap q-gutter-sm">
                  <q-icon name="account_balance_wallet" color="primary" size="24px" />
                  <div class="col" style="min-width: 0">
                    <div class="text-subtitle1 text-weight-bold text-white">{{ t('dashboard.wallet.title') }}</div>
                    <div class="text-caption text-grey-4">{{ t('dashboard.wallet.caption') }}</div>
                  </div>
                </div>
              </q-card-section>
              <q-separator dark inset />

              <q-card-section class="q-pt-md">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <div class="text-caption text-grey-5">
                      {{ t('dashboard.wallet.receiveAddress') }} {{ t('dashboard.wallet.addressIndex') }}
                    </div>
                    <div class="row items-center no-wrap">
                      <span class="ellipsis text-grey-2" :title="receiveAddress || ''">
                        {{ receiveAddress || t('dashboard.wallet.noAddress') }}
                      </span>
                      <q-btn v-if="receiveAddress" flat dense round size="sm" icon="qr_code_2"
                        color="grey-5" @click="openAddressQrDialog(receiveAddress)">
                        <q-tooltip>{{ t('dashboard.wallet.showQr') }}</q-tooltip>
                      </q-btn>
                      <q-btn v-if="receiveAddress" flat dense round size="sm" icon="content_copy"
                        color="grey-5" @click="copyValue(receiveAddress)">
                        <q-tooltip>{{ t('dashboard.copy.tooltip') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="text-caption text-grey-5">{{ t('dashboard.wallet.tokenAddress') }}</div>
                    <div class="row items-center no-wrap">
                      <span class="ellipsis text-grey-2" :title="tokenAddress || ''">
                        {{ tokenAddress || t('dashboard.wallet.noAddress') }}
                      </span>
                      <q-btn v-if="tokenAddress" flat dense round size="sm" icon="content_copy"
                        color="grey-5" @click="copyValue(tokenAddress)">
                        <q-tooltip>{{ t('dashboard.copy.tooltip') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>

                <div class="row q-col-gutter-md q-mt-sm">
                  <div class="col-6 col-sm-4">
                    <div class="stat-tile">
                      <div class="text-caption text-grey-5">{{ t('dashboard.wallet.balanceLabel') }}</div>
                      <div class="text-subtitle2 text-white">{{ formatBch(bchBalance) }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-sm-4">
                    <div class="stat-tile">
                      <div class="text-caption text-grey-5">{{ t('dashboard.wallet.utxos') }}</div>
                      <div class="text-subtitle2 text-white">{{ utxoCount }}</div>
                    </div>
                  </div>
                  <div class="col-12 col-sm-4">
                    <div class="stat-tile">
                      <div class="text-caption text-grey-5">{{ t('dashboard.wallet.tokens') }}</div>
                      <div class="text-subtitle2 text-white">{{ tokenUtxoCount }}</div>
                    </div>
                  </div>
                </div>
              </q-card-section>

              <q-separator dark inset />
              <q-card-section class="q-pt-sm">
                <div class="text-caption text-grey-5 q-mb-sm">{{ t('dashboard.wallet.xpubs') }}</div>
                <div v-if="sessionPaths.length === 0" class="text-caption text-grey-6">
                  {{ t('dashboard.wallet.notAvailable') }}
                </div>
                <div v-for="path in sessionPaths" :key="path.name"
                  class="row items-center no-wrap q-gutter-x-sm q-py-xs">
                  <q-badge color="grey-9" text-color="grey-3" :label="pathLabel(path.name)" />
                  <span class="ellipsis text-grey-3" :title="path.xpub">{{ shorten(path.xpub, 12, 6) }}</span>
                  <q-space />
                  <q-btn flat dense round size="sm" icon="content_copy" color="grey-5"
                    @click="copyValue(path.xpub)">
                    <q-tooltip>{{ t('dashboard.copy.tooltip') }}</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- WizardConnect connection information -->
          <div class="col-12 col-md-5">
            <q-card flat class="dashboard-section-card">
              <q-card-section>
                <div class="row items-center no-wrap q-gutter-sm">
                  <q-avatar rounded size="36px">
                    <q-img v-if="walletIcon" :src="walletIcon"></q-img>
                    <q-img v-else :src="WIZARDCONNECT_LOGO"></q-img>
                  </q-avatar>
                  <div class="col" style="min-width: 0">
                    <div class="text-subtitle1 text-weight-bold text-white">{{ t('dashboard.connection.title') }}</div>
                    <div class="text-caption text-grey-4">{{ t('dashboard.connection.caption') }}</div>
                  </div>
                </div>
              </q-card-section>
              <q-separator dark inset />

              <q-card-section class="q-pt-sm q-pb-sm">
                <q-list dense dark>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.wallet') }}</q-item-label>
                      <q-item-label class="text-grey-2">{{ walletName || t('dashboard.wallet.notAvailable') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.state') }}</q-item-label>
                      <q-item-label>
                        <q-badge :color="stateColor" text-color="white" :label="stateLabel" />
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.protocol') }}</q-item-label>
                      <q-item-label class="text-grey-2">{{ protocol || t('dashboard.wallet.notAvailable') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.discovered') }}</q-item-label>
                      <q-item-label class="text-grey-2">{{ isDiscovered ? t('dashboard.connection.yes') : t('dashboard.connection.no') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.persisted') }}</q-item-label>
                      <q-item-label class="text-grey-2">{{ storedSession ? t('dashboard.connection.yes') : t('dashboard.connection.no') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="walletPublicKey" class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.walletPublicKey') }}</q-item-label>
                      <q-item-label class="row items-center no-wrap q-gutter-x-sm">
                        <span class="ellipsis text-grey-2" :title="walletPublicKey">{{ shorten(walletPublicKey, 12, 6) }}</span>
                        <q-btn flat dense round size="sm" icon="content_copy" color="grey-5" @click="copyValue(walletPublicKey)">
                          <q-tooltip>{{ t('dashboard.copy.tooltip') }}</q-tooltip>
                        </q-btn>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.paths') }}</q-item-label>
                      <q-item-label class="text-grey-2">
                        {{ sessionPaths.length > 0 ? sessionPaths.map((p) => pathLabel(p.name)).join(', ') : t('dashboard.connection.noSession') }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.ping.lastPong') }}</q-item-label>
                      <q-item-label class="row items-center no-wrap q-gutter-x-sm">
                        <span class="text-grey-2">{{ lastPongAgo }}</span>
                        <q-badge :color="pingHealth.color" text-color="white" :label="pingHealth.label" />
                        <q-btn flat dense round size="sm" icon="info_outline" color="grey-5">
                          <q-tooltip>{{ t('dashboard.ping.hint') }}</q-tooltip>
                        </q-btn>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.ping.responses') }}</q-item-label>
                      <q-item-label class="text-grey-2">{{ pongCount }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item class="px-0">
                    <q-item-section>
                      <q-item-label caption class="text-grey-5">{{ t('dashboard.connection.relay') }}</q-item-label>
                      <q-item-label v-for="relayUrl in relayUrls" :key="relayUrl" class="text-grey-2 ellipsis" :title="relayUrl">
                        {{ relayUrl }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { ref, computed, onMounted, onUnmounted, watch, triggerRef } from 'vue';
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { isPureFungible } from 'src/core/utils'
import { db } from 'src/core/client-db'
import { useRouter } from 'vue-router'
import ExplainerBanner from 'src/components/ExplainerBanner.vue'
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue'
import { WIZARDCONNECT_LOGO } from 'wizardconnect-vue'

const { t } = useI18n()
const $q = useQuasar()
const router = useRouter()

const {
  wallet,
  walletIsReady,
  state,
  manager,
  walletName,
  walletIcon,
  relayUrls,
  lastPongAt,
  pongCount,
} = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { loadAuthkeys, loadAuthheads } = authguardStore
const { authheads } = storeToRefs(authguardStore)

const registryStore = useRegistryStore()
const { fetchIdentitySnapshot } = useRegistryStore()

const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void,
  stopWatchingChangeWallet?: () => void,
  stopWatchingDefiWallet?: () => void,
}>({})

const activities = ref<any[]>([])

const primaryXPub = computed(() =>
  wallet.value?.session?.paths?.find((p: any) => p.name === 'receive')?.xpub
)

function shorten(value?: string | null, head = 10, tail = 8): string {
  if (!value) return ''
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

function copyValue(value?: string | null) {
  if (!value) return
  navigator.clipboard?.writeText(value)
  $q.notify({ type: 'positive', message: t('dashboard.copy.copied'), position: 'top' })
}

function openAddressQrDialog(address: string) {
  $q.dialog({
    component: QrCodeModal,
    componentProps: {
      contents: address,
      title: t('dashboard.qr.title'),
      subtitle: t('dashboard.qr.subtitle'),
      copyLabel: t('dashboard.qr.copyLabel'),
    },
  })
}

const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

function timeAgo(timestamp: number | null): string {
  if (!timestamp) return t('dashboard.ping.never')
  const seconds = Math.max(0, Math.floor((now.value - timestamp) / 1000))
  return t('dashboard.ping.timeAgo', { count: seconds })
}

const lastPongAgo = computed(() => timeAgo(lastPongAt.value))

const PING_HEALTHY_MS = 30_000
const PING_STALE_MS = 75_000
const pingHealth = computed(() => {
  const timestamp = lastPongAt.value
  if (!timestamp) {
    return { color: 'grey-6', label: t('dashboard.ping.health.waiting') }
  }
  const age = now.value - timestamp
  if (age < PING_HEALTHY_MS) {
    return { color: 'positive', label: t('dashboard.ping.health.healthy') }
  }
  if (age < PING_STALE_MS) {
    return { color: 'warning', label: t('dashboard.ping.health.delayed') }
  }
  return { color: 'negative', label: t('dashboard.ping.health.stale') }
})

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

const walletTokenUtxos = computed(() =>
  (wallet.value?.utxos || []).filter((u: any) => !!u.token)
)

const utxoCount = computed(() => wallet.value?.utxos?.length ?? 0)
const tokenUtxoCount = computed(() => walletTokenUtxos.value.length)

const sessionPaths = computed<{ name: string, xpub: string }[]>(() =>
  wallet.value?.session?.paths ?? []
)

const receiveAddress = computed(() => {
  try {
    return wallet.value?.getDepositAddress?.(0)
  } catch (e) {
    return undefined
  }
})

const tokenAddress = computed(() => {
  try {
    return wallet.value?.getTokenDepositAddress?.(0)
  } catch (e) {
    return undefined
  }
})

const walletDisplayName = computed(() =>
  walletName.value || shorten(primaryXPub.value) || t('dashboard.wallet.title')
)

const networkLabel = computed(() => {
  const net = ((import.meta.env.VITE_BCH_NETWORK as string) || 'mainnet').toLowerCase()
  const key = `dashboard.banner.network.${net}`
  const translated = t(key)
  return translated === key ? net.charAt(0).toUpperCase() + net.slice(1) : translated
})

const stateMap: Record<string, { color: string, icon: string, labelKey: string }> = {
  connected: { color: 'positive', icon: 'link', labelKey: 'dashboard.banner.state.connected' },
  connecting: { color: 'info', icon: 'sync', labelKey: 'dashboard.banner.state.connecting' },
  reconnecting: { color: 'warning', icon: 'sync', labelKey: 'dashboard.banner.state.reconnecting' },
  disconnected: { color: 'grey-6', icon: 'link_off', labelKey: 'dashboard.banner.state.disconnected' },
  idle: { color: 'grey-6', icon: 'hourglass_empty', labelKey: 'dashboard.banner.state.idle' },
}

const connectionState = computed(() => state.value || 'idle')
const stateLabel = computed(() => t((stateMap[connectionState.value] ?? stateMap.idle).labelKey))
const stateColor = computed(() => (stateMap[connectionState.value] ?? stateMap.idle).color)
const stateIcon = computed(() => (stateMap[connectionState.value] ?? stateMap.idle).icon)

const protocol = computed(() => manager.value?.protocol ?? null)
const isDiscovered = computed(() => manager.value?.isWalletDiscovered?.() ?? false)

const storedSession = computed(() => {
  try {
    return manager.value?.loadStoredSession?.() ?? null
  } catch (e) {
    return null
  }
})

const walletPublicKey = computed(() => storedSession.value?.walletPublicKey ?? null)

function pathLabel(name: string): string {
  if (name === 'receive') return t('dashboard.wallet.receivePath')
  if (name === 'change') return t('dashboard.wallet.changePath')
  if (name === 'defi') return t('dashboard.wallet.defiPath')
  return name
}

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

const sectionCards = computed(() => [
  {
    name: 'managed-tokens',
    to: { name: 'managed-tokens' },
    icon: 'brush',
    color: 'secondary',
    title: t('dashboard.pageTitle.managedTokens'),
    description: t('dashboard.managed.caption'),
    count: authheads.value.length,
    countLabel: t('dashboard.card.countTokens'),
  },
  {
    name: 'collected-tokens',
    to: { name: 'collected-tokens' },
    icon: 'grid_view',
    color: 'primary',
    title: t('dashboard.pageTitle.collectedTokens'),
    description: t('dashboard.collected.caption'),
    count: allCollectedRows.value.length,
    countLabel: t('dashboard.card.countTokens'),
  },
  {
    name: 'activities',
    to: { name: 'activities' },
    icon: 'history',
    color: 'accent',
    title: t('dashboard.pageTitle.activities'),
    description: t('dashboard.activity.caption'),
    count: activities.value.length,
    countLabel: t('dashboard.card.countActivities'),
  },
])

const loadActivities = async () => {
  activities.value = await db.activity.orderBy('timestamp').reverse().toArray()
}

const loadCollectedIdentitySnapshots = async () => {
  const categories = [...new Set(walletTokenUtxos.value.map((u: any) => u.token?.category).filter(Boolean))]
  await Promise.allSettled(categories.map(async (category) => {
    try {
      return await fetchIdentitySnapshot(category as string)
    } catch (e) {
      return undefined
    }
  }))
}

watch(() => walletIsReady.value, async (isReady, prevValue) => {
  if (isReady && !prevValue) {
    loadAuthkeys(wallet.value).then((authkeys) => {
      loadAuthheads(authkeys)
    })

    triggerRef(wallet)

    await Promise.allSettled([loadCollectedIdentitySnapshots(), loadActivities()])
    walletWatchers.value.stopWatchingReceiveWallet = await wallet.value?.receive?.watchStatus(async (status: any, address: any) => {
      await wallet.value?.sync()
      loadAuthkeys(wallet.value).then((authkeys) => {
        loadAuthheads(authkeys)
      })
      triggerRef(wallet)
    })
  }
}, { immediate: true })

onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer)
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

.stat-tile {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  height: 100%;
}

.px-0 {
  padding-left: 0;
  padding-right: 0;
}
</style>
