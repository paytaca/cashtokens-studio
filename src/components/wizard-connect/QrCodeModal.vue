<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide" transition-show="scale" transition-hide="scale">
        <q-card class="wz-modal-card q-pa-lg">
            <div class="row items-center justify-between q-mb-md">
                <div class="text-h6 text-weight-bold text-white">{{ title }}</div>
                <q-btn icon="close" flat round dense v-close-popup class="text-grey-5" />
            </div>

            <div class="wz-qr-wrapper flex flex-center">
                <qr-code class="wz-qr" :contents="contents" module-color="#1c7d43"
                    position-ring-color="#13532d" position-center-color="#70c559" />
            </div>

            <div class="text-center q-mt-md">
                <div class="text-subtitle2 text-grey-4">{{ subtitle }}</div>
                <q-btn outline rounded class="q-mt-sm wz-copy-btn" :label="copyLabel" icon="content_copy"
                    @click="copyToClipboard(contents)" />
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { copyToClipboard, useDialogPluginComponent } from 'quasar';

defineProps({
    contents: { type: String, required: true },
    title: { type: String, default: 'Connect Wallet' },
    subtitle: { type: String, default: 'Scan with your wallet' },
    copyLabel: { type: String, default: 'Copy to Clipboard' },
});

defineEmits([...useDialogPluginComponent.emits]);
const { dialogRef, onDialogHide } = useDialogPluginComponent();
</script>

<style lang="scss">
.wz-modal-card {
    background: #141414 !important;
    border-radius: 20px !important;
    width: 360px;
    max-width: 90vw;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.wz-qr-wrapper {
    background: white;
    border-radius: 25px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    padding: 1em;
}

.wz-qr {
    display: block;
    width: 240px;
    height: 240px;
}

.wz-copy-btn {
    color: #47a1ff !important;
    text-transform: none;
    font-weight: 600;
}
</style>
