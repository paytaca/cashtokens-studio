<template>
  <q-page class="bg-dark-page text-white">
    <div class="row justify-center q-pa-md">
      <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
        <div class="q-mb-md q-px-sm row items-center no-wrap q-gutter-x-sm">
          <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="goBack" />
          <q-badge v-if="isAuthKeyNft" color="dark" text-color="secondary" class="styled-authkey-badge">
            <q-icon name="key" size="xs" color="warning" class="q-mr-xs" />
            {{ t('nftPage.authKeyNft.indicator') }}
          </q-badge>
        </div>

        <q-banner v-if="isAuthKeyNft" class="authkey-banner border-radius-12 q-mb-md">
          <template v-slot:avatar>
            <q-icon name="key" color="warning" size="sm" />
          </template>
          <div class="text-weight-bold text-white">{{ t('nftPage.authKeyNft.bannerTitle') }}</div>
          <div class="text-body2 text-grey-4">{{ t('nftPage.authKeyNft.bannerMessage') }}</div>
          <div class="text-body2 text-grey-4 q-mt-xs row items-center q-gutter-x-xs">
            <span>{{ t('nftPage.authKeyNft.lockedTokens') }}:</span>
            <span v-if="lockedTokensLoading" class="text-grey-4">
              {{ t('nftPage.authKeyNft.lockedTokensLoading') }}
            </span>
            <q-badge v-else-if="lockedTokensCount && lockedTokensCount > 0" clickable color="warning"
              text-color="dark" class="cursor-pointer" @click="goToAuthguard">
              {{ lockedTokensCount }}
              <q-icon name="chevron_right" size="xs" class="q-ml-xs" />
            </q-badge>
            <span v-else class="text-grey-4">
              {{ lockedTokensCount ?? t('nftPage.authKeyNft.lockedTokensUnknown') }}
            </span>
          </div>
        </q-banner>
        <div v-if="activeNft?.nftType" class="bg-dark border-radius-12 q-pa-lg">
          <q-card flat class="bg-dark q-mt-lg">
            <div class="q-pa-lg">
              <SequentialNft v-if="!activeNft.bytecode" :key="'seq-' + saveKey"
                :commitment="activeNft.commitmentOrBottomAltStack" v-model:nft="activeNft.nftType"
                :allow-edit="!!activeAuthhead" @save="handleSave" @close="goBack" />
              <ParsableNft v-else :key="'pars-' + saveKey" :bottomAltStack="activeNft.commitmentOrBottomAltStack"
                v-model:nft="activeNft.nftType" :allow-edit="!!activeAuthhead" @save="handleSave"
                :bytecode="activeNft.bytecode" @close="goBack" />
            </div>
          </q-card>
        </div>
        <div v-else-if="activeNft && !activeNft.nftType" class="bg-dark border-radius-12 q-pa-lg flex flex-center"
          style="min-height: 200px;">
          <div class="text-center text-grey-5">
            <q-icon name="info" size="48px" class="q-mb-sm block" />
            <div class="text-caption">No NFT metadata available for this UTXO</div>
          </div>
        </div>
        <div v-else class="flex flex-center q-py-xl">
          <q-spinner color="primary" size="48px" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRegistryStore } from 'src/stores/registry'
import { useAuthguardStore } from 'src/stores/authguard'
import { useQuasar } from 'quasar'
import SequentialNft from 'src/components/bcmr/SequentialNft.vue'
import ParsableNft from 'src/components/bcmr/ParsableNft.vue'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { db } from 'src/core/client-db'
import { createAuthguardContract } from 'src/core/authguard'
import { vmNumberToBigInt } from '@bitauth/libauth'
import { hexToBin } from 'bitauth-libauth-v3'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const registryStore = useRegistryStore()
const authguardStore = useAuthguardStore()
const { activeNft } = storeToRefs(registryStore)
const { activeAuthhead } = storeToRefs(authguardStore)
const saveKey = ref(0)

