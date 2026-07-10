<template>
    <div>
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back" color="grey-4"
                        @click="router.push({ path: '/dashboard/#/created' })" />
                </div>
                <q-card flat class="bg-dark q-pa-lg rounded-borders">

                    <div class="flex justify-between items-start">
                        <div class="row items-center q-gutter-x-md q-mb-lg reverse-wrap">
                            <div class="flex no-wrap items-center q-gutter-x-md ">
                                <q-avatar :size="$q.screen.lt.sm ? '5rem' : '8rem'"
                                    class="bg-grey-9 border-radius-8 shadow-1">
                                    <q-img v-if="activeIdentitySnapshot?.uris?.icon"
                                        :src="ipfsToGatewayUrl(activeIdentitySnapshot.uris.icon)!" fit="cover" />
                                    <q-icon v-else name="token" color="primary" size="32px" />
                                </q-avatar>
                                <div class="q-pa-sm q-gutter-y-sm">
                                    <div class="flex items-center q-mt-xs token-symbol">
                                        {{ activeIdentitySnapshot?.token?.symbol || "Unknown" }}
                                    </div>
                                    <div class="text-body2 text-mono text-grey-2 word-break-all ellipsis">
                                        Token ID: {{ $q.screen.lt.md ?
                                            shortenTokenId(activeIdentitySnapshot?.token!.category as
                                                string) : activeIdentitySnapshot?.token!.category }}
                                        <CopyText v-if="activeIdentitySnapshot?.token?.category"
                                            :text="activeIdentitySnapshot?.token?.category" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <q-btn v-if="activeAuthhead" icon="mdi-text-box-edit" :label="$q.screen.gt.xs ? 'Edit' : ''"
                            dense flat color="secondary" @click="toggleWriteMode">
                        </q-btn>
                    </div>

                    <!-- Added dark background helper for contrast with white text -->
                    <nav class="inline-nav bg-dark q-py-sm">
                        <div class="row no-wrap items-center justify-start q-gutter-x-sm">

                            <!-- Navigation Link Tabs -->
                            <q-item v-for="link in navLinks" :key="link.title" clickable v-ripple :to="link.to" exact
                                active-class="inline-item-active"
                                class="inline-item q-px-md q-py-sm rounded-borders text-no-wrap">
                                <!-- Icon Section -->
                                <q-item-section v-if="link.icon" avatar class="inline-icon-section q-mr-sm">
                                    <q-icon :name="link.icon" size="20px" class="inline-icon" />
                                </q-item-section>

                                <!-- Label Section -->
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
        <router-view />

    </div>
</template>

<script setup lang="ts">
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import { shortenTokenId } from 'src/core/utils';
import { useAuthguardStore } from 'src/stores/authguard';
import { useRegistryStore } from 'src/stores/registry';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CopyText from 'src/components/CopyText.vue';

const tab = ref('identity-snapshot')

const { activeIdentitySnapshot } = useRegistryStore()
const { activeAuthhead } = useAuthguardStore()
const route = useRoute()

const router = useRouter()

const navLinks = ref([
    { title: 'Token Identity', caption: 'Overview & analytics', icon: 'dashboard', to: { name: 'view-identity-snapshot', params: route.params, query: route.query } },
    { title: 'NFTs', caption: 'Manage your tasks', icon: 'assignment', to: { name: 'view-identity-snapshot-nfts', params: route.params, query: route.query } },
    { title: 'Registry', caption: 'Collaborate with members', icon: 'people', to: { name: 'view-registry', params: route.params, query: route.query } },
])

const toggleWriteMode = () => {
    console.log('route query', typeof (route.query.write))
    const current = !route.query.write || route.query.write === '0' ? 'view' : 'edit'
    const newMode = current === 'view' ? 'edit' : 'view'
    router.push({
        path: route.path.replace(current, newMode),
        query: {
            ...route.query,
            write: route.query.write == '1' ? 0 : 1
        }
    })
}

</script>



<style scoped>
/* ==========================================================================
   Inline Navigation Component Styles (White Text & Active Underline)
   ========================================================================== */

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