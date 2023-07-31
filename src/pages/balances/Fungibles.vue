<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <q-page>
    <div class="row justify-left q-gutter-md q-ma-md">
      <q-card v-for="ft, i in fungibles" :key="i" class="token-card col-xs-12 col-sm-6 col-md-4 col-lg-2">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span><strong>Token </strong></span>{{ i }}</q-toolbar-title>
        </q-toolbar>
        <q-card-section>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Id: </span>
            <span class="token-id text-weight-thin">{{
              ft.token?.tokenId.replace(ft.token?.tokenId.substring(8, ft.token?.tokenId.length - 4), '...') }}
            </span>
          </div>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Amount: </span><span>{{ ft.token?.amount }}</span>
          </div>
          <div class="row justify-left items-center q-gutter-md">
            <span>Source: </span><span>{{ ft.source }}</span>
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn color="primary"
            @click="$router.push(`/token/view?tokenId=${ft.token!.tokenId}&creator=${user.connectedPaytacaAddress}`)">View
            Details</q-btn>
        </q-card-actions>
      </q-card>
      <q-card class="token-card col-xs-12 col-sm-6 col-md-4 col-lg-2" style="font-size:xx-large;cursor:pointer"
        @click="router.push('/token/create')">
        <q-toolbar>
          <q-skeleton type="QAvatar" />
          <q-toolbar-title><q-skeleton type="text" /></q-toolbar-title>
        </q-toolbar>
        <q-card-section class="justify-center">
          + Create New
        </q-card-section>
      </q-card>
      <!-- {{createdFts}} -->
    </div>
  </q-page>
</template>
<style scoped lang="scss">
.token-id {
  background-color: $grey-10;
  border-radius: 25px;
  padding: .5em;
}

.token-card {
  max-width: 20em;
}
</style>
<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
import { UtxoI } from 'mainnet-js'

import { useRouter } from 'vue-router'
import useStore from 'src/composables/useStore'
import MintingCovenant from 'src/contracts/MintingCovenant'
import getWalletClass from 'src/utils/getWalletClass'

defineOptions({ name: 'FungiblesBalance' })

const router = useRouter()
const { user } = useStore()
const fungibles = ref()
onMounted(async () => {
  // console.log(user.wallet)
  console.log(user.wallet)
  fungibles.value = []
  await loadFtsFromUserWallet()
  await loadFtReservesFromMintingCovenant()
})

const loadFtsFromUserWallet = async () => {

  if (user.wallet) {
    let utxos = (await user.wallet.getAddressUtxos()).filter((u: UtxoI) => Boolean(u.token) && u.token !== undefined).map((u: UtxoI) => ({ ...u, source: 'wallet' }))
    console.log(utxos)
    fungibles.value.push(
      ...utxos
    )
  }
}

const loadFtReservesFromMintingCovenant = async () => {
  if (fungibles.value && fungibles.value.length > 0) {
    fungibles.value.forEach(async (t: UtxoI) => {
      const mintingCovenant = new MintingCovenant(t.token!.tokenId, user.wallet!.network)
      let mcWallet = await getWalletClass().watchOnly(mintingCovenant.contract.getTokenDepositAddress())
      let r = await mcWallet.getAddressUtxos()
      console.log('R', r)
      fungibles.value.push(...r.map((u: UtxoI) => ({ ...u, source: 'minting-covenant' })))
    })
  }
}

</script>
