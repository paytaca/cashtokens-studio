<template>
    <q-page class="splash-container flex flex-center no-scroll">
        <div class="ambient-glow glow-1"></div>
        <div class="ambient-glow glow-2"></div>
        <div class="text-center z-top select-none content-box">
            <div class="logo-wrapper">
                <div class="logo-pulse-ring"></div>
                <div class="logo-pulse-ring delay-1"></div>
                <img src="/images/cts_icon.png" class="logo-image" alt="CTS Logo" />
            </div>

            <h1 class="text-h4 text-weight-bold text-white tracking-wide text-glow">
                Initializing </h1>
            <div class="progress-wrapper">
                <q-linear-progress indeterminate rounded color="indigo-4" track-color="transparent"
                    class="custom-progress" />
            </div>
        </div>
    </q-page>
</template>

<style lang="scss" scoped>
.splash-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: radial-gradient(circle at 50% 45%, #242936 0%, #0d0f13 70%, #050608 100%) !important;
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

.logo-image {
    width: 4.5rem;
    height: 4.5rem;
    object-fit: contain;
    filter: drop-shadow(0 0 15px rgba(63, 81, 181, 0.6));
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

.content-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.progress-wrapper {
    position: relative;
    width: 240px;
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    margin-top: 2rem;
}

.custom-progress {
    height: 4px;
    filter: drop-shadow(0 0 4px rgba(92, 107, 192, 0.8));
}


.tracking-wide {
    letter-spacing: 0.15em;
    margin-top: 2rem;
    margin-bottom: 0;
}

.letter-spacing-2 {
    letter-spacing: 0.08em;
    font-weight: 300;
}

.text-glow {
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.15);
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