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
// import { useUserWallet } from 'src/composables/useUserWallet';
import { useUser } from 'src/stores/user';
import { useWalletConnect } from 'src/composables/useWalletConnect';

defineProps<{ variant?: 'icon' | 'icon-text' }>()

// const { walletConnect } = useUserWallet()
const user = useUser()
const walletConnect = useWalletConnect()

onMounted(() => {
  console.log('WalletConnect', walletConnect)
})

const connectDisconnect = async () => {
  if (user.walletAddress && user.walletType === 'walletconnect') {
    await walletConnect.walletConnectDisconnect()
    user.walletType = undefined
    user.walletAddress = ''
    user.wallet = undefined
    user.walletConnectSession = undefined
  } else {
    console.log('CONNECTING')
    await walletConnect.walletConnectConnect()
    user.walletType = 'walletconnect'
    user.walletAddress = walletConnect.walletConnectWalletAddress.value
    user.wallet = walletConnect.walletConnectWallet.value
    user.walletConnectSession = walletConnect.walletConnectSessions.value[0]
  }

}


</script>
