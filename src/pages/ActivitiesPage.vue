<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container">
      <ExplainerBanner class="q-my-md" icon="history" :title="$t('dashboard.pageTitle.activities')"
        :description="$t('dashboard.activity.caption')" />

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
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'
import { QTableColumn, useQuasar } from 'quasar'
import { shortenTokenId } from 'src/core/utils'
import CopyText from 'components/CopyText.vue'
import ExplainerBanner from 'src/components/ExplainerBanner.vue'
import { db } from 'src/core/client-db'

const { t } = useI18n()
const $q = useQuasar()

const activities = ref<any[]>([])
const activityLoading = ref(false)
const activitySearchQuery = ref('')

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