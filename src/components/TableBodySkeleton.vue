<template>
  <tbody class="text-center">
    <tr v-for="r, ri in rowCount" :key="'cts-tbs-' + ri">
      <td v-for="c, ci in colCount" :key="'cts-tbs-' + ci"><q-skeleton type="text">{{ c }}{{ r }}</q-skeleton></td>
    </tr>
    <tr v-if="caption">
      <td :colspan="colCount">{{ caption }}</td>
    </tr>
  </tbody>
</template>
<script setup lang="ts">
defineProps<{ caption?: string, colCount: string, rowCount: string }>()
</script>
