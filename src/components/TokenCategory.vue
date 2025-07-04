<template>
  <q-btn @click.stop="() => copy(tokenId)" size="sm" flat dense no-caps :class="$q.dark.isActive ? '' : 'bg-grey-4'"
    :icon-right="copied && iconRight ? 'done_all' : iconRight || undefined" style="white-space: nowrap;"
    color="warning">
    <q-chip v-if="tokenId" :class="$q.dark.isActive ? '' : 'bg-grey-4'" dense size="md">
      <q-icon v-if="copied && !iconRight" size="xs" name="done_all"
        :color="$q.dark.isActive ? 'warning' : 'grey-10'"></q-icon>
      <div class="ellipsis">
        <span>{{ tokenId.replace(tokenId.substring(5, 60), '...') }}</span>
        <q-tooltip>Copy</q-tooltip>
      </div>
    </q-chip>
    <span v-else :class="$q.dark.isActive ? 'text-grey-8' : ''">
      ---
    </span>
  </q-btn>
</template>
<script setup lang="ts">
import { delay } from 'mainnet-js';
import copyText from 'src/apps/utils/copyText'
import { ref } from 'vue';
defineOptions({ name: 'TokenCategory' })
defineProps<{ tokenId?: string, iconRight?: string }>()
const copied = ref<string>('')
const copy = async (text?: string) => {
  copied.value = 'copied'
  await delay(500)
  copied.value = ''
  copyText(text || '')
}
</script>
