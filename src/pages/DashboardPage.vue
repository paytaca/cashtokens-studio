<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container">
      <ExplainerBanner class="q-my-md"
        :avatarSrc="`https://api.dicebear.com/10.x/miniavs/svg?seed=${primaryXPub}`"
        :title="primaryXPub?.replace(primaryXPub.substring(8, 105), '...')">
        <template #subtitle>
          <q-btn icon="img:/images/bitcoin-cash-circle.svg" flat dense no-caps class="q-pa-none">
            <span class="q-px-xs">{{ formatBch(bchBalance) }}</span>
          </q-btn>
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
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { ref, computed, onUnmounted, watch, triggerRef } from 'vue';
import { useI18n } from 'vue-i18n'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { isPureFungible } from 'src/core/utils'
import { db } from 'src/core/client-db'
import { useRouter } from 'vue-router'
import ExplainerBanner from 'src/components/ExplainerBanner.vue'

const { t } = useI18n()
const router = useRouter()

const { wallet, walletIsReady } = useWizardConnectWallet()

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
</style>