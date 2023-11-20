<template>
  <span @click.stop="connectDisconnect" stack dense>
    <!-- <q-avatar v-if="variant === 'icon'" rounded size="lg">
      <q-img src="images/walletconnect_icon.png"></q-img>
    </q-avatar>
    <q-avatar v-else rounded style="width: 300px; height: 100px">
      <q-img src="images/walletconnect.png"></q-img>
    </q-avatar> -->
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
import { useUserWallet } from 'src/composables/useUserWallet';
import { useUser } from 'src/stores/user';

defineProps<{ variant?: 'icon' | 'icon-text' }>()

const { walletConnect } = useUserWallet()
const user = useUser()

onMounted(() => {
  console.log('WalletConnect', walletConnect)
})

const connectDisconnect = () => {
  if (user.walletAddress && user.walletType === 'walletconnect') {
    walletConnect.walletConnectDisconnect()
  } else {
    walletConnect.walletConnectConnect()
  }

}


</script>
