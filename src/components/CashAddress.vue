<template>
  <q-btn @click.stop="() => copyText(cashaddr || '...')" size="sm" flat dense no-caps
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'">
    <template v-if="cashaddr">
      <q-chip v-if="type === 'cash'" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" dense size="sm">
        <q-avatar>
          <img src="https://chipnet.imaginary.cash/img/logo/bch.svg">
        </q-avatar>
        <div class="ellipsis">
          <code>{{ cashaddr.replace(cashaddr.substring(15, 40), '...') }}</code>
          <q-tooltip>{{ toolTip || 'Copy Cash Address' }}</q-tooltip>
        </div>
      </q-chip>
      <q-chip v-else-if="type === 'token'" icon="token" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" dense
        size="sm">
        <div class="ellipsis">
          <code>{{ cashaddr.replace(cashaddr.substring(15, 40), '...') }}</code>
          <q-tooltip>{{ toolTip || 'Copy Token Address' }}</q-tooltip>
        </div>
      </q-chip>
      <q-chip v-else :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" dense size="sm">
        <div class="ellipsis">
          <code>{{ cashaddr.replace(cashaddr.substring(15, 40), '...') }}</code>
          <q-tooltip>{{ toolTip || 'Copy Token Address' }}</q-tooltip>
        </div>
      </q-chip>
    </template>
  </q-btn>
</template>
<script setup lang="ts">
import copyText from 'src/app/utils/copyText'
defineProps<{ cashaddr?: string, type?: 'token' | 'cash', toolTip?: string }>()
</script>
