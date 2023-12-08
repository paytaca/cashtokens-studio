<template>
  <span @click.stop="connectDisconnect" stack dense>
    <q-btn v-if="variant === 'icon'">
      <div class="row justify-center text-center q-py-xs">
        <div class="col-xs-12">
          <q-avatar rounded size="md">
            <q-img src="images/walletconnect_icon.png"></q-img>
          </q-avatar>
        </div>
      </div>
      <q-badge floating :color="user.walletAddress && user.walletType == 'walletconnect' ? 'green' : 'red'"
        rounded></q-badge>
    </q-btn>

    <q-avatar v-else rounded style="width: 250px; height: 100px">
      <q-img src="images/walletconnect.png"></q-img>
    </q-avatar>
  </span>
</template>

<script setup lang="ts">

import { onMounted } from 'vue';
import { useUser } from 'src/stores/user';
import { useWalletConnect } from 'src/composables/useWalletConnect';

defineProps<{ variant?: 'icon' | 'icon-text' }>()

const user = useUser()
const walletConnect = useWalletConnect()

const connectDisconnect = async () => {
  if (user.walletAddress && user.walletType === 'walletconnect') {
    await walletConnect.walletConnectDisconnect()
    user.walletType = undefined
    user.walletAddress = ''
    user.walletTokenAddress = ''
    user.wallet = undefined
    user.walletConnectSession = undefined
    user.transactionSigner = undefined
  } else {
    await walletConnect.walletConnectConnect()
    user.walletType = 'walletconnect'
    user.walletTokenAddress = walletConnect.walletConnectWalletTokenAddress.value
    user.walletAddress = walletConnect.walletConnectWalletAddress.value
    user.wallet = walletConnect.walletConnectWallet.value
    user.walletConnectSession = walletConnect.walletConnectSession.value
    user.transactionSigner = walletConnect.walletConnectTransactionSigner
  }

}


</script>
