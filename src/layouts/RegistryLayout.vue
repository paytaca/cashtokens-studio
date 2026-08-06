<template>
    <div>
        <template v-if="wallet?.initializing">
            <div class="row justify-center">
                <div class="col-xs-12 col-sm-10 col-md-8">
                    <div class="q-mb-md q-px-sm">
                        <q-skeleton type="QBtn" width="100px" height="36px" class="bg-grey-9 rounded-borders" />
                    </div>
                    <q-card flat class="bg-dark q-pa-lg rounded-borders">
                        <div class="row justify-end q-mb-md">
                            <q-skeleton type="QBtn" width="60px" height="32px" class="bg-grey-9 rounded-borders" />
                        </div>
                        <div class="flex no-wrap items-center q-gutter-x-md">
                            <q-skeleton type="circle" :size="$q.screen.lt.sm ? '5rem' : '8rem'" class="bg-grey-9" />
                            <div class="q-pa-sm q-gutter-y-sm">
                                <q-skeleton type="text" width="140px" height="28px" class="bg-grey-9" />
                                <q-skeleton type="text" width="220px" height="16px" class="bg-grey-9" />
                            </div>
                        </div>
                        <div class="row no-wrap q-gutter-x-sm q-py-lg">
                            <q-skeleton v-for="i in 4" :key="i" type="rect" width="90px" height="36px"
                                class="bg-grey-9 rounded-borders" />
                        </div>
                    </q-card>
                </div>
            </div>
        </template>
        <template v-else>
            <div class="row justify-center">
                <div class="col-xs-12 col-sm-10 col-md-8">
                    <div class="q-mb-md q-px-sm">
                        <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="router.back()" />
                    </div>
                    <q-card flat class="bg-dark q-pa-lg rounded-borders">
                        <div class="row justify-end">
                            <q-btn v-if="activeAuthhead && route.name !== 'view-authhead'" icon="mdi-text-box-edit"
                                :label="$q.screen.gt.xs ? 'Edit' : ''" dense flat color="secondary"
                                @click="toggleWriteMode">
                            </q-btn>
                        </div>
                        <div class="flex justify-between items-start">
                            <div class="flex no-wrap items-center q-gutter-x-md">
                                <q-avatar :size="$q.screen.lt.sm ? '5rem' : '8rem'"
                                    class="bg-grey-9 border-radius-8 shadow-1">
                                    <q-img v-if="activeIdentitySnapshot?.uris?.icon"
                                        :src="ipfsToGatewayUrl(activeIdentitySnapshot.uris.icon)!" fit="cover" />
                                    <q-icon v-else name="token" color="primary" size="32px" />
                                </q-avatar>
                                <div class="q-pa-sm q-gutter-y-sm" style="min-width: 0">
                                    <div class="flex items-center q-mt-xs token-symbol">
                                        {{ activeIdentitySnapshot?.token?.symbol || "Unknown" }}
                                    </div>
                                    <div class="text-mono text-grey-2 ellipsis">
                                        Token ID: {{ $q.screen.lt.lg ?
                                            shortenTokenId(activeIdentitySnapshot?.token?.category as
                                                string) : activeIdentitySnapshot?.token?.category }}
                                        <CopyText v-if="activeIdentitySnapshot?.token?.category"
                                            :text="activeIdentitySnapshot?.token?.category" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <nav class="inline-nav bg-dark q-py-lg">
                            <div class="row no-wrap items-center justify-start q-gutter-x-sm">
                                <q-item v-for="link in navLinks" :key="link.title" clickable v-ripple :to="link.to"
                                    exact active-class="inline-item-active"
                                    class="inline-item q-px-md q-py-sm rounded-borders text-no-wrap">
                                    <q-item-section v-if="link.icon" avatar class="inline-icon-section q-mr-sm">
                                        <q-icon :name="link.icon" size="20px" class="inline-icon" />
                                    </q-item-section>
                                    <q-item-section class="inline-text-section">
                                        <span class="nav-text-wrapper">
                                            <q-item-label class="text-weight-medium text-body2">
                                                {{ link.title }}
                                            </q-item-label>
                                        </span>
                                    </q-item-section>
                                </q-item>
                            </div>
                        </nav>
                    </q-card>
                </div>
            </div>
        </template>
        <router-view />
    </div>
</template>

