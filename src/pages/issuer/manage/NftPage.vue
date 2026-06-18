<template>
  <q-page class="bg-dark-page text-white">
    <div class="row justify-center q-pa-md">
      <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
        <div class="q-mb-md q-px-sm">
          <q-btn flat dense icon="arrow_back" label="Back" color="grey-4" @click="goBack" />
        </div>
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
        <div v-else-if="activeNft && !activeNft.nftType"
          class="bg-dark border-radius-12 q-pa-lg flex flex-center" style="min-height: 200px;">
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
import { onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useRegistryStore } from 'src/stores/registry'
import { useAuthguardStore } from 'src/stores/authguard'
import { useQuasar } from 'quasar'
import SequentialNft from 'src/components/bcmr/SequentialNft.vue'
import ParsableNft from 'src/components/bcmr/ParsableNft.vue'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { db } from 'src/core/client-db'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()

const registryStore = useRegistryStore()
const authguardStore = useAuthguardStore()
const { activeNft } = storeToRefs(registryStore)
const { activeAuthhead } = storeToRefs(authguardStore)
const saveKey = ref(0)

const goBack = () => {
  const returnTo = route.query.returnTo as string | undefined
  if (returnTo) {
    router.push(returnTo)
  } else {
    router.back()
  }
}

const handleSave = async (rawNft: NftType) => {
  const a = activeNft.value
  if (!a || !activeAuthhead.value) return

  const nft = JSON.parse(JSON.stringify(rawNft))

  const existing = await db.nfts
    .where('[contentHash+authbase+timestamp+type]')
    .equals([a.contentHash, a.authbase, a.timestamp, a.commitmentOrBottomAltStack])
    .first()

  if (existing) {

    const status = existing.status === 'published' ? 'modified' : existing.status
    await db.nfts.update(existing.id!, { nft, status })

  } else {
    const status = a.isNew ? 'new' : 'modified'
    await db.nfts.put({
      contentHash: a.contentHash,
      authbase: a.authbase,
      timestamp: a.timestamp,
      category: a.category,
      type: a.commitmentOrBottomAltStack,
      nft,
      status
    })
  }

  saveKey.value++

  $q.notify({ type: 'positive', message: 'NFT saved' })
}

onMounted(async () => {
  const a = activeNft.value
  if (!a) {
    goBack()
    return
  }

  if (!a.nftType) {
    a.nftType = { name: '', description: '' }
    try {
      const result = await registryStore.fetchNftType(a.category, a.commitmentOrBottomAltStack)
      if (result) {
        a.nftType = result
      }
    } catch (e) {
      console.log('Failed to fetch NFT type for', a.category, a.commitmentOrBottomAltStack, e)
    }
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
</style>
