<template>
  <!-- <q-btn @click.stop="() => copyText(cashaddr || '...')" size="sm" flat dense no-caps
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'"> -->
  <q-btn @click.stop="() => copyText(cashaddr || '...')" size="sm" flat dense no-caps>
    <template v-if="cashaddr">
      <q-chip v-if="type === 'cash'">
        <q-avatar>
          <img src="https://chipnet.imaginary.cash/img/logo/bch.svg">
        </q-avatar>
        <div class="ellipsis">
          {{ cashaddr.replace(cashaddr.substring(15, 40), '...') }}
          <q-tooltip>Copy Cash Address</q-tooltip>
        </div>
      </q-chip>
      <q-chip v-if="type === 'token'" icon="token">
        <div class="ellipsis">
          {{ cashaddr.replace(cashaddr.substring(15, 40), '...') }}
          <q-tooltip>Copy Token Address</q-tooltip>
        </div>
      </q-chip>
      <!-- {{ cashaddr.replace(cashaddr.substring(15, 40), '...') }} -->
      <!-- <q-tooltip>Copy</q-tooltip> -->
    </template>
    <!-- <code v-else :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">{{ '...' }}
                            <q-tooltip>N/A</q-tooltip>
                        </code> -->
  </q-btn>
</template>
<script setup lang="ts">
import copyText from 'src/app/utils/copyText'
defineProps<{ cashaddr?: string, type?: 'token' | 'cash' }>()
</script>
