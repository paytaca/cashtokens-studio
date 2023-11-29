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
      <span v-if="!paytacaIsInstalled" class="text-caption">
        Not Installed! <a @click.stop target="_blank"
          href="https://chromewebstore.google.com/detail/paytaca/pakphhpnneopheifihmjcjnbdbhaaiaa">Install?</a>
      </span>
    </q-avatar>
  </span>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref, onMounted } from 'vue';
import { useUser } from 'src/stores/user';
import { usePaytacaConnect } from 'src/composables/usePaytacaConnect';
import { delay } from 'mainnet-js';

defineOptions({ name: 'PaytacaConnect' })

const $q = useQuasar()
const user = useUser()
const paytacaConnect = usePaytacaConnect()
const paytacaIsInstalled = ref<boolean>(true)


defineProps<{ variant?: 'icon' | 'icon-text' }>()

const paytacaConnectDisconnect = async () => {
  if (!window.paytaca) return
  if (user.walletAddress && user.walletType === 'paytaca') {
    await paytacaConnect.paytacaDisconnect()
    user.walletType = undefined
    user.walletAddress = ''
    user.walletTokenAddress = ''
    user.wallet = undefined
    user.transactionSigner = undefined
    return
  }
  if (!user.walletAddress) {
    await paytacaConnect.paytacaConnect()
    user.walletType = 'paytaca'
    user.walletTokenAddress = paytacaConnect.paytacaWalletTokenAddress.value
    user.walletAddress = paytacaConnect.paytacaWalletAddress.value
    user.wallet = paytacaConnect.paytacaWallet.value
    user.transactionSigner = paytacaConnect.paytacaTransactionSigner
  }
}

onMounted(async () => {
  await delay(1000)
  paytacaIsInstalled.value = window.paytaca ? true : false

})

</script>
