<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <!-- <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back" color="grey-4"
                        @click="router.push({ path: '/dashboard/#/created' })" />
                </div> -->
                <q-card v-if="identitySnapshot" flat class="bg-dark q-pa-lg rounded-borders">
                    <!-- <q-card-title class="flex items-center q-gutter-x-sm q-mb-lg justify-between text-grey-6">
                        <div class="q-gutter-x-sm flex items-center"><q-icon name="mdi-information-variant-box"
                                size="sm" /><span class="text-h6 text-weight-bold ">Token Identity
                                Info</span></div>
                        <q-btn icon="mdi-text-box-edit" :label="$q.screen.gt.xs ? 'Edit' : ''" dense flat
                            color="secondary" @click="onEditIdentitySnapshotClick">
                        </q-btn>
                    </q-card-title> -->
                    <div>
                        <!-- <div class="row items-center q-gutter-x-md q-mb-lg">
                            <q-avatar size="80px" class="bg-grey-9 border-radius-8 shadow-1">
                                <q-img v-if="identitySnapshot.uris?.icon"
                                    :src="ipfsToGatewayUrl(identitySnapshot.uris.icon)!" fit="cover" />
                                <q-icon v-else name="token" color="primary" size="32px" />
                            </q-avatar>
                            <div>
                                <div class="flex items-center q-gutter-x-xs q-mt-xs token-symbol">
                                    {{ identitySnapshot.token?.symbol || "Unknown" }}
                                </div>
                                <div class="text-caption">
                                    {{ identitySnapshot.name || 'Unnamed Collection' }}
                                </div>

                            </div>
                            <q-space />
                            <q-btn flat dense round icon="refresh" size="lg" :loading="refreshing" @click="refresh" />
                        </div> -->
                        <div class="row">
                            <h6 class="q-my-xs">Identity</h6>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Name</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.name }}
                                    </div>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Description</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.description }}
                                    </div>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Links <q-icon name="link"></q-icon></label>
                                    <!-- <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.uris }}
                                    </div> -->
                                    <div class="flex q-gutter-x-sm">
                                        <q-btn v-for="key, i in Object.keys(identitySnapshot.uris || {})" :key="i"
                                            color="secondary" no-caps dense flat
                                            :href="ipfsToGatewayUrl(activeAuthhead!.identitySnapshot!.uris![key]!)!"
                                            target="__blank">
                                            <span class="text-capitalize">{{ key }}</span>
                                        </q-btn>
                                    </div>

                                </FormField>
                            </div>
                            <h6 class="q-my-xs">Token</h6>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Category</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.token!.category }}
                                        <CopyText :text="identitySnapshot.token!.category" />
                                    </div>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Symbol</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.token?.symbol }}
                                    </div>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Decimals</label>
                                    <div
                                        class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                        {{ identitySnapshot.token?.decimals }}
                                    </div>
                                </FormField>
                            </div>
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { storeToRefs } from 'pinia'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import CopyText from 'components/CopyText.vue'

import { useAppStore } from 'src/stores/app'
import FormField from 'src/components/FormField.vue'
import { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { db } from 'src/core/client-db'
import { liveQuery } from 'dexie'
import { useObservable } from '@vueuse/rxjs'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const appStore = useAppStore()
const authguardStore = useAuthguardStore()
const registryStore = useRegistryStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { loadAuthkeys, updateActiveAuthhead } = authguardStore
const {
    manager,
    wallet,
} = useWizardConnectWallet()

const identitySnapshot = ref<IdentitySnapshot>()

const identitySnapshotRecord = useObservable(
    liveQuery(async () => {
        return await db.registryIdentitySnapshot.where({
            category: route.query.authbase
        }).first()
    }) as any,
    { initialValue: activeAuthhead.value?.identitySnapshot } // Added to prevent runtime template rendering crashes
)


watch(() => identitySnapshotRecord.value, (newRecord) => {
    if (newRecord && !identitySnapshot.value) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord))
    }
}, { immediate: true })

</script>

<style scoped lang="scss">
.border-radius-8 {
    border-radius: 8px;
}

.border-radius-12 {
    border-radius: 12px;
}

.word-break-all {
    word-break: break-all;
}

.text-mono {
    font-family: 'Courier New', Courier, monospace;
}

.link-style {
    color: #7c4dff;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
        color: #9c7cff;
    }
}
</style>
