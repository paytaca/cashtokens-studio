<template>
  <div class="q-my-sm q-mx-sm">
    <q-btn
      size="md"
      color="accent"
      icon="img:images/paytaca-128x128.png"
      @click.stop="connected ? disconnect(): connect()"
      align="center"
      stack
    >
    <div class="row">
      <div class="col">
        <!-- {{ connected ? 'Disconnect': 'Connect' }} -->
          <q-icon v-if="connected" name="link_off" size="xs"></q-icon>
          <q-icon v-else name="link" size="xs"></q-icon>
      </div>
    </div>
    </q-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useUserStore } from 'stores/user';
import { useUIStore } from 'stores/ui';
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
    const ui = useUIStore()
    return {
      user,
      ui
    }
  },
  methods: {
    async connect(){
      const ui = useUIStore()
      ui.busy({text: 'Connecting Paytaca', type: 'info'})
      let paytacaConnection = await window.paytaca!.connect()
      if(!paytacaConnection.connected) {
          ui.idle()
          return
      }
      if (!paytacaConnection.address.startsWith('bitcoincash')) {
        return
      } 
      this.user.connectedPaytacaAddress = formatAddress(paytacaConnection.address)
      this.connected = true
      ui.idle()
    },
    async disconnect(){
      await window.paytaca!.disconnect()
      this.user.connectedPaytacaAddress = ''
      this.connected = false
    },
  },
  
  

})
</script>