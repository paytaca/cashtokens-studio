<template>
  <div class="row justify-around q-ma-md">
    <q-card v-for="ft, i in createdFts" :key="i" class="col-auto" @click="$router.push(`/ft/view?tokenId=${ft.token!.tokenId}&creator=${user.connectedPaytacaAddress}`)">
      <div class="text-h6">Token {{ i }}</div>
      <q-avatar >
        <img src="https://chipnet.imaginary.cash/img/logo/bch.svg">
      </q-avatar>
      <div>{{ ft.token?.tokenId }}</div>
      <div>{{ ft.token?.amount }}</div>
      <div>
        <q-btn>Update BCMR</q-btn>
      </div>
    </q-card>
    <!-- {{createdFts}} -->
  </div>
</template>
<script setup lang="ts">

import { ref, onMounted, watch} from 'vue'
// import { sha256, utf8ToBin } from '@bitauth/libauth';
// import { hexToBin, OpReturnData } from 'mainnet-js'
// import JsonEditor from 'vue3-ts-jsoneditor'
import { UtxoI } from 'mainnet-js'

// import { Registry as BcmrRegistry} from 'src/interfaces/bcmr-v2.schema';
import getWalletClass from 'src/utils/getWalletClass';
import { useUserStore } from 'src/stores/user';
// import bcmrTemplate from 'src/resources/bcmr';
// import { useUIStore } from 'src/stores/ui';
// import TokenBcmrBasicForm from 'components/TokenBcmrBasicForm.vue'
import createAuthChainGuardContract from 'src/utils/createAuthChainGuardContract';

defineOptions({name: 'BrowseFt'})

const user = useUserStore()
const createdFts = ref([] as UtxoI[])

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address.length > 0) {
    loadCreatedFts(address)
  } else {
    createdFts.value = [] as UtxoI[]
  }
})

onMounted(async () => {
  if (user.connectedPaytacaAddress) {
    loadCreatedFts(user.connectedPaytacaAddress)
  }
})

// methods
const loadCreatedFts = async (creatorAddress: string) => {
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(creatorAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)
  const contract = createAuthChainGuardContract({ownerPubKey: creatorWalletPkh, network: creatorWallet.network})
  console.log('CREATOR', creatorWallet.getDepositAddress())
  const contractWallet = await WalletClass.watchOnly(contract.getDepositAddress())
  const txs = (await contractWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(utxo.token) && utxo.token!.amount > 0 );
  console.log(txs)
  createdFts.value = txs
}

</script>