import SignClient from '@walletconnect/sign-client';
import { onMounted, ref } from "vue"
import { formatAddress, getWalletClass } from "src/app/utils"
import { useUser } from "src/stores/user";
import { Watchtower } from 'src/app';
import { delay } from 'mainnet-js';
import  { stringify } from '@bitauth/libauth'
import { TransactionSigner } from 'src/app/types';

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

    walletConnectSessions.value = walletConnectSignerClient.value.session.getAll()
    if (walletConnectSessions.value.length > 0) {
      const lastSession = walletConnectSessions.value.length - 1
      walletConnectSession.value = walletConnectSessions.value[lastSession]
      walletConnectWalletAddress.value = walletConnectSessions.value[0].namespaces?.bch?.accounts[0]
      if (walletConnectWalletAddress.value) {
        const address = walletConnectWalletAddress.value.replace('bch:','')
        walletConnectWalletAddress.value = formatAddress(address)
        walletConnectWallet.value = await getWalletClass().watchOnly(walletConnectWalletAddress.value)
        walletConnectWalletTokenAddress.value = walletConnectWallet.value.getTokenDepositAddress()
        if (localStorage.getItem('user.walletType') === 'walletconnect') {
          user.walletType = 'walletconnect'
          user.walletTokenAddress = walletConnectWalletTokenAddress.value
          user.walletAddress = walletConnectWalletAddress.value
          user.wallet = walletConnectWallet.value
          user.walletConnectSession = walletConnectSession.value
          user.transactionSigner = walletConnectTransactionSigner
        }
      }
    }

    walletConnectSignerClient.value.on('session_update', (s:any)=>{
      console.log('SESSION UPDATED', s)
    })

    walletConnectSignerClient.value.on('session_proposal', (s:any)=>{
      console.log('SESSION PROPOSAL', s)
    })
    walletConnectSignerClient.value.on('session_delete', (s:any)=>{
      console.log('SESSION DELETE', s)
    })

    walletConnectSignerClient.value.on('session_event', (s:any)=>{
      console.log('SESSION EVENT', s)
    })

    walletConnectSignerClient.value.on('proposal_expire', (s:any)=>{
      console.log('PROPOSAL EXPIRE', s)
    })

  })
  

  const walletConnectConnect = async () => {
    try {
      const { uri, approval } = await walletConnectSignerClient.value?.connect({ requiredNamespaces: walletConnectRequiredNamespaces.value });
      if (!Boolean(walletConnectSessions.value?.length > 0)) {
        await walletConnectModal.value.openModal({ uri });
        // Await session approval from the wallet.
        walletConnectSession.value = await approval();
        walletConnectSessions.value = walletConnectSignerClient.value.sessions?.getAll()
        walletConnectModal.value.closeModal();  
      } 
      let address
      if (walletConnectSession.value) {
        if (walletConnectSession.value?.namespaces?.bch?.accounts) {
          address = walletConnectSession.value.namespaces.bch.accounts[0].replace('bch:','')
          walletConnectWalletAddress.value = formatAddress(address)
          walletConnectWallet.value = await getWalletClass().watchOnly(walletConnectWalletAddress.value)
          walletConnectWalletTokenAddress.value = walletConnectWallet.value.getTokenDepositAddress()
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
    if (walletConnectSession.value?.topic) {
      console.log('Disconnecting')
      try {
        await walletConnectSignerClient.value?.disconnect({topic: walletConnectSession.value.topic, reason: 'Disconnecting'})
        if (user.walletType === 'walletconnect') {
          user.wallet = undefined
          user.walletAddress = ''
          user.walletTokenAddress = ''
          user.walletConnectSession = undefined
          if (localStorage.getItem('user.walletType') === 'walletconnect') {
            localStorage.removeItem('user.walletType')
          }
        }
      } catch (error) {
        console.log(error)
      } finally {
        if (localStorage.getItem('user.walletType') === 'walletconnect') {
          localStorage.removeItem('user.walletType')
        }
      }
    }
  }

  const walletConnectSignTransaction =  async (decodedTransaction:any, sourceOutputs:any, broadcast?: boolean, prompt?:string):Promise<any> =>  {
    const options = {
      transaction: decodedTransaction,
      sourceOutputs: sourceOutputs,
      broadcast: Boolean(broadcast),
      userPrompt: prompt || 'CTS Requests your signature'
    }
  
    const chainId = process.env.APP_ENV == 'development' || process.env.APP_ENV == 'development-build'? 'bch:bchtest': 'bch:bitcoincash'

    let result
    try {
      result = await walletConnectSignerClient.value.request({
        chainId: chainId,
        topic: walletConnectSession.value.topic,
        request: {
          method: "bch_signTransaction",
          params: JSON.parse(stringify(options)),
        },
      });
      return result;
    } catch (error) {
      throw error
    } 
  }
  
  const walletConnectTransactionSigner:TransactionSigner = {
    type: 'walletconnect',
    signTransaction: walletConnectSignTransaction
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
    walletConnectDisconnect,
    walletConnectSignTransaction,
    walletConnectTransactionSigner
  }
}



