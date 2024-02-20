<template>
  <q-btn @click.stop="() => copy(text)" size="sm" :icon="copied ? 'done_all' : 'content_copy'"
    :class="copied ? 'text-primary' : ''" flat dense no-caps></q-btn>
</template>
<script setup lang="ts">
import { delay } from 'mainnet-js';
import copyText from 'src/app/utils/copyText'
import { ref } from 'vue';
defineProps<{ text: string }>()
const copied = ref<string>('')
const copy = async (text?: string) => {
  copied.value = 'copied'
  await delay(500)
  copied.value = ''
  copyText(text || '')
}
</script>
