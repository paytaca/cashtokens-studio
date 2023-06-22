<template>
  <div>
    <q-btn
      size="xl"
      round
      color="primary"
      icon="img:images/paytaca-128x128.png"
      @click.stop="connected ? disconnect(): connect()"
    >{{ connected ? 'Disconnect': 'Connect' }}</q-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useUserStore } from 'stores/user';
import formatAddress from 'src/utils/formatAddress';

export default defineComponent({
  name: 'PaytacaConnect',
  data(){
    return {
      connected: false
    }
  },
  setup(props){
    const user = useUserStore()
    return {
      user
    }
  },
  methods: {
    async connect(){
      let paytacaConnection = await window.paytaca!.connect()
      if(!paytacaConnection.connected) {
          return
      }
      if (!paytacaConnection.address.startsWith('bitcoincash')) {
        return
      } 
      this.user.connectedPaytacaAddress = formatAddress(paytacaConnection.address)
      this.connected = true
    },
    async disconnect(){
      await window.paytaca!.disconnect()
      this.user.connectedPaytacaAddress = ''
      this.connected = false
    },
  },
  
  

})
</script>