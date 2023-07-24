<template>
  <q-card class="token-thumbnail" flat bordered>
    <q-card-section>
      <q-skeleton class="text-caption" type="text" />
    </q-card-section>
    <q-separator />
    <q-card-section>
      <q-skeleton type="QAvatar" />
    </q-card-section>
  </q-card>
</template>
<style lang="scss" scoped>
.token-thumbnail {
  cursor: pointer;
  width: 10em;
  height: 10em;
}

.token-thumbnail:hover {
  background-color: lighten($primary, 50);
}

.q-dark.token-thumbnail:hover {
  background-color: lighten($dark, 5);
}

@media (max-width: $breakpoint-xs-max) {
  .token-thumbnail {
    min-width: 10em;
    min-height: 10em;
  }
}
</style>

<script setup lang="ts">
defineOptions({ name: 'TokenThumbnailSkeleton' })
</script>
