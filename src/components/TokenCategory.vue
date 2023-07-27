<template>
  <q-btn @click.stop="() => copyText(tokenId)" flat dense rounded>
    <code
      :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">{{ tokenId.replace(tokenId.substring(5, 60), '...') }}<q-tooltip>Click to copy</q-tooltip></code>
  </q-btn>
</template>
<script setup lang="ts">
import copyText from 'src/utils/copyText'
defineOptions({ name: 'TokenCategory' })
defineProps<{ tokenId: string }>()
</script>
