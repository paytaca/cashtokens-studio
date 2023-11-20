import SignClient from '@walletconnect/sign-client';
import { onMounted, ref } from "vue"
import { formatAddress, getWalletClass } from "src/app/utils"
import { useUser } from "src/stores/user";
import { Watchtower } from 'src/app';
import { delay } from 'mainnet-js';

export const useWalletConnect = () => {
  const walletConnectWalletAddress = ref()
  const walletConnectWalletTokenAddress = ref()
  const walletConnectWallet = ref()
  const walletConnectSignerClient = ref()
  const walletConnectModal = ref()
  const walletConnectRequiredNamespaces = ref()
  const walletConnectSession = ref()
  const user = useUser()

  onMounted(async () => {
    const projectId = process.env.WALLET_CONNECT_PROJECT_ID!
    walletConnectSignerClient.value = await SignClient.init({
      projectId,
      // optional parameters
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: {
        name: 'Cash-Tokens-Studio',
        description: 'Cash Tokens Studio',
        url: process.env.WALLET_CONNECT_VERIFIED_URL!,
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
    console.log('CONNECTED CHAIN', connectedChain)
    walletConnectRequiredNamespaces.value = {
      bch: {
        chains: [connectedChain],
        methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
        events: ['addressesChanged'],
      },
    }

    walletConnectSession.value = walletConnectSignerClient.value.session
    const sessions = walletConnectSignerClient.value.session.getAll()
    if (sessions.length > 0) {
      walletConnectWalletAddress.value = sessions[0].namespaces?.bch?.accounts[0]
      if (sessions[0]?.namespaces?.bch?.accounts) {
        const address = sessions[0]?.namespaces?.bch?.accounts[0].replace('bch:','')
        walletConnectWalletAddress.value = formatAddress(address)
        walletConnectWallet.value = await getWalletClass().watchOnly(walletConnectWalletAddress.value)
      }
    }
    console.log('SESSION', walletConnectSession.value)
  })
  

  const walletConnectConnect = async () => {
    console.log('CONNECTING TO WALLET CONNECT')
    try {
      const { uri, approval } = await walletConnectSignerClient?.value?.connect({ requiredNamespaces: walletConnectRequiredNamespaces.value });
      if (!Boolean(walletConnectSession.value.getAll().length > 0)) {
        
        await walletConnectModal.value.openModal({ uri });
        // Await session approval from the wallet.
        await approval();
        walletConnectModal.value.closeModal();  
      }
      let address
      if (walletConnectSession.value) {
        const sessions = walletConnectSession.value.getAll()
        if (sessions[0]?.namespaces?.bch?.accounts) {
           address = sessions[0]?.namespaces?.bch?.accounts[0].replace('bch:','')
          walletConnectWalletAddress.value = formatAddress(address)
          walletConnectWallet.value = await getWalletClass().watchOnly(walletConnectWalletAddress.value)
        }
        
      }

      if (address) {
        const watchtower = new Watchtower()
        let counter = 0
        while (counter < 3){
          console.log('SUBSCRIBING')
          watchtower.subscribe(address)  
          counter++
        }
      }
  
    } catch (error) { console.log(error); }
  }

  const walletConnectDisconnect = async () => {
    const s = walletConnectSession.value
    console.log('SESSION', s)
    if (walletConnectSession.value.getAll()[0]?.topic) {
      try {
        await walletConnectSignerClient.value?.disconnect({topic: walletConnectSession.value?.getAll()[0]?.topic, reason: 'Disconnecting'})
        if (user.walletType === 'walletconnect') {
          user.wallet = undefined
          user.walletAddress = ''
          user.walletConnectSession = undefined
        }
      } catch (error) {
        console.log(error)
      }
    }
    
  }

  return {
    walletConnectWalletAddress,
    walletConnectWalletTokenAddress,
    walletConnectWallet,
    walletConnectSignerClient,
    walletConnectModal,
    walletConnectRequiredNamespaces,
    walletConnectSession,
    walletConnectConnect,
    walletConnectDisconnect
    
  }
}



