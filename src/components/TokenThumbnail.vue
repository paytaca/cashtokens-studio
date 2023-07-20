<template>
  <div class="q-pa-md">
    <div class="q-gutter-md row items-start">
      <q-card flat bordered style="width: 250px">
        <q-card-section>
          <span class="text-caption">{{ name }}</span>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-avatar>
            <img :src="icon" />
          </q-avatar>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>
<script setup lang="ts">

defineOptions({ name: 'TokenThumbnail' })
const props = defineProps(['icon', 'symbol', 'name'])
</script>
