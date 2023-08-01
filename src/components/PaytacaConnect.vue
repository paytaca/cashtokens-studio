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
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import formatAddress from 'src/utils/formatAddress';
import getWalletClass from 'src/utils/getWalletClass';
import useStore from 'src/composables/useStore';
import { UtxoI } from 'mainnet-js';
import detectPaytaca from 'src/utils/detectPaytaca';
defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const router = useRouter()
const { user } = useStore()
const cancelAddressWatch = ref()

onMounted(async () => {
  if (detectPaytaca()) {
    const connected = await window.paytaca.connected()
    if (connected) {
      let connectedAddress = await window.paytaca.address('bch')
      connectedAddress = formatAddress(connectedAddress)
      user.connectedPaytacaAddress = connectedAddress
      user.wallet = await getWalletClass().watchOnly(connectedAddress)
      return
    }
  }
  router.push('/')
})

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address) {
    const WalletClass = getWalletClass()
    user.wallet = await WalletClass.watchOnly(address)
    user.connectedPaytacaWalletBchBalance = String(await user.wallet.getBalance('sat'))
    const userUtxos = await user.wallet.getAddressUtxos()
    storeBalances(userUtxos)
    cancelAddressWatch.value = user.wallet.watchAddress(async () => {
      user.updatingBalances = true
      user.connectedPaytacaWalletBchBalance = await user.wallet?.getBalance('sat') as string
      const userUtxos = await user.wallet?.getAddressUtxos()
      if (userUtxos) {
        storeBalances(userUtxos)
      }
      user.updatingBalances = false
    })
  } else {
    cancelAddressWatch.value()
    router.push('/')
  }
})

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
    dismiss()
    $q.notify({ message: 'Connected', color: 'positive', timeout: 500 })
    user.connectedPaytacaAddress = formatAddress(paytacaConnection.address)
  }
}

const storeBalances = (userUtxos: UtxoI[]) => {
  user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0 && utxo.satoshis > 1000)
  user.fts = userUtxos?.filter((utxo: UtxoI) => utxo.token && utxo.token.amount > 0)
  user.nfts = userUtxos?.filter((utxo: UtxoI) => utxo.token && utxo.token.capability && !utxo.token.amount)
  user.fnfts = userUtxos?.filter((utxo: UtxoI) => utxo.token && utxo.token.capability && utxo.token.amount)
}

const disconnect = async () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await window.paytaca!.disconnect()
  user.connectedPaytacaAddress = ''
  router.push('/')
  cancelAddressWatch.value()
}




</script>
