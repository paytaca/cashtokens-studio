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
  const walletConnectSessions = ref()
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
    
    walletConnectRequiredNamespaces.value = {
      bch: {
        chains: [connectedChain],
        methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
        events: ['addressesChanged'],
      },
    }

    console.log('WALLET CONNECT SIGNER', walletConnectSignerClient.value)
    // walletConnectSession.value = walletConnectSignerClient.value.session
    // const sessions = walletConnectSignerClient.value.session?.getAll()
    // console.log('SESSIONS', sessions)
    walletConnectSessions.value = walletConnectSignerClient.value.session.getAll()
    console.log('SESSIONS', walletConnectSessions.value)
    if (walletConnectSessions.value.length > 0) {
      console.log('length . 0', )
      walletConnectWalletAddress.value = walletConnectSessions.value[0].namespaces?.bch?.accounts[0]
      console.log('walletConnectSessions.value', walletConnectWalletAddress.value)
      if (walletConnectWalletAddress.value) {
        const address = walletConnectWalletAddress.value.replace('bch:','')
        walletConnectWalletAddress.value = formatAddress(address)
        walletConnectWallet.value = await getWalletClass().watchOnly(walletConnectWalletAddress.value)
        console.log('ADDRESS', walletConnectWalletAddress.value)
      }
    }
  })
  

  const walletConnectConnect = async () => {
    try {
      const { uri, approval } = await walletConnectSignerClient.value?.connect({ requiredNamespaces: walletConnectRequiredNamespaces.value });
      if (!Boolean(walletConnectSessions.value?.length > 0)) {
        
        await walletConnectModal.value.openModal({ uri });
        // Await session approval from the wallet.
        const approvalRes = await approval();
        console.log('APPROVAL RES', approvalRes)

        walletConnectSessions.value = walletConnectSignerClient.value.sessions?.getAll()
        walletConnectModal.value.closeModal();  
      } 
      let address
      if (walletConnectSessions.value) {
        const sessions = walletConnectSessions.value
        console.log('AHAHA', sessions)
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
          watchtower.subscribe(address)  
          counter++
        }
      }
  
    } catch (error) { console.log(error); }
  }

  const walletConnectDisconnect = async () => {
    console.log(walletConnectSessions.value)
    if (walletConnectSessions.value[0].topic) {
      console.log('Disconnecting')
      
      try {
        await walletConnectSignerClient.value?.disconnect({topic: walletConnectSessions.value[0].topic, reason: 'Disconnecting'})
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
    walletConnectSessions,
    walletConnectConnect,
    walletConnectDisconnect
    
  }
}