const isAuthKeyNft = computed(() =>
  activeNft.value?.commitmentOrBottomAltStack === '00' &&
  activeNft.value?.utxo?.token?.nft?.capability === 'none'
)

const lockedTokensCount = ref<number | null>(null)
const lockedTokensLoading = ref(false)

const loadLockedTokensCount = async () => {
  if (!activeNft.value?.category) return
  lockedTokensLoading.value = true
  try {
    const authguard = createAuthguardContract({
      authkeyTokenId: activeNft.value.category,
      network: import.meta.env.VITE_BCH_NETWORK,
    })
    const utxos = await authguard.getUtxos()
    lockedTokensCount.value = utxos?.length ?? 0
  } catch (e) {
    console.log('Failed to load locked tokens', e)
    lockedTokensCount.value = null
  } finally {
    lockedTokensLoading.value = false
  }
}

const sequenceLabel = (commitment: string): string => {
  try {
    const sequence = Number(vmNumberToBigInt(hexToBin(commitment)))
    return Number.isFinite(sequence)
      ? sequence.toString()
      : t('nftPage.authKeyNft.sequenceUnknown')
  } catch (e) {
    return t('nftPage.authKeyNft.sequenceUnknown')
  }
}

const goBack = () => {
  const returnTo = route.query.returnTo as string | undefined
  if (returnTo) {
    router.push(returnTo)
  } else {
    router.back()
  }
}

const goToAuthguard = () => {
  const authkeyUtxo = activeNft.value?.utxo
  if (authkeyUtxo?.token?.category) {
    authguardStore.setActiveAuthhead({
      ...authkeyUtxo,
      authkey: authkeyUtxo,
      isAuthhead: true,
    } as any)
  }
  router.push({
    name: 'view-authguard',
    params: { authkeyCategory: activeNft.value?.category },
  })
}

const handleSave = async (rawNft: NftType) => {
  if (!activeNft.value || !activeAuthhead.value) return

  const nft = JSON.parse(JSON.stringify(rawNft))

  const existing = await db.nfts
    .where('[contentHash+authbase+timestamp+type]')
    .equals([
      activeNft.value.contentHash,
      activeNft.value.authbase,
      activeNft.value.timestamp,
      activeNft.value.commitmentOrBottomAltStack
    ])
    .first()

  if (existing) {
    const status = existing.status === 'published' ? 'modified' : existing.status
    await db.nfts.put({ ...existing, nft, status })

  } else {
    const status = activeNft.value.isNew ? 'new' : 'modified'
    await db.nfts.put({
      contentHash: activeNft.value.contentHash,
      authbase: activeNft.value.authbase,
      timestamp: activeNft.value.timestamp,
      category: activeNft.value.category,
      type: activeNft.value.commitmentOrBottomAltStack,
      nft,
      status
    })
  }

  saveKey.value++
  $q.notify({ type: 'positive', message: 'NFT saved' })
}

onMounted(async () => {
  if (!activeNft.value) {
    goBack()
    return
  }

  const symbol = activeAuthhead.value?.identitySnapshot?.token?.symbol
  const commitment = activeNft.value.commitmentOrBottomAltStack

  let name = t('nftPage.noName')
  if (symbol) {
    name = activeNft.value.bytecode
      ? `${symbol} #${commitment}`
      : `${symbol} #${sequenceLabel(commitment)}`
  }

  activeNft.value.nftType = { name, description: '', uris: {}, extensions: {} }

  if (isAuthKeyNft.value) {
    loadLockedTokensCount()
  }

  try {
    const result = await registryStore.fetchNftType(activeNft.value.category, commitment)
    if (result) {
      activeNft.value.nftType = result
    }
    return
  } catch (e) {
    console.log('No existing NFT Type')
  }
})

onBeforeRouteLeave(() => {
  registryStore.setActiveNft(null)
})

</script>

<style scoped lang="scss">
.border-radius-12 {
  border-radius: 12px;
}

.authkey-banner {
  background: rgba(255, 193, 7, 0.08);
  border: 1px solid rgba(255, 193, 7, 0.35);
}

.styled-authkey-badge {
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
