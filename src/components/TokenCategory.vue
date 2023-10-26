<template>
  <q-btn @click.stop="() => copy(tokenId)" size="sm" flat dense no-caps
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'"
    :icon-right="copied && iconRight ? 'done_all' : iconRight || undefined" color="warning"
    style="white-space: nowrap;min-width: 120px">
    <code v-if="tokenId">
                    <q-icon v-if="copied && !iconRight" name="done_all" :color="$q.dark.isActive ? 'grey-1' : 'grey-10'"></q-icon>
                    {{ tokenId.replace(tokenId.substring(5, 60), '...') }}
                    <q-tooltip>Copy Token ID</q-tooltip>
                  </code>
    <code v-else :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-8'">
                    {{ '...' }}
                      <q-tooltip>N/A</q-tooltip>
                  </code>
  </q-btn>
</template>
<script setup lang="ts">
import { delay } from 'mainnet-js';
import copyText from 'src/app/utils/copyText'
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
