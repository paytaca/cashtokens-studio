<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :persistent="persistent">
    <q-card class="prompt-dialog-card q-px-sm q-py-md">
      <q-toolbar>
        <q-toolbar-title class="text-h6 text-weight-bold text-white row items-center no-wrap q-gutter-x-sm">
          <q-icon v-if="icon" :name="icon" :color="iconColor" size="sm" />
          <span>{{ title }}</span>
        </q-toolbar-title>
      </q-toolbar>

      <q-card-section class="q-pt-none">
        <div v-if="message" class="text-justify text-grey-4" v-html="message"></div>

        <FormField v-if="expectedPromptOkResponse">
          <label>{{ inputLabel }}</label>
          <q-input v-model="response" outlined dense dark autofocus :placeholder="inputPlaceholder"
            @keyup.enter="canConfirm && onDialogOK(response)" />
        </FormField>
      </q-card-section>

      <q-card-actions class="row justify-end q-gutter-x-sm">
        <q-btn flat no-caps :label="cancelLabel" text-color="grey-5" v-close-popup />
        <q-btn unelevated no-caps :label="okLabel" :color="okColor" :disable="!canConfirm"
          @click="onDialogOK(response)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import FormField from 'src/components/FormField.vue';

const props = withDefaults(defineProps<{
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  /** When set, the user must type this value (case-insensitive) to enable the OK button. */
  expectedPromptOkResponse?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  okLabel?: string;
  okColor?: string;
  cancelLabel?: string;
  persistent?: boolean;
}>(), {
  message: '',
  icon: '',
  iconColor: 'warning',
  expectedPromptOkResponse: '',
  inputLabel: 'Confirmation',
  inputPlaceholder: '',
  okLabel: 'Ok',
  okColor: 'primary',
  cancelLabel: 'Cancel',
  persistent: false,
});

defineEmits([...useDialogPluginComponent.emits]);
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const response = ref('');

const canConfirm = computed(() => {
  if (!props.expectedPromptOkResponse) return true;
  return (
    response.value.trim().toLowerCase() ===
    props.expectedPromptOkResponse.trim().toLowerCase()
  );
});
</script>

<style scoped>
.prompt-dialog-card {
  width: 420px;
  max-width: 92vw;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
