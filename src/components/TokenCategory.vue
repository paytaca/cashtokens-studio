<template>
  <q-btn @click.stop="() => copyText(tokenId || '...')" size="sm" flat dense no-caps
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">
    <code v-if="tokenId">{{ tokenId.replace(tokenId.substring(5, 60), '...') }}
                  <q-tooltip>Copy Token ID</q-tooltip>
              </code>
    <code v-else :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">{{ '...' }}
                      <q-tooltip>N/A</q-tooltip>
                  </code>
  </q-btn>
</template>
<script setup lang="ts">
import copyText from 'src/utils/copyText'
defineOptions({ name: 'TokenCategory' })
defineProps<{ tokenId?: string }>()
</script>
