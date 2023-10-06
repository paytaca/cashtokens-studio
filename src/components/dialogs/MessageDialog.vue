<template>
  <q-dialog ref="messageDialog" v-close-popup @before-hide="onBeforeHide">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold text-center">{{ ui.statusMessageType }}</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="text-center">
          <q-avatar size="5em">
            <q-icon size="2em" :name="icon.name" :color="icon.color"></q-icon>
          </q-avatar>
          <div class="text-center q-px-lg">{{ ui.statusMessage }}</div>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn color="primary" size="lg" v-close-popup>Ok</q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useUI } from 'src/stores/ui';
import { computed, ref } from 'vue';
const ui = useUI()
const messageDialog = ref()
const icon = computed(() => {
  switch (ui.statusMessageType) {
    case 'success':
      return { name: 'check_circle_outline', color: 'green' }
    case 'error':
      return { name: 'error_outline', color: 'negative' }
    case 'warning':
      return { name: 'warning_amber', color: 'warning' }
  }
  return { name: 'info', color: 'secondary' }
})

const onBeforeHide = () => {
  ui.clearStatusMessage()
}
</script>