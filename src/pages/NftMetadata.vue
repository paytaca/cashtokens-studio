<template>
  <q-page>
    <div class="row justify-center q-gutter-md">
      <div class="col-xs-12 col-sm-10 col-lg-9  q-pa-lg">
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { NftType, TokenCategory, TokenI, UtxoI } from 'mainnet-js';
import { useUser } from 'src/stores/user';

const router = useRouter()
const route = useRoute()
const user = useUser()
const nft = ref<TokenI>()
const nftMetadata = ref<NftType>()
const tokenMetadata = ref<Omit<TokenCategory, 'nfts'>>()
const authhead = ref<UtxoI>()

onBeforeMount(async () => {
  if (user.wallet) {
    console.log('AUTHHEAD', route.query.authhead)
    const decoded = await user.wallet.util.decodeTransaction(route.query.authhead as string)
    console.log(decoded)

  }

})

</script>
