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
    <q-btn v-else-if="variant === 'button'" @click.stop="connectDisconnect" class="full-width" text-color="negative"
      size="lg">
      <span v-if="user.walletAddress" class="q-ma-sm">
        <q-badge floating :color="user.walletAddress && user.walletType == 'walletconnect' ? 'green' : 'red'" rounded>
        </q-badge>
        <q-avatar v-if="user.walletType == 'walletconnect'" rounded size="md">
          <q-img src="images/walletconnect_icon.png"></q-img>
        </q-avatar>
      </span>
      <span>Disconnect</span>
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

defineProps<{ variant?: 'icon' | 'icon-text' | 'button' }>()

const user = useUser()
const walletConnect = useWalletConnect()

const connectDisconnect = async () => {
  if (user.wallet && user.walletType === 'walletconnect') {
    await walletConnect.walletConnectDisconnect()
  } else {
    await walletConnect.walletConnectConnect()
  }

}


</script>
