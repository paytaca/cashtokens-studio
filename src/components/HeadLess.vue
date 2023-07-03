<template><span></span></template>

<script setup lang="ts">
import { onMounted } from 'vue';
import detectPaytaca from 'src/utils/detectPaytaca';
import formatAddress from 'src/utils/formatAddress';
import { useUserStore } from 'src/stores/user';


defineOptions({ name: 'HeadLess' })
const user = useUserStore()

onMounted(async () => {
  
  if(detectPaytaca()) {
    const connected = await window.paytaca.connected()
    if (connected) {
      let connectedAddress = await window.paytaca.address('bch')
      connectedAddress = formatAddress(connectedAddress)
      user.connectedPaytacaAddress = connectedAddress
      
    }
  }
})


</script>