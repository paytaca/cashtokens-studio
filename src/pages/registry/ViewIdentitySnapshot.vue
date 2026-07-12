<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <q-card v-if="identitySnapshot" flat class="bg-dark q-pa-lg rounded-borders">
                    <div>
                        <div class="row">
                            <h6 class="q-my-xs">Identity</h6>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Name</label>
                                    <q-input :model-value="identitySnapshot.name" disable outlined></q-input>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Description</label>
                                    <q-input :model-value="identitySnapshot.description" disable outlined></q-input>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Links <q-icon name="link"></q-icon></label>

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
                                    <q-input :model-value="identitySnapshot.token!.category" disable outlined>
                                        <template v-slot:append>
                                            <CopyText :text="identitySnapshot.token!.category" />
                                        </template>
                                    </q-input>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Symbol</label>
                                    <q-input :model-value="identitySnapshot.token!.symbol" disable outlined></q-input>
                                </FormField>
                            </div>
                            <div class="col-12">
                                <FormField>
                                    <label for="">Decimals</label>
                                    <q-input :model-value="identitySnapshot.token!.decimals" disable outlined></q-input>
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
import { onMounted, ref, watch } from 'vue'
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
import { db, IdentitySnapshotRecord } from 'src/core/client-db'
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
    { initialValue: {} } // Added to prevent runtime template rendering crashes
)

watch(() => identitySnapshotRecord.value as IdentitySnapshotRecord, (newRecord: IdentitySnapshotRecord) => {
    if (newRecord && Object.keys(newRecord || {}).length > 0 && !identitySnapshot.value) {
        identitySnapshot.value = JSON.parse(JSON.stringify(newRecord.identitySnapshot))
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
