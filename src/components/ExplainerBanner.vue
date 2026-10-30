<template>
  <div class="explainer-banner">
    <div class="explainer-banner-text">
      <div class="flex no-wrap items-center q-gutter-x-sm">
        <q-avatar v-if="avatarSrc" rounded size="4em" class="bg-dark shadow-2">
          <img :src="avatarSrc" alt="avatar" />
        </q-avatar>
        <q-avatar v-else-if="icon" rounded text-color="white">
          <q-icon :name="icon" size="xl" />
        </q-avatar>
        <div>
          <div class="flex items-center no-wrap q-gutter-x-sm">
            <div class="text-h6 text-weight-bold text-white">{{ title }}</div>
            <q-btn v-if="explainer" flat dense no-caps text-color="secondary" icon="help_outline" size="sm"
              @click="showExplainer">
              {{ t('info.whatsThis') }}
            </q-btn>
          </div>
          <div v-if="description || $slots.subtitle" class="text-body2 text-grey-4">
            <slot name="subtitle">{{ description }}</slot>
          </div>
        </div>
      </div>
    </div>
    <div v-if="$slots.default" class="explainer-banner-actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';

const props = defineProps<{
  icon?: string;
  avatarSrc?: string;
  title: string;
  description?: string;
  /** i18n key of an explainer text; set to render a "What's this?" button beside the title. */
  explainer?: string;
}>();

const { t } = useI18n();
const $q = useQuasar();

const showExplainer = () => $q.dialog({
  class: ['q-py-sm', 'text-body1', $q.screen.gt.xs ? 'text-justify' : 'text-left'],
  style: 'width: 100%; max-width: min(92vw, 36rem);',
  html: true,
  message: `<div class='scroll' style='max-height: 70vh'>${t(props.explainer!)}</div>`,
});
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
  background: linear-gradient(135deg,
      rgba(36, 41, 54, 0.85) 0%,
      rgba(13, 15, 19, 0.95) 100%);
}

.explainer-banner-text {
  flex: 1 1 auto;
  min-width: 0;
}

.explainer-banner-actions {
  margin-left: auto;
}
</style>
