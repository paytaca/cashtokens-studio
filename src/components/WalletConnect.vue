<template>
  <q-btn icon="img:images/walletconnect.png" class="q-px-md" align="center" @click.stop="connect" stack dense>
    <q-icon v-if="user.walletAddress" name="link" color="positive" size="xs" class="q-py-sm"
      style="width:.15em;height:.10em"></q-icon>
    <q-icon v-else name="link_off" color="negative" size="xs" class="q-py-sm" style="width:.15em;height:.10em"></q-icon>
  </q-btn>
</template>

<script setup lang="ts">

import SignClient from '@walletconnect/sign-client';


import { EventBus, useQuasar } from 'quasar'
import { ref, onMounted, watch, inject } from 'vue';
import { useRouter } from 'vue-router';
import { UtxoI, Wallet, delay } from 'mainnet-js';
import formatAddress from 'src/app/utils/formatAddress';
import getWalletClass from 'src/app/utils/getWalletClass';
import { useUser } from 'src/stores/user';
import { ADDRESS_WATCHER_TRIGGERED, DEFAULT_TOKEN_VALUE } from 'src/app/constants'
import { Watchtower } from 'src/app/Watchtower';


const $q = useQuasar()
const router = useRouter()
const user = useUser()
const watching = ref()
const eventBus = inject<EventBus>('eventBus')
const watchtower = ref<Watchtower>(new Watchtower())
const connected = ref<boolean>(false)
const signClient = ref()
const walletConnectModal = ref()
const requiredNamespaces = ref()
const session = ref()

onMounted(async () => {
  const projectId = process.env.WALLET_CONNECT_PROJECT_ID!
  signClient.value = await SignClient.init({
    projectId,
    // optional parameters
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'Cash-Tokens-Studio',
      description: 'Cash Tokens Studio',
      url: 'http://localhost:8000',
      icons: ['https://cashtokens.studio/images/cts_icon.png']
    }
  })

  const { WalletConnectModal } = await import('@walletconnect/modal')
  walletConnectModal.value = new WalletConnectModal({
    projectId: projectId,
    themeMode: 'dark',
    themeVariables: {
      '--wcm-background-color': '#20c997',
      '--wcm-accent-color': '#20c997',
    },
    explorerExcludedWalletIds: 'ALL',
  })

  const connectedChain = user.walletNetworkType == "mainnet" ? "bch:bitcoincash" : "bch:bchtest";
  requiredNamespaces.value = {
    bch: {
      chains: [connectedChain],
      methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
      events: ['addressesChanged'],
    },
  }

  console.log('SIGN CLIENT ON LOAD', signClient.value)
  console.log(signClient.value.session.getAll())
})

const connect = async () => {
  try {

    const { uri, approval } = await signClient.value.connect({ requiredNamespaces: requiredNamespaces.value });
    console.log('URI', uri);
    console.log('APPROVAL', approval);
    if (session.value) return;
    await walletConnectModal.value.openModal({ uri });
    // Await session approval from the wallet.
    session.value = await approval();
    // // Handle the returned session (e.g. update UI to "connected" state).
    // document.getElementById('my-button').style.display = "none";
    // document.getElementById('connectInfo').style.display = "none";
    // document.getElementById('mintSection').style.display = "block";
    console.log('SESSION', session.value);
    //onSessionConnect(session)
    // Close the QRCode modal in case it was open.
    walletConnectModal.value.closeModal();
    user.walletType = 'walletconnect'
    user.walletConnectSigner = signClient.value
    user.walletConnectSession = session.value
    if (session.value) {
      user.walletAddress = formatAddress(session.value.namespaces?.bch?.accounts[0])
    }

  } catch (error) { console.log(error); }
}

const disconnect = async () => {
  signClient.value.disconnect()
}


</script>
