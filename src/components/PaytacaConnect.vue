<template>
  <div class="q-my-sm q-mx-sm">
    <q-btn size="md" color="accent" icon="img:images/paytaca-128x128.png"
      @click.stop="user.connectedPaytacaAddress ? disconnect() : connect()" align="center" stack>
      <div class="row">
        <div class="col">
          <!-- {{ connected ? 'Disconnect': 'Connect' }} -->
          <q-icon v-if="user.connectedPaytacaAddress" name="link_off" size="xs"></q-icon>
          <q-icon v-else name="link" size="xs"></q-icon>
          <div><code><sup>{{ user.connectedPaytacaAddress.startsWith('bchtest') ? '[chipnet]' : '' }}</sup></code></div>

        </div>
      </div>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from 'stores/user';
import { useUIStore } from 'stores/ui';
import formatAddress from 'src/utils/formatAddress';
import getWalletClass from 'src/utils/getWalletClass';

defineOptions({ name: 'PaytacaConnect' })
const user = useUserStore()
const ui = useUIStore()
const connected = ref(false)

const connect = async () => {
  ui.busy({ text: 'Connecting Paytaca', type: 'info' })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let paytacaConnection = await window.paytaca!.connect()
  if (paytacaConnection.connected) {
    if (!paytacaConnection.address.startsWith('bitcoincash')) {
      // TODO error
      ui.idle()
      return
    }
    ui.idle()
    user.connectedPaytacaAddress = formatAddress(paytacaConnection.address)
    connected.value = true
    const WalletClass = getWalletClass()
    const wallet = await WalletClass.watchOnly(user.connectedPaytacaAddress)
    user.connectedPaytacaWalletBchBalance = String(await wallet.getBalance('sat'))
  } else {
    ui.idle()
  }
}

const disconnect = async () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await window.paytaca!.disconnect()
  user.connectedPaytacaAddress = ''
  connected.value = false
}

</script>
