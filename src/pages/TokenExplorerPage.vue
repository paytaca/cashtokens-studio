<template>
    <q-page class="bg-dark-page text-white">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
                <div class="q-mb-md q-px-sm">
                    <q-btn flat dense icon="arrow_back" :label="$t('tokenExplorerPage.back')" color="grey-4"
                        @click="goBack" />
                </div>

                <q-card flat class="bg-dark rounded-borders" :class="category ? 'q-pa-md q-mb-lg' : 'q-pa-lg'">
                    <template v-if="!category">
                        <div class="text-h6 text-weight-medium q-mb-xs">
                            {{ $t('tokenExplorerPage.searchTitle') }}
                        </div>
                        <div class="text-caption text-grey-5 q-mb-md">
                            {{ $t('tokenExplorerPage.searchHint') }}
                        </div>
                    </template>

                    <q-form class="row q-col-gutter-sm flex no-wrap items-center">
                        <div class="col-12 col-sm q-gutter-y-sm q-py-md">
                            <label>Token Category</label>
                            <q-input v-model="categoryInput" dark bg-color="dark-2"
                                :placeholder="$t('tokenExplorerPage.categoryPlaceholder')"
                                :aria-label="$t('tokenExplorerPage.categoryPlaceholder')" :autofocus="!category"
                                autocapitalize="off" autocomplete="off" spellcheck="false" outlined rounded>

                                <template v-if="categoryInput" v-slot:append>
                                    <q-btn round icon="close" :aria-label="$t('tokenExplorerPage.clearSearch')"
                                        @click="clearSearch" />
                                </template>
                                <template v-if="categoryInput" v-slot:after>
                                    <q-btn no-caps type="submit" icon="search" :disable="!categoryInput.trim()"
                                        size="lg" rounded @click.stop="submitSearch" />
                                </template>
                            </q-input>
                        </div>
                    </q-form>
                </q-card>

                <TokenProfile v-if="category" :profile="profile" :loading="loading" :error="error">
                    <template v-slot:actions>
                        <q-btn flat dense round icon="refresh" color="grey-4" :loading="loading"
                            :aria-label="$t('tokenExplorerPage.refresh')" @click="refresh" />
                    </template>
                </TokenProfile>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TokenProfile from 'src/components/TokenProfile.vue'
import { useTokenProfile } from 'src/composables/useTokenProfile'

defineOptions({ name: 'TokenExplorerPage' })

const route = useRoute()
const router = useRouter()

/** The category currently being explored, or an empty string when the route has none. */
const category = computed(() => String(route.params.category ?? '').trim().toLowerCase())
const { profile, loading, error, refresh } = useTokenProfile(category)

const categoryInput = ref(category.value)

// Navigation (context menu, back/forward, a submitted search) is the source of truth for the field.
watch(category, (value) => {
    categoryInput.value = value
})

const submitSearch = () => {
    const value = categoryInput.value.trim().toLowerCase()
    if (!value) return

    categoryInput.value = value
    if (value === category.value) {
        // Re-submitting the loaded category refreshes it rather than pushing a duplicate route.
        refresh()
        return
    }

    router.push({ name: 'token-explorer', params: { category: value } })
}

/** Clearing the field returns to the explorer landing state so another category can be searched. */
const clearSearch = () => {
    categoryInput.value = ''
    if (category.value) router.push({ name: 'token-explorer' })
}

const goBack = () => router.back()
</script>
