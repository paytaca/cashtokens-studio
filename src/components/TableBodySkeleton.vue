<template>
  <tbody class="text-center">
    <tr v-for="ri in rowCount" :key="'cts-tbs-' + ri">
      <td v-for="ci in colCount" :key="'cts-tbs-' + ci"><q-skeleton type="text"></q-skeleton></td>
    </tr>
    <tr v-if="caption">
      <td :colspan="colCount">
        <q-spinner-grid size="xs"></q-spinner-grid> {{ caption }}
      </td>
    </tr>
  </tbody>
</template>
<script setup lang="ts">
defineProps<{ caption?: string, colCount: number, rowCount: number }>()
</script>
