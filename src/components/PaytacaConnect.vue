<template>
  <!-- <div class="row q-my-sm q-mx-sm" @click.stop="user.walletAddress ? disconnect() : connect()">
    <q-btn size="md" icon="img:images/paytaca-128x128.png" class="q-px-md" align="center" stack dense>
      <q-icon v-if="user.walletAddress" name="link" color="positive" size="xs" class="q-py-sm"
        style="width:.15em;height:.10em"></q-icon>
      <q-icon v-else name="link_off" color="negative" size="xs" class="q-py-sm" style="width:.15em;height:.10em"></q-icon>
    </q-btn>
  </div> -->
  <q-btn icon="img:images/paytaca-128x128.png" class="q-px-md" align="center"
    @click.stop="user.walletAddress ? disconnect() : connect()" stack dense>
    <q-icon v-if="user.walletAddress" name="link" color="positive" size="xs" class="q-py-sm"
      style="width:.15em;height:.10em"></q-icon>
    <q-icon v-else name="link_off" color="negative" size="xs" class="q-py-sm" style="width:.15em;height:.10em"></q-icon>
  </q-btn>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { UtxoI, Wallet } from 'mainnet-js';
import formatAddress from 'src/app/utils/formatAddress';
import getWalletClass from 'src/app/utils/getWalletClass';
import { useUser } from 'src/stores/user';
import { DEFAULT_TOKEN_VALUE } from 'src/app/constants'
import { AuthchainIdentity } from 'src/app';

defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const router = useRouter()
const user = useUser()
const watching = ref()

onMounted(async () => {
  if (window.paytaca) {
    const connected = await window.paytaca.connected()
    if (connected) {
      user.walletAddress = formatAddress(await window.paytaca.address('bch'))
      user.wallet = await getWalletClass().watchOnly(user.walletAddress)
      user.walletTokenAddress = user.wallet.getTokenDepositAddress()
      user.walletBchBalance = String(await user.wallet.getBalance('sat'))
      const userUtxos = await user.wallet.getAddressUtxos()
      storeBalances(userUtxos)
      watchAddress(user.walletAddress)
      return
    }
  }
  router.push('/')
})

watch(() => user.walletAddress, async (address) => {
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
    user.walletAddress = formatAddress(paytacaConnection.address)

    user.wallet = await getWalletClass().watchOnly(user.walletAddress)
    user.walletTokenAddress = user.wallet.getTokenDepositAddress()
    user.walletBchBalance = String(await user.wallet.getBalance('sat'))
    const userUtxos = await user.wallet.getAddressUtxos()
    storeBalances(userUtxos)
  }
}

const storeBalances = (userUtxos: UtxoI[]) => {
  user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
    return Boolean(!utxo.token) &&
      utxo.vout === 0 &&
      utxo.satoshis >= DEFAULT_TOKEN_VALUE
  }).slice(0, 5)
}

const watchAddress = async (address: string) => {
  user.wallet = await getWalletClass().watchOnly(address)
  watching.value = user.wallet.watchAddress(async () => {
    console.log('Watching address')
    user.updatingBalances = true
    user.walletBchBalance = await user.wallet?.getBalance('sat') as string
    user.authchainIdentities = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    const userUtxos = await user.wallet?.getAddressUtxos()

    if (userUtxos) {
      storeBalances(userUtxos)
    }
    user.updatingBalances = false
  })

}


const disconnect = async () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  user.walletAddress = ''
  if (watching.value) {
    watching.value()
    watching.value = null
  }
  await window.paytaca!.disconnect()
  router.push('/')

}




</script>
