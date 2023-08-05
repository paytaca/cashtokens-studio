<template>
  <div class="row q-my-sm q-mx-sm" @click.stop="user.connectedPaytacaAddress ? disconnect() : connect()">
    <q-btn size="md" icon="img:images/paytaca-128x128.png" class="q-px-md" align="center" stack dense>
      <q-icon v-if="user.connectedPaytacaAddress" name="link" color="positive" size="xs" class="q-py-sm"
        style="width:.15em;height:.10em"></q-icon>
      <q-icon v-else name="link_off" color="negative" size="xs" class="q-py-sm" style="width:.15em;height:.10em"></q-icon>
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
import calcMinerFee from 'src/utils/calcMinerFee';
import CashStudioToken from 'src/models/CashStudioToken';
defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const router = useRouter()
const { user } = useStore()
const watching = ref()

onMounted(async () => {
  if (detectPaytaca()) {
    const connected = await window.paytaca.connected()
    if (connected) {
      user.connectedPaytacaAddress = formatAddress(await window.paytaca.address('bch'))
      watchAddress(user.connectedPaytacaAddress)
      return
    }
  }
  router.push('/')
})

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address && !watching.value) {
    watchAddress(address)
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
    user.wallet = await getWalletClass().watchOnly(user.connectedPaytacaAddress)
    user.connectedPaytacaWalletBchBalance = String(await user.wallet.getBalance('sat'))
    const userUtxos = await user.wallet.getAddressUtxos()
    storeBalances(userUtxos)
  }
}

const storeBalances = (userUtxos: UtxoI[]) => {
  user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
    return !utxo.token &&
      utxo.vout === 0 &&
      utxo.satoshis > CashStudioToken.DEFAULT_GENESIS_COST
  }).slice(0, 5)
}

const watchAddress = async (address: string) => {
  user.wallet = await getWalletClass().watchOnly(address)
  console.log('Watching address')
  watching.value = user.wallet.watchAddress(async () => {
    console.log('WATCHER TRIGGERED')
    user.updatingBalances = true
    user.connectedPaytacaWalletBchBalance = await user.wallet?.getBalance('sat') as string
    const userUtxos = await user.wallet?.getAddressUtxos()

    if (userUtxos) {
      storeBalances(userUtxos)
    }
    user.updatingBalances = false
  })

}


const disconnect = async () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  user.connectedPaytacaAddress = ''
  if (watching.value) {
    watching.value()
    watching.value = null
    console.log('CANCELLED WATCH', watching.value)
  }
  await window.paytaca!.disconnect()
  router.push('/')

}




</script>
