<template>
  <span></span>
</template>

<script setup lang="ts">

import { onMounted, watch } from 'vue';
import detectPaytaca from 'src/utils/detectPaytaca';
import formatAddress from 'src/utils/formatAddress';
import useStore from 'src/composables/useStore'
import getWalletClass from 'src/utils/getWalletClass';

defineOptions({ name: 'HeadLess' })

const { user } = useStore()

onMounted(async () => {

  if (detectPaytaca()) {
    const connected = await window.paytaca.connected()
    if (connected) {
      let connectedAddress = await window.paytaca.address('bch')
      connectedAddress = formatAddress(connectedAddress)
      user.connectedPaytacaAddress = connectedAddress
      user.wallet = await getWalletClass().watchOnly(connectedAddress)
    }
  }
})

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address) {
    user.wallet = await getWalletClass().watchOnly(address)
  }
})


</script>
