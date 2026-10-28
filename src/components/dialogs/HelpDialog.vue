<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin q-pa-md">
      <q-card-section>
        <div class="row justify-center">
          <q-avatar size="5em" class="col-12">
            <q-icon size="2em" name="help" color="info"></q-icon>
          </q-avatar>
          <p class="col-12 text-justify text-wrap q-py-sm q-py-sm"
            style="max-width:100%;text-wrap: wrap;overflow-wrap: normal;">
            <span v-html="message"></span>
          </p>
        </div>
      </q-card-section>
      <q-card-actions align="center">
        <q-btn text-color="primary" size="lg" label="OK" @click="ok" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
defineProps<{
  message: string
}>()

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

function ok() {
  onDialogOK()
}

</script>