import SignClient from '@walletconnect/sign-client';
import { onMounted, ref } from "vue"
import { formatAddress, getWalletClass } from "src/apps/utils"
import { useUser } from "src/stores/user";
import { Watchtower } from 'src/apps';

export const useUserWallet = () => {
  const paytacaWalletAddress = ref('')
  const paytacaWalletTokenAddress = ref('')
  const paytacaWallet = ref()
  const walletConnectWalletAddress = ref()
  const walletConnectWalletTokenAddress = ref()
  const walletConnectWallet = ref()
  const walletConnectSignerClient = ref()
  const walletConnectModal = ref()
  const walletConnectRequiredNamespaces = ref()
  const walletConnectSession = ref()
  const user = useUser()

  onMounted(async () => {
    if (window.paytaca) {
      const connected = await window.paytaca.connected()
      if (connected) {
        
        paytacaWalletAddress.value = formatAddress(await window.paytaca.address('bch'))
        console.log('CONNECTED ON MOUNT', paytacaWalletAddress.value)
        paytacaWallet.value = await getWalletClass().watchOnly(paytacaWalletAddress.value)
        paytacaWalletTokenAddress.value = paytacaWallet.value.getTokenDepositAddress()
      }
    }

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

    walletConnectSession.value = walletConnectSignerClient.value.session
    const sessions = walletConnectSignerClient.value.session.getAll()
    if (sessions.length > 0) {
      walletConnectWalletAddress.value = sessions[0].namespaces?.bch?.accounts[0]
      if (sessions[0]?.namespaces?.bch?.accounts) {
        const address = sessions[0]?.namespaces?.bch?.accounts[0].replace('bch:','')
        user.walletAddress = formatAddress(address)
        user.wallet = await getWalletClass().watchOnly(user.walletAddress)
        console.log('USERWALLET', user.wallet)
        user.walletType = 'walletconnect'
      }
    }
  })
  
  const paytacaConnect = async() => {
    // const dismiss = $q.notify({ spinner: true, message: 'Connecting Paytaca® wallet', color: 'info', timeout: 0 })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (window.paytaca) {
      const paytacaConnection = await window.paytaca!.connect()
      if (paytacaConnection.connected) {
        if (!paytacaConnection.address.startsWith('bitcoincash')) {
          // $q.notify({ message: 'Please select a bitcoin cash address', color: 'negative', timeout: 1500 })
          // dismiss()
          return
        }
        
        // paytacaWalletAddress.value = formatAddress(paytacaConnection.address)
        // paytacaWallet.value = await getWalletClass().watchOnly(paytacaWalletAddress.value)
        // paytacaWalletTokenAddress.value = paytacaWallet.value.getTokenDepositAddress()
        // console.log('paytaca connection', paytacaWalletAddress.value)
        user.walletAddress = formatAddress(paytacaConnection.address)
        user.wallet = await getWalletClass().watchOnly(user.walletAddress)
        user.walletTokenAddress = paytacaWallet.value.getTokenDepositAddress()
        user.walletType = 'paytaca'
      }
    }
    
  }

  const paytacaDisconnect = async() => {
    user.walletAddress = ''
    user.wallet = undefined
    user.walletTokenAddress = ''
    await window.paytaca?.disconnect()
  }

  const walletConnectConnect = async () => {
    console.log('CONNECTING TO WALLET CONNECT')
    try {
      const { uri, approval } = await walletConnectSignerClient?.value?.connect({ requiredNamespaces: walletConnectRequiredNamespaces.value });
      if(!Boolean(walletConnectSession.value.getAll().length > 0)) {
        console.log()
        await walletConnectModal.value.openModal({ uri });
        // Await session approval from the wallet.
        await approval();
        walletConnectModal.value.closeModal();  
      }
      let address
      if (walletConnectSession.value) {
        const sessions = walletConnectSession.value.getAll()
        console.log(sessions)
        if (sessions[0]?.namespaces?.bch?.accounts) {
          address = sessions[0]?.namespaces?.bch?.accounts[0].replace('bch:','')
          user.walletAddress = formatAddress(address)
          user.wallet = await getWalletClass().watchOnly(user.walletAddress)
          user.walletType = 'walletconnect'
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
    console.log('Disconnecting wallet connect')
    console.log('WALLET', walletConnectSession.value)
    const s = walletConnectSession.value
    console.log('S', s)
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
    paytaca: {
      paytacaWalletAddress,
      paytacaWalletTokenAddress,
      paytacaWallet,
      paytacaConnect,
      paytacaDisconnect
    },
    walletConnect: {
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
}



