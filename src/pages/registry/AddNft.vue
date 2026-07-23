<template>
  <q-page class="bg-dark-page text-white">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-md-8 q-my-lg">
        <div class="bg-dark border-radius-12 q-pa-lg">
          <q-card v-if="nft" flat class="bg-dark q-mt-lg">
            <q-card-title class="flex justify-start q-pa-lg">
              <h6 class="q-my-xs">Add NFT</h6>
            </q-card-title>
            <div class="q-pa-lg">
              <SequentialNft v-if="!route.query.bytecode" :key="'seq-' + saveKey"
                v-model:commitment="commitmentOrBottomAltStack" v-model:nft="nft" :allow-edit="true" @save="onSaveClick"
                @close="goBack" />
              <ParsableNft v-else :key="'pars-' + saveKey" :bottomAltStack="commitmentOrBottomAltStack"
                v-model:nft="nft" :allow-edit="true" @save="onSaveClick" :bytecode="route.query.bytecode as string"
                @close="goBack" />
            </div>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import SequentialNft from 'src/components/bcmr/SequentialNft.vue'
import ParsableNft from 'src/components/bcmr/ParsableNft.vue'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import { useRoute, useRouter } from 'vue-router'
import { commitmentToSequenceNumber, createNftTypeTemplate, sequenceNumberToCommitment } from 'src/core/bcmr/utils'
import { NftCollectionType } from 'src/core/bcmr'

const props = defineProps<{
  lastKnownType?: string
  tokenSymbol?: string
  collectionType?: string
}>()

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const saveKey = ref(0)


const nft = ref<NftType>()
const commitmentOrBottomAltStack = ref<string>('')

const goBack = () => {
  const returnTo = route.query.returnTo as string | undefined
  if (returnTo) {
    router.push({ path: returnTo, query: route.query })
  } else {
    router.back()
  }
}

const onSaveClick = () => {
  console.log('saving', nft, commitmentOrBottomAltStack)
}

onMounted(async () => {

  console.log('@commitmentOrBottomAltStack last', props.lastKnownType)
  if ((!props.collectionType || props.collectionType === NftCollectionType.sequential) && props.lastKnownType) {
    const nextSequenceNumber = (commitmentToSequenceNumber(props.lastKnownType) as bigint) + 1n
    commitmentOrBottomAltStack.value = sequenceNumberToCommitment(nextSequenceNumber)
    console.log('@commitmentOrBottomAltStack', commitmentOrBottomAltStack.value)
  }

  nft.value = createNftTypeTemplate({
    commitmentOrBottomAltStackHex: commitmentOrBottomAltStack.value,
    tokenSymbol: props.tokenSymbol,
    collectionType: props.collectionType as NftCollectionType || NftCollectionType.sequential
  })
  console.log('nft.value', nft.value)
})

</script>

<style scoped lang="scss">
.border-radius-12 {
  border-radius: 12px;
}
</style>
