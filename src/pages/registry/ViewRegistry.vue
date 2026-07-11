<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <!-- <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" label="Back" color="grey-4"
                        @click="router.push({ path: '/dashboard/#/created' })" />
                </div> -->
                <q-card v-if="registry" flat class="bg-dark q-pa-lg rounded-borders">
                    <div class="row">
                        <h6 class="q-my-xs">Registry Info</h6>
                        <div class="col-12">
                            <FormField>
                                <label class="form-label">Schema</label>
                                <div
                                    class="text-body2 text-mono text-white bg-grey-9 q-pa-sm border-radius-8 word-break-all">
                                    {{ registry['$schema'] }}
                                </div>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField>
                                <label class="form-label">{{ t('label.registry.version') }}</label>
                                <div class="row q-gutter-x-md">
                                    <q-input v-model="registry.version.major" label="Major" class="col-3" type="number"
                                        outlined disable required></q-input>
                                    <q-input v-model="registry.version.minor" label="Minor" class="col-3" type="number"
                                        outlined disable required></q-input>
                                    <q-input v-model="registry.version.patch" label="Patch" class="col-3" type="number"
                                        outlined disable required></q-input>
                                </div>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField>
                                <label>{{ t('label.registry.latestRevision') }}</label>
                                <q-input :model-value="registry.latestRevision" class="full-width" readonly
                                    outlined></q-input>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField v-if="isOnchainRegistryIdentity">
                                <label>{{ t('label.registry.registryIdentity') }}</label>
                                <q-input v-model="(registry.registryIdentity as string)" readonly autogrow
                                    outlined></q-input>
                            </FormField>
                        </div>
                        <div class="col-12">
                            <FormField v-if="isOnchainRegistryIdentity">
                                <label>{{ t('label.registry.license') }}</label>
                                <q-input v-model="(registry.license as string)" readonly autogrow outlined></q-input>
                            </FormField>
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import { CompactRegistry, db, RegistryRecord } from 'src/core/client-db'
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

const registry = ref<CompactRegistry>()

const registryRecord = useObservable(
    liveQuery(async () => {
        return await db.registry.where({
            registryIdentity: route.query.registryIdentity
        }).first()
    }) as any,
    { initialValue: {} } // Added to prevent runtime template rendering crashes
)

const isOnchainRegistryIdentity = computed(() => {
    return (
        registry.value?.registryIdentity &&
        typeof (registry.value.registryIdentity) === 'string' &&
        registry.value?.registryIdentity !== 'undefined'
    )
})

watch(() => registryRecord.value as RegistryRecord, (newRecord: RegistryRecord) => {
    if (newRecord && Object.keys(newRecord || {}).length > 0 && !registry.value) {
        registry.value = JSON.parse(JSON.stringify(newRecord.registry))
    }
}, { immediate: true })


onMounted(async () => {
    console.log('registry record', registry.value)
    const x = await db.registry.where({
        registryIdentity: route.query.registryIdentity
    }).first()
    console.log('registry record', x)
})

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
