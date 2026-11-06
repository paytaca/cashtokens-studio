<template>
    <q-badge v-if="props.tag" :color="RELEASE_TAG_COLORS[props.tag]" :floating="floating"
        style="z-index: -10;opacity: .8;">
        <span class="text-caption">{{ $t(`badge.releaseTag.${props.tag}`) }}</span>
    </q-badge>
</template>

<script setup lang="ts">
import type { ReleaseTag } from 'src/settings'

const props = defineProps<{
    tag?: ReleaseTag
    floating?: boolean
}>()

const RELEASE_TAG_COLORS: Record<ReleaseTag, string> = {
    experimental: 'grey-9',
    alpha: 'orange-9',
    beta: 'blue-8',
    rc: 'teal-8',
    new: 'green-8',
}
</script>
