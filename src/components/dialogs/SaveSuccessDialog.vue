<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" transition-hide="fade" transition-show="fade"
    transition-duration="600">
    <q-card class="q-dialog-plugin q-pa-md rounded-borders" flat>
      <q-card-section>
        <div class="row justify-center">
          <q-avatar size="5em" class="col-12">
            <q-icon size="2em" name="check" color="positive"></q-icon>
          </q-avatar>
          <div class="col-12 text-center text-wrap q-py-sm"
            style="max-width:100%;text-wrap: wrap;overflow-wrap: normal;">
            {{ message }}
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDialogPluginComponent } from 'quasar'

const props = withDefaults(defineProps<{
  message?: string,
  okLabel?: string
}>(), {
  message: 'Changes saved successfully.',
  okLabel: 'Save'
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

onMounted(() => {
  setTimeout(() => onDialogOK(), 1000)
})
</script>
