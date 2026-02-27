import SignClient from '@walletconnect/sign-client';
import { onMounted, ref } from "vue"
import { formatAddress, getWalletClass } from "src/apps/utils"
import { useUser } from "src/stores/user";
import { Watchtower } from 'src/apps';
import { delay } from 'mainnet-js';
import  { stringify } from '@bitauth/libauth'
import { TransactionSigner } from 'src/apps/types';

const walletConnectSignerClient = ref()

export const useWalletConnect = () => {
  const walletConnectWallet = ref()
  const walletConnectSession = ref()
  const user = useUser()


  onMounted(async () => {
    
    if (!walletConnectSignerClient.value) {
      walletConnectSignerClient.value = new SignClient({
        projectId: process.env.WALLET_CONNECT_PROJECT_ID!,
        // optional parameters
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: 'Cash-Tokens-Studio',
          description: 'Cash Tokens Studio',
          url: process.env.WALLET_CONNECT_VERIFIED_URL!,
          icons: ['https://cashtokens.studio/images/cts_icon.png']
        }
      })
    }
  
    if(!walletConnectSignerClient.value?.pairing?.initialized) {
      await walletConnectSignerClient.value.initialize()
    }
    
    const existingSessions = walletConnectSignerClient.value.session.getAll()
    if (existingSessions.length > 0) {
      const lastSession = existingSessions.length - 1
      walletConnectSession.value = existingSessions[lastSession]
      let address =  existingSessions[0].namespaces?.bch?.accounts[0]
      if (address) {
        address = address.replace('bch:','')
        address = formatAddress(address)
        walletConnectWallet.value = await getWalletClass().watchOnly(address)
        if (localStorage.getItem('user.walletType') === 'walletconnect') {
          user.walletType = 'walletconnect'
          user.wallet = walletConnectWallet.value
          if (user.wallet) {
            user.wallet.walletConnectSession = walletConnectSession.value
          }
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
      if (walletConnectSession.value?.topic == s.topic) {
        walletConnectSession.value = undefined
      }
    })

    walletConnectSignerClient.value.on('session_event', (s:any)=>{
      console.log('SESSION EVENT', s)
    })

    walletConnectSignerClient.value.on('proposal_expire', (s:any)=>{
      console.log('PROPOSAL EXPIRE', s)
    })

    user.walletConnectSigner = walletConnectSignerClient.value

  })


  const walletConnectConnect = async () => {
    try {
      const connectedChain = user.walletNetworkType == "mainnet" ? "bch:bitcoincash" : "bch:bchtest";

      const requiredNamespaces = {
        bch: {
          chains: [connectedChain],
          methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
          events: ['addressesChanged']
        },
      }

      const optionalNamespaces = {
        bch: {
          chains: [connectedChain],
          methods: ['bch_signTransactionP2SHMultisig'],
          events: []
        },
      }

      const { uri, approval } = await walletConnectSignerClient.value?.connect({
        requiredNamespaces, 
        optionalNamespaces
      });

      const { WalletConnectModal } = await import('@walletconnect/modal')

      const modal = new WalletConnectModal({
        projectId: process.env.WALLET_CONNECT_PROJECT_ID!,
        themeMode: 'dark',
        themeVariables: {
          '--wcm-background-color': '#20c997',
          '--wcm-accent-color': '#20c997',
        },
        explorerExcludedWalletIds: 'ALL',
      })

      await modal.openModal({ uri });
      // Await session approval from the wallet.
      walletConnectSession.value = await approval();
      modal.closeModal();

      let address
      if (walletConnectSession.value) {
        if (walletConnectSession.value?.namespaces?.bch?.accounts) {
          address = walletConnectSession.value.namespaces.bch.accounts[0].replace('bch:','')
          address = formatAddress(address)
          
          walletConnectWallet.value = await getWalletClass().watchOnly(address)
          user.walletType = 'walletconnect'
          user.wallet = walletConnectWallet.value
          if (user.wallet) {
            user.wallet.walletConnectSession = walletConnectSession.value
          }
          user.transactionSigner = walletConnectTransactionSigner
        }
      }
      if (address) {
        const watchtower = new Watchtower()
        let counter = 0
        while (counter < 3){
          await watchtower.subscribe(address)
          counter++
        }
      }

    } catch (error) { console.log(error); }
  }

  const walletConnectDisconnect = async () => {
    if (walletConnectSession.value?.topic) {
      try {
        await walletConnectSignerClient.value?.disconnect({topic: walletConnectSession.value.topic, reason: 'Disconnecting'})
        if (user.walletType === 'walletconnect') {
          walletConnectWallet.value = undefined
          walletConnectSignerClient.value = undefined
          user.wallet = undefined
          user.walletConnectSigner = undefined
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

  const walletConnectSignMessage =  async (message:any, broadcast?: boolean, prompt?:string):Promise<any> =>  {
    const options = {
      message: message,
      broadcast: Boolean(broadcast),
      userPrompt: prompt || 'CTS Requests your signature'
    }

    const chainId = process.env.APP_ENV == 'development' || process.env.APP_ENV == 'development-build'? 'bch:bchtest': 'bch:bitcoincash'
    let result
    try {
      result = await walletConnectSignerClient.value.request({
        chainId: chainId,
        topic: walletConnectSession.value?.topic,
        request: {
          method: "bch_signMessage",
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
    signTransaction: walletConnectSignTransaction,
    signMessage: walletConnectSignMessage
  }

  return {
    walletConnectSignerClient,
    walletConnectConnect,
    walletConnectDisconnect,
    walletConnectSignTransaction,
    walletConnectTransactionSigner
  }
}



