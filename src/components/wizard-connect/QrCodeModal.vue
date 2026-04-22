<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide" transition-show="scale" transition-hide="scale">
        <q-card class="wz-modal-card q-pa-lg">
            <div class="row items-center justify-between q-mb-md">
                <div class="text-h6 text-weight-bold text-white">Connect Wallet</div>
                <q-btn icon="close" flat round dense v-close-popup class="text-grey-5" />
            </div>

            <div class="wz-qr-wrapper flex flex-center">
                <div class="wz-qr-container">
                    <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="wz-qr-image" />
                    <!-- <q-icon name="mdi-wizard-hat" class="wz-qr-icon" size="lg" /> -->
                </div>
            </div>
            <div class="#test-container"></div>

            <div class="text-center q-mt-md">
                <div class="text-subtitle2 text-grey-4">Scan with your wallet</div>
                <q-btn outline rounded class="q-mt-sm wz-copy-btn" label="Copy to Clipboard" icon="content_copy"
                    @click="copyToClipboard(contents)" />
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { copyToClipboard, useDialogPluginComponent } from 'quasar';
import QRCode from 'qrcode';
import { ref, onMounted } from 'vue';

const props = defineProps({
    contents: { type: String, required: true },
});

const qrDataUrl = ref('');

defineEmits([...useDialogPluginComponent.emits]);
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const onCopy = () => {
    onDialogOK();
};

onMounted(async () => {
    try {
        // QRCode.toCanvas(props.contents, { errorCorrectionLevel: 'H' }, function (err, canvas) {
        //     if (err) throw err

        //     var container = document.getElementById('#test-container')
        //     container.appendChild(canvas)
        // })
        qrDataUrl.value = await QRCode.toDataURL(props.contents, {
            width: 260,
            margin: 0,
            color: {
                dark: '#1c7d43',
                light: '#ffffff',
            },
            dotsOptions: {
                type: 'rounded',
            },
            cornersSquareOptions: {
                type: 'rounded',
                color: '#1c7d43',
            },
            cornersDotOptions: {
                type: 'dot',
                color: '#1c7d43',
            },
        });
        console.log('qrdataurl', qrDataUrl.value)
    } catch (err) {
        console.error('Failed to generate QR code:', err);
    }
});
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
}

.wz-qr-container {
    width: 240px;
    height: 320px;
    position: relative;
    aspect-ratio: 1;
    display: flex;
    padding-top: 1em;
    padding-bottom: 1em;
    align-items: center;
    justify-content: center;
}

.wz-qr-image {
    // width: 100%;
    // height: 100%;
    border-radius: 8px;
}

.wz-qr-icon {
    position: absolute;
    width: 48px;
    height: 48px;
    background: #141414;
    border-radius: 50%;
    padding: 8px;
    color: #1c7d43;
}

.wz-copy-btn {
    color: #47a1ff !important;
    text-transform: none;
    font-weight: 600;
}
</style>
