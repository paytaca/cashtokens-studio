<template>
  <span @click.stop="paytacaConnectDisconnect" stack dense>
    <q-btn v-if="variant === 'icon'">
      <div class="row justify-center text-center q-py-xs">
        <div class="col-xs-12">
          <q-avatar rounded size="md">
            <q-img src="images/paytaca_icon.png"></q-img>
          </q-avatar>
        </div>
      </div>
      <q-badge floating :color="user.walletAddress && user.walletType == 'paytaca' ? 'green' : 'red'" rounded></q-badge>
    </q-btn>

    <q-avatar v-else rounded style="width: 250px; height: 100px">
      <q-img v-if="$q.dark.isActive" src="images/paytaca_dark.png"></q-img>
      <q-img v-else src="images/paytaca_light.png"></q-img>
    </q-avatar>
  </span>
</template>

<script setup lang="ts">
import { EventBus, useQuasar } from 'quasar'
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useUser } from 'src/stores/user';
import { Watchtower } from 'src/app/Watchtower';
import { usePaytacaConnect } from 'src/composables/usePaytacaConnect';

defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const user = useUser()
const paytacaConnect = usePaytacaConnect()

defineProps<{ variant?: 'icon' | 'icon-text' }>()

const paytacaConnectDisconnect = async () => {
  if (user.walletAddress && user.walletType === 'paytaca') {
    await paytacaConnect.paytacaDisconnect()
    user.walletType = undefined
    user.walletAddress = ''
    user.walletTokenAddress = ''
    user.wallet = undefined
    user.transactionSigner = undefined
  } else {
    await paytacaConnect.paytacaConnect()

    user.walletType = 'paytaca'
    user.walletTokenAddress = paytacaConnect.paytacaWalletTokenAddress.value
    user.walletAddress = paytacaConnect.paytacaWalletAddress.value
    user.wallet = paytacaConnect.paytacaWallet.value
    user.transactionSigner = paytacaConnect.paytacaTransactionSigner
  }
}

// const loadWalletBchBalance = async (address: string) => {
//   if (address) {
//     await delay(3000)
//     try {
//       const balance = await watchtower.value.fetchBchBalance(address)
//       user.walletBchBalance = balance?.balance
//     } catch (error) {
//       user.walletBchBalance = await user.wallet?.getBalance('bch') as string
//     }
//   }
// }

// const connect = async () => {
//   const dismiss = $q.notify({ spinner: true, message: 'Connecting Paytaca® wallet', color: 'info', timeout: 0 })
//   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//   let paytacaConnection = await window.paytaca!.connect()
//   if (paytacaConnection.connected) {
//     if (!paytacaConnection.address.startsWith('bitcoincash')) {
//       $q.notify({ message: 'Please select a bitcoin cash address', color: 'negative', timeout: 1500 })
//       dismiss()
//       return
//     }
//     dismiss()
//     $q.notify({ message: 'Connected', color: 'positive', timeout: 500 })
//     user.walletAddress = formatAddress(paytacaConnection.address)

//     user.wallet = await getWalletClass().watchOnly(user.walletAddress)
//     user.walletTokenAddress = user.wallet.getTokenDepositAddress()
//     user.walletType = 'paytaca'
//     // user.walletBchBalance = String(await user.wallet.getBalance('sat'))
//     // user.walletBchBalance = (await watchtower.value.fetchBchBalance(user.walletAddress))?.spendable
//     const userUtxos = await user.wallet.getAddressUtxos()
//     filterAndStoreGenesisInputs(userUtxos)
//     await loadWalletBchBalance(user.walletAddress)
//   }
// }

// const filterAndStoreGenesisInputs = (userUtxos: UtxoI[]) => {
//   user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
//     return Boolean(!utxo.token) &&
//       utxo.vout === 0 &&
//       utxo.satoshis >= DEFAULT_TOKEN_VALUE
//   }).slice(0, 5)
// }



// const watchAddress = async (address: string) => {
//   user.wallet = await getWalletClass().watchOnly(address)
//   watching.value = user.wallet.watchAddress(async () => {
//     user.updatingBalances = true
//     // user.walletBchBalance = await user.wallet?.getBalance('bch') as string
//     // const balance = await watchtower.value.fetchBchBalance(address)
//     // user.walletBchBalance = (await watchtower.value.fetchBchBalance(address))?.spendable
//     // user.authchainIdentities = await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet)

//     const userUtxos = await user.wallet?.getAddressUtxos()
//     if (userUtxos) {
//       filterAndStoreGenesisInputs(userUtxos)
//     }
//     eventBus?.emit(ADDRESS_WATCHER_TRIGGERED)
//     await loadWalletBchBalance(address)
//     user.updatingBalances = false

//   })
// }


// const disconnect = async () => {
//   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//   user.walletAddress = ''
//   user.wallet = undefined
//   if (watching.value) {
//     watching.value() // stop watching wallet ddress
//     watching.value = null
//   }
//   await window.paytaca!.disconnect()
//   router.push('/')

// }

// watch(() => connected.value, async (c) => {
//   if (c) {
//     user.walletAddress = formatAddress(await window.paytaca.address('bch'))
//     user.wallet = await getWalletClass().watchOnly(user.walletAddress)
//     user.walletTokenAddress = user.wallet.getTokenDepositAddress()
//     // user.walletBchBalance = String(await user.wallet.getBalance('bch'))
//     // user.walletBchBalance = (await watchtower.value.fetchBchBalance(user.walletAddress))?.spendable
//     const userUtxos = await user.wallet.getAddressUtxos()
//     filterAndStoreGenesisInputs(userUtxos)
//     watchAddress(user.walletAddress)
//     if (!watching.value && user.walletAddress) {
//       watchAddress(user.walletAddress)
//     }
//     await loadWalletBchBalance(user.walletAddress)
//   } else {
//     user.walletAddress = ''
//     if (watching.value) {
//       watching.value()
//       watching.value = null
//     }
//   }
// })

// watch(() => user.walletAddress, async (address) => {
//   if (address) {
//     if (!watching.value) {
//       watchAddress(address)
//     }
//     // user.walletBchBalance = (await watchtower.value.fetchBchBalance(address))?.spendable
//     user.wallet = await getWalletClass().watchOnly(address)
//     user.walletBchBalance = String(await user.wallet.getBalance('bch'))

//   } else {
//     router.push('/')
//   }
// })

// onMounted(async () => {
//   if (window.paytaca) {
//     connected.value = await window.paytaca.connected()
//     if (connected.value) {
//       return
//     }
//     router.push('/')
//   }
//   router.push('/')
// })


</script>
