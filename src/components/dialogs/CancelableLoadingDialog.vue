<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
        <q-card class="feature-card">
            <q-card-section class="text-h6 text-center q-pb-none">
                Processing...
            </q-card-section>

            <q-card-section class="q-py-md">
                <q-list dense lines="none">
                    <q-item v-for="(step, index) in steps" :key="index" class="q-py-xs">
                        <q-item-section avatar min-width="30px" class="q-pr-sm">
                            <!-- Pending state -->
                            <q-icon v-if="step.status === 'pending'" name="radio_button_unchecked" color="grey-5"
                                size="20px" />
                            <!-- Running state -->
                            <q-spinner v-else-if="step.status === 'running'" color="primary" size="20px" />
                            <!-- Completed state -->
                            <q-icon v-else-if="step.status === 'done'" name="check_circle" color="positive"
                                size="20px" />
                            <!-- Failed state -->
                            <q-icon v-else-if="step.status === 'failed'" name="cancel" color="negative" size="20px" />
                        </q-item-section>

                        <q-item-section :class="{
                            'text-weight-bold text-primary': step.status === 'running',
                            'text-grey-6': step.status === 'done',
                            'text-grey-5': step.status === 'pending'
                        }">
                            {{ step.label }}
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>

            <q-card-actions align="center" class="q-pt-none">
                <q-btn flat label="Cancel Process" color="negative" @click="onDialogCancel" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from 'quasar'

defineProps({
    steps: {
        type: Array,
        required: true
    }
})

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent()
</script>