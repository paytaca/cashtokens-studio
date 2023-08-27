<template>
  <q-btn @click.stop="() => copyText(cashaddr || '...')" size="sm" flat dense no-caps
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">
    <code v-if="cashaddr">{{ cashaddr.replace(cashaddr.substring(15, 40), '...') }}
                          <q-tooltip>Copy</q-tooltip>
                      </code>
    <code v-else :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">{{ '...' }}
                              <q-tooltip>N/A</q-tooltip>
                          </code>
  </q-btn>
</template>
<script setup lang="ts">
import copyText from 'src/app/utils/copyText'
defineProps<{ cashaddr?: string }>()
</script>
