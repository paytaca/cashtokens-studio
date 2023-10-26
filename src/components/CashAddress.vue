<template>
  <q-btn @click.stop="() => copy(cashaddr)" size="sm" flat dense no-caps
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" color="warning"
    :icon-right="copied && iconRight ? 'done_all' : iconRight || undefined">
    <template v-if="cashaddr">
      <q-chip v-if="type === 'cash'" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" dense size="sm">
        <q-icon v-if="copied" name="done_all"></q-icon>
        <q-avatar v-else>
          <img src="https://chipnet.imaginary.cash/img/logo/bch.svg">
        </q-avatar>
        <div class="ellipsis">
          <code>{{ cashaddr.replace(cashaddr.substring(15, 43), '...') }}</code>
          <q-tooltip>{{ toolTip || 'Copy Cash Address' }}</q-tooltip>
        </div>
      </q-chip>
      <q-chip v-else-if="type === 'token'" :icon="copied ? 'done_all' : 'token'"
        :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" dense size="sm">
        <div class="ellipsis">
          <code>{{ cashaddr.replace(cashaddr.substring(15, 43), '...') }}</code>
          <q-tooltip>{{ toolTip || 'Copy Token Address' }}</q-tooltip>
        </div>
      </q-chip>
      <q-chip v-else :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" dense size="sm">
        <q-icon v-if="copied && !iconRight" name="done_all"></q-icon>
        <div class="ellipsis">
          <code>{{ cashaddr.replace(cashaddr.substring(15, 43), '...') }}</code>
          <q-tooltip>{{ toolTip || 'Copy Token Address' }}</q-tooltip>
        </div>
      </q-chip>
    </template>
  </q-btn>
</template>
<script setup lang="ts">
import { delay } from 'mainnet-js';
import copyText from 'src/app/utils/copyText'
import { ref } from 'vue';
defineProps<{ cashaddr?: string, type?: 'token' | 'cash', toolTip?: string, iconRight?: string }>()
const copied = ref<string>('')
const copy = async (text?: string) => {
  copied.value = 'copied'
  await delay(500)
  copied.value = ''
  copyText(text || '')
}
</script>