<script setup lang="ts">
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import { shortenTokenId } from 'src/core/utils';
import { useAuthguardStore } from 'src/stores/authguard';
import { useRegistryStore } from 'src/stores/registry';
import { computed, inject, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CopyText from 'src/components/CopyText.vue';
import { storeToRefs } from 'pinia';
import { stringify } from '@bitauth/libauth';

const registryStore = useRegistryStore()
const { activeIdentitySnapshot } = storeToRefs(registryStore)
const authguardStore = useAuthguardStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { wallet } = inject('wizardConnectWallet') as any

const route = useRoute()
const router = useRouter()
const mode = ref<'edit' | 'view'>('view')

const navModeLinks = {
    view: [
        { title: 'Reserves', caption: 'Overview & analytics', icon: 'mdi-bank', to: { name: 'view-authhead', query: route.query } },
        { title: 'Token Identity', caption: 'Overview & analytics', icon: 'dashboard', to: { name: 'view-identity-snapshot', params: route.params, query: route.query } },
        { title: 'NFTs', caption: 'Manage your tasks', icon: 'assignment', to: { name: 'view-identity-snapshot-nfts', params: route.params, query: route.query } },
        { title: 'Registry', caption: 'Collaborate with members', icon: 'people', to: { name: 'view-registry', params: route.params, query: route.query } },
    ],
    edit: [
        { title: 'Reserves', caption: 'Overview & analytics', icon: 'mdi-bank', to: { name: 'view-authhead', query: route.query } },
        { title: 'Token Identity', caption: 'Overview & analytics', icon: 'dashboard', to: { name: 'edit-identity-snapshot', params: route.params, query: route.query } },
        { title: 'NFTs', caption: 'Manage your tasks', icon: 'assignment', to: { name: 'edit-identity-snapshot-nfts', params: route.params, query: route.query } },
        { title: 'Registry', caption: 'Collaborate with members', icon: 'people', to: { name: 'edit-registry', params: route.params, query: route.query } },
    ]
}

const navLinks = computed(() => {
    let links = mode.value === 'edit' ? navModeLinks.edit : navModeLinks.view
    if (!activeIdentitySnapshot.value) {
        links = [...links]
        links.splice(2, 2)
    }

    return links.map(link => ({
        ...link,
        to: { ...link.to, query: { ...route.query }, params: { ...route.params } }
    }))
})

const toggleWriteMode = () => {
    const paths = route.path.split('/')
    const currentMode = paths[paths.length - 1]
    mode.value = route.path.endsWith('view') ? 'edit' : 'view'
    router.push({
        path: route.path.replace(currentMode as string, mode.value),
        query: {
            ...route.query,
        }
    })
}

watch(() => activeAuthhead.value, (value) => {
    if (value) {
        mode.value = 'edit'
    }
}, { immediate: true })

</script>

<style scoped>
.inline-nav {
    background: transparent;
    width: 100%;
    overflow-x: auto;
    /* Horizontal scrolling on small screens */
    white-space: nowrap;
}

/* Base link styling - Text starts as a muted grey-white */
.inline-item {
    color: rgba(255, 255, 255, 0.6);
    min-height: auto;
    /* Overrides default q-item height */
    padding: 8px 16px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    .inline-icon {
        color: rgba(255, 255, 255, 0.5);
        transition: color 0.25s ease, transform 0.25s ease;
    }

    /* Hover State - Becomes full white */
    &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);

        .inline-icon {
            color: #ffffff;
            transform: translateY(-1px);
        }

        /* Expand underline to 100% text width on hover */
        .nav-text-wrapper::after {
            width: 100%;
        }
    }
}

/* Text wrapper handles exact width alignment and bottom padding spacing */
.nav-text-wrapper {
    position: relative;
    display: inline-block;
    padding-bottom: 6px;
    /* Spacing to push the underline lower */

    /* Underline structural baseline */
    &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        /* Shifts the line slightly below the text padding boundary */
        left: 0;
        width: 0;
        height: 3px;
        background-color: var(--q-primary);
        /* Keeps the green/primary underline color */
        transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 2px;
    }
}

/* Active State styling - Pure stark white text, no primary color injection */
.inline-item-active {
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.08) !important;

    .inline-icon {
        color: #ffffff !important;
    }

    /* Force full text-width highlight when active */
    .nav-text-wrapper::after {
        width: 100% !important;
    }
}

/* Fix Quasar defaults for tight horizontal spacing */
.inline-icon-section {
    min-width: auto !important;
    padding-right: 0 !important;
}

.inline-text-section {
    padding: 0 !important;
    overflow: visible !important;
    /* Prevents underline clipping */
}
</style>