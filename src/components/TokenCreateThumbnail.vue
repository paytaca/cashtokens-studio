<template>
  <q-btn class=token-thumbnail color="primary col-sm-3 col-md-2 items-center" @click="router.push('/token/create')">
    <q-icon name="add" size="lg"></q-icon><span>Create New Token</span>
  </q-btn>
</template>
<style lang="scss" scoped>
// .token-thumbnail {
//   cursor: pointer;
//   width: 10em;
//   height: 10em;
// }

// .token-thumbnail:hover {
//   background-color: lighten($primary, 50);
// }

// .q-dark.token-thumbnail:hover {
//   background-color: lighten($dark, 5);
// }

// @media (max-width: $breakpoint-xs-max) {
//   .token-thumbnail {
//     min-width: 10em;
//     min-height: 10em;
//   }
// }
</style>


<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
defineOptions({ name: 'TokenCreateThumbnail' })
defineProps(['path'])
</script>
