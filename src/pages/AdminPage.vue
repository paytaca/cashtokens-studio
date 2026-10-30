<template>
    <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
        <div class="q-px-md q-px-md-xl content-container">
            <ExplainerBanner class="q-ma-md"
                :avatarSrc="`https://api.dicebear.com/10.x/voxel-art/svg?tags=animation&seed=aaa`"
                :title="t('dashboard.welcome')">
            </ExplainerBanner>

            <div class="row q-col-gutter-md q-pa-md">
                <q-card clickable flat class="dashboard-section-card cursor-pointer">
                    <q-card-section class="q-pa-lg">
                        <div class="row items-center no-wrap q-gutter-md">
                            Airdrop Beacon Token Contract Address: {{ airdropBeaconContract?.tokenAddress }}
                        </div>
                    </q-card-section>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { onMounted, ref } from 'vue';
import { createAirdropBeaconContract } from 'src/core/airdrop/create-airdrop-beacon-contract';
import { getBeaconNftTokenCategory, isAirdropBeaconConfigured } from 'src/core/airdrop'


const { t } = useI18n()
const airdropBeaconContract = ref()
onMounted(async () => {
    // Guarded: without the env config there is no contract to introspect, and the page shows its
    // "coming soon" banner instead.
    if (!isAirdropBeaconConfigured()) return
    airdropBeaconContract.value = createAirdropBeaconContract({
        beaconTokenCategory: import.meta.env.VITE_AIRDROP_BEACON_TOKEN_CATEGORY,
        beaconAdminId: import.meta.env.VITE_AIRDROP_BEACON_ADMIN_ID,
        network: import.meta.env.VITE_BCH_NETWORK
    })
})

</script>