<template>
  <div class="explainer-banner">
    <q-avatar v-if="avatarSrc" rounded size="52px" class="bg-dark shadow-2">
      <img :src="avatarSrc" alt="avatar" />
    </q-avatar>
    <q-avatar
      v-else-if="icon"
      rounded
      color="primary"
      text-color="white"
      size="52px"
    >
      <q-icon :name="icon" size="26px" />
    </q-avatar>
    <div class="explainer-banner-text">
      <div class="text-h6 text-weight-bold text-white">{{ title }}</div>
      <div v-if="description || $slots.subtitle" class="text-body2 text-grey-4">
        <slot name="subtitle">{{ description }}</slot>
      </div>
    </div>
    <div v-if="$slots.default" class="explainer-banner-actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string;
  avatarSrc?: string;
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.explainer-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(36, 41, 54, 0.85) 0%,
    rgba(13, 15, 19, 0.95) 100%
  );
}

.explainer-banner-text {
  flex: 1 1 auto;
  min-width: 0;
}

.explainer-banner-actions {
  margin-left: auto;
}
</style>
