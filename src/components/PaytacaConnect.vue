<template>
  <div class="row q-my-sm q-mx-sm">
    <q-btn size="md" icon="img:images/paytaca-128x128.png" class="q-px-md"
      @click.stop="user.connectedPaytacaAddress ? disconnect() : connect()" align="center" stack dense rounded>
      <q-icon v-if="user.connectedPaytacaAddress" name="link" color="positive" size="xs" round
        style="width:.15em;height:.10em"></q-icon>
      <q-icon v-else name="link_off" color="negative" size="xs"></q-icon>
    </q-btn>

  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import formatAddress from 'src/utils/formatAddress';
import getWalletClass from 'src/utils/getWalletClass';
import useStore from 'src/composables/useStore';
defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const router = useRouter()
const { user } = useStore()
const connected = ref(false)

const connect = async () => {
  const dismiss = $q.notify({ spinner: true, message: 'Connecting Paytaca® wallet', color: 'info', timeout: 0 })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let paytacaConnection = await window.paytaca!.connect()
  if (paytacaConnection.connected) {
    if (!paytacaConnection.address.startsWith('bitcoincash')) {
      $q.notify({ message: 'Please select a bitcoin cash address', color: 'negative', timeout: 1500 })
      dismiss()
      return
    }

    user.connectedPaytacaAddress = formatAddress(paytacaConnection.address)
    connected.value = true
    const WalletClass = getWalletClass()
    const wallet = await WalletClass.watchOnly(user.connectedPaytacaAddress)
    user.connectedPaytacaWalletBchBalance = String(await wallet.getBalance('sat'))
    user.wallet = wallet
  }
  dismiss()
}

const disconnect = async () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await window.paytaca!.disconnect()
  user.connectedPaytacaAddress = ''
  connected.value = false
  router.push('/')
}



</script>
