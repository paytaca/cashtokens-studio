<template>
    <q-page class="connect-skeleton flex flex-center">
        <div v-if="!showQR" class="skeleton-wrapper">
            <div class="ambient-glow glow-1"></div>
            <div class="ambient-glow glow-2"></div>
            <q-card class="skeleton-card" flat dark>
                <q-card-section class="flex flex-center q-pt-lg">
                    <div class="logo-wrapper">
                        <div class="logo-pulse-ring"></div>
                        <div class="logo-pulse-ring delay-1"></div>
                        <q-icon name="mdi-wizard-hat" size="48px" color="indigo-4" />
                    </div>
                </q-card-section>
                <q-card-section class="text-center q-pb-lg">
                    <div class="text-h6 text-weight-bold text-white">Initializing Wizard Connect...</div>
                    <div class="progress-wrapper">
                        <q-linear-progress indeterminate rounded color="indigo-4" track-color="transparent"
                            class="custom-progress" />
                    </div>
                </q-card-section>
            </q-card>
            {{ showQR }}
        </div>

        <WizardConnectQRDialog v-else :show="showQR" :qr-uri="(qrUri as string)" :uri="(uri as string)"
            :onClose="closeQR" @update:show="onQRUpdateShow" />
    </q-page>
</template>

<script setup lang="ts">

import { inject, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { WizardConnectQRDialog } from 'wizardconnect-vue'
const { showQR, qrUri, uri, connect, state } = inject('wizardConnectWallet') as any
const closeQR = () => { showQR.value = false }
const onQRUpdateShow = (val: boolean) => { if (!val) showQR.value = false }

const router = useRouter()

watch(() => state.value, (newState, oldState) => {
    if (newState === 'connected') {
        router.push({ name: 'dashboard' })
    }
    if (newState === 'idle') {
        connect()
    }
})

onMounted(() => {
    if (state.value !== 'connecting') {
        connect()
    }
})

</script>

<style lang="scss" scoped>
.connect-skeleton {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: radial-gradient(circle at 50% 45%, #242936 0%, #0d0f13 70%, #050608 100%) !important;
}

.skeleton-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.skeleton-card {
    width: 384px;
    background: transparent !important;
    box-shadow: none;
}

.ambient-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.15;
    pointer-events: none;

    &.glow-1 {
        top: -10%;
        left: -10%;
        width: 50vw;
        height: 50vw;
        background: #3f51b5;
    }

    &.glow-2 {
        bottom: -10%;
        right: -10%;
        width: 60vw;
        height: 60vw;
        background: #00e5ff;
    }
}

.logo-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(10px);
}

.logo-pulse-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 1px solid rgba(92, 107, 192, 0.4);
    border-radius: 24px;
    animation: ripple 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;

    &.delay-1 {
        animation-delay: 1.5s;
    }
}

.progress-wrapper {
    position: relative;
    width: 240px;
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    margin: 2rem auto 0;
}

.custom-progress {
    height: 4px;
    filter: drop-shadow(0 0 4px rgba(92, 107, 192, 0.8));
}

@keyframes ripple {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    100% {
        transform: scale(1.4);
        opacity: 0;
    }
}
</style>