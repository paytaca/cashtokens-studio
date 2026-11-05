<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" :label="$t('tokenProfilePage.back')" color="grey-4"
                        @click="goBack" />
                </div>

                <q-card v-if="!category" flat class="bg-dark q-pa-lg rounded-borders">
                    <div class="text-grey-4">{{ $t('tokenProfilePage.missingCategory') }}</div>
                </q-card>

                <TokenProfile v-else :profile="profile" :loading="loading" :error="error">
                    <template v-slot:actions>
                        <q-btn flat dense round icon="refresh" color="grey-4" :loading="loading"
                            :aria-label="$t('tokenProfilePage.refresh')" @click="refresh" />
                    </template>
                </TokenProfile>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TokenProfile from 'src/components/TokenProfile.vue'
import { useTokenProfile } from 'src/composables/useTokenProfile'

defineOptions({ name: 'TokenProfilePage' })

const route = useRoute()
const router = useRouter()

const category = computed(() => String(route.params.category ?? ''))
const { profile, loading, error, refresh } = useTokenProfile(category)

const goBack = () => router.back()
</script>
