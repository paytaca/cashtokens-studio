<template>
  <q-btn color="primary col-sm-3 col-md-2 items-center" @click="router.push('/token/create')">
    <q-icon name="add" size="lg"></q-icon><span>Create New Token</span>
  </q-btn>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
defineOptions({ name: 'TokenCreateThumbnail' })
defineProps(['path'])
</script>
