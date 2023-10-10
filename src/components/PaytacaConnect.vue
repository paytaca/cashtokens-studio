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
import { EventBus, useQuasar } from 'quasar'
import { ref, onMounted, watch, inject, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { UtxoI, Wallet } from 'mainnet-js';
import formatAddress from 'src/app/utils/formatAddress';
import getWalletClass from 'src/app/utils/getWalletClass';
import { useUser } from 'src/stores/user';
import { ADDRESS_WATCHER_TRIGGERED, DEFAULT_TOKEN_VALUE } from 'src/app/constants'
import { Watchtower } from 'src/app/Watchtower';

defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const router = useRouter()
const user = useUser()
const watching = ref()
const eventBus = inject<EventBus>('eventBus')
const watchtower = ref<Watchtower>(new Watchtower())

onMounted(async () => {
  if (window.paytaca) {
    const connected = await window.paytaca.connected()
    if (connected) {
      user.walletAddress = formatAddress(await window.paytaca.address('bch'))
      user.wallet = await getWalletClass().watchOnly(user.walletAddress)
      user.walletTokenAddress = user.wallet.getTokenDepositAddress()
      // user.walletBchBalance = String(await user.wallet.getBalance('sat'))
      user.walletBchBalance = (await watchtower.value.fetchBchBalance(user.walletAddress))?.spendable
      const userUtxos = await user.wallet.getAddressUtxos()
      filterAndStoreGenesisInputs(userUtxos)
      watchAddress(user.walletAddress)
      if (!watching.value && user.walletAddress) {
        watchAddress(user.walletAddress)
      }
      return
    }
  }
  router.push('/')
})

watch(() => user.walletAddress, async (address) => {
  if (address) {

    if (!watching.value) {
      watchAddress(address)
    }
    user.walletBchBalance = (await watchtower.value.fetchBchBalance(address))?.spendable
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
    // user.walletBchBalance = String(await user.wallet.getBalance('sat'))
    user.walletBchBalance = (await watchtower.value.fetchBchBalance(user.walletAddress))?.spendable

    const userUtxos = await user.wallet.getAddressUtxos()
    filterAndStoreGenesisInputs(userUtxos)
  }
}

const filterAndStoreGenesisInputs = (userUtxos: UtxoI[]) => {
  user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
    return Boolean(!utxo.token) &&
      utxo.vout === 0 &&
      utxo.satoshis >= DEFAULT_TOKEN_VALUE
  }).slice(0, 5)
}

const watchAddress = async (address: string) => {
  user.wallet = await getWalletClass().watchOnly(address)
  watching.value = user.wallet.watchAddress(async () => {
    eventBus?.emit(ADDRESS_WATCHER_TRIGGERED)
    user.updatingBalances = true
    // user.walletBchBalance = await user.wallet?.getBalance('sat') as string
    user.walletBchBalance = (await watchtower.value.fetchBchBalance(address))?.spendable
    // user.authchainIdentities = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)
    const userUtxos = await user.wallet?.getAddressUtxos()
    if (userUtxos) {
      filterAndStoreGenesisInputs(userUtxos)
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

// onMounted(() => {
//   if (!watching.value && user.walletAddress) {
//     watchAddress(user.walletAddress)
//   }
// })



</script>
