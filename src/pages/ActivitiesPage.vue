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
        {{ $t('dashboard.activity.caption') }}
      </div>
      <div class="row q-gutter-sm q-mb-md items-center">
        <q-input v-model="activitySearchQuery" dark dense outlined :placeholder="$t('dashboard.activity.searchPlaceholder')"
          class="bg-grey-10" style="border-radius: 0.75rem; min-width: 200px;">
          <template v-slot:prepend>
            <q-icon name="search" color="grey-6" size="xs" />
          </template>
          <template v-slot:append v-if="activitySearchQuery">
            <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer" @click="activitySearchQuery = ''" />
          </template>
        </q-input>
        <q-btn flat color="grey-6" :label="$t('dashboard.activity.clearActivities')" @click="clearActivities"
          class="q-ml-sm" />
      </div>
      <q-table :rows="filteredActivities" :columns="activityColumns" :row-key="(row: any) => row.id"
        :pagination="{ rowsPerPage: 5 }" :loading="activityLoading" flat
        class="border-radius-12 token-reserves-table">
        <template v-slot:body-cell-activityEvent="props">
          <q-td :props="props">
            <span class="text-weight-bold text-white">{{ props.value }}</span>
          </q-td>
        </template>
        <template v-slot:body-cell-activityTxid="props">
          <q-td :props="props">
            <span v-if="props.value" class="text-mono text-caption text-grey-4">{{ shortenTokenId(props.value) }}
              <CopyText :text="props.value" />
            </span>
            <span v-else class="text-grey-6 text-caption">{{ $t('dashboard.activity.noTxid') }}</span>
          </q-td>
        </template>
        <template v-slot:body-cell-activityStatus="props">
          <q-td :props="props">
            <q-badge v-if="props.value === 'success'" color="green-9" text-color="green-3"
              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">{{
                $t('dashboard.activity.statusSuccess') }}</q-badge>
            <q-badge v-else-if="props.value === 'failed'" color="red-9" text-color="red-3"
              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">{{
                $t('dashboard.activity.statusFailed') }}</q-badge>
            <q-badge v-else color="blue-9" text-color="blue-3"
              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">{{
                props.value }}</q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-activityDate="props">
          <q-td :props="props">
            <span class="text-grey-6 text-caption">{{ props.value }}</span>
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'
import { QTableColumn, useQuasar } from 'quasar'
import { shortenTokenId } from 'src/core/utils'
import CopyText from 'components/CopyText.vue'
import { db } from 'src/core/client-db'

const { t } = useI18n()
const $q = useQuasar()

const { wallet } = useWizardConnectWallet()

const activities = ref<any[]>([])
const activityLoading = ref(false)
const activitySearchQuery = ref('')

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

const activityColumns: QTableColumn[] = [
  {
    name: 'activityEvent',
    label: t('dashboard.activity.columnEvent'),
    field: 'event',
    align: 'left',
    sortable: true
  },
  {
    name: 'activityTxid',
    label: t('dashboard.activity.columnTxid'),
    field: 'txid',
    align: 'left',
    sortable: true
  },
  {
    name: 'activityStatus',
    label: t('dashboard.activity.columnStatus'),
    field: 'status',
    align: 'left',
    sortable: true
  },
  {
    name: 'activityDate',
    label: t('dashboard.activity.columnDate'),
    field: 'timestamp',
    align: 'left',
    sortable: true,
    format: (val: number) => new Date(val).toLocaleString()
  }
]

const loadActivities = async () => {
  try {
    activityLoading.value = true
    const records = await db.activity.orderBy('timestamp').reverse().toArray()
    activities.value = records
  } catch (error: any) {
    $q.notify({ type: 'Error', message: t('dashboard.activity.loadError', { message: error.message }) })
  } finally {
    activityLoading.value = false
  }
}

const filteredActivities = computed(() => {
  let rows = activities.value
  if (activitySearchQuery.value) {
    const q = activitySearchQuery.value.toLowerCase()
    rows = rows.filter((r) => {
      const event = r.event?.toLowerCase() || ''
      const txid = r.txid?.toLowerCase() || ''
      return event.includes(q) || txid.includes(q)
    })
  }
  return rows
})

const clearActivities = async () => {
  try {
    await db.activity.clear()
    activities.value = []
  } catch (error: any) {
    $q.notify({ type: 'Error', message: t('dashboard.activity.clearError', { message: error.message }) })
  }
}

onMounted(async () => {
  await loadActivities()
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