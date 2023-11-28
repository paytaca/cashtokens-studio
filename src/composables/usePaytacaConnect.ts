import SignClient from '@walletconnect/sign-client';
import { onMounted, ref } from "vue"
import { formatAddress, getWalletClass } from "src/app/utils"
import { useUser } from "src/stores/user";
import { TransactionSigner } from 'src/app/types';

export const usePaytacaConnect = () => {
  const paytacaWalletAddress = ref('')
  const paytacaWalletTokenAddress = ref('')
  const paytacaWallet = ref()
  const user = useUser()

  onMounted(async () => {
    if (window.paytaca) {
      const connected = await window.paytaca.connected()
      if (connected) {
        paytacaWalletAddress.value = formatAddress(await window.paytaca.address('bch'))
        paytacaWallet.value = await getWalletClass().watchOnly(paytacaWalletAddress.value)
        paytacaWalletTokenAddress.value = paytacaWallet.value.getTokenDepositAddress()
        if (localStorage.getItem('user.walletType') === 'paytaca') {
          user.walletType = 'paytaca'
          user.walletTokenAddress = paytacaWalletTokenAddress.value
          user.walletAddress = paytacaWalletAddress.value
          user.wallet = paytacaWallet.value
          user.transactionSigner = paytacaTransactionSigner
        }
      }
    }
    
  })
  
  const paytacaConnect = async() => {
    // const dismiss = $q.notify({ spinner: true, message: 'Connecting Paytaca® wallet', color: 'info', timeout: 0 })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (window.paytaca) {
      const connected = await window.paytaca.connected()
      let address 
      if (!connected) {
        const paytacaConnection = await window.paytaca!.connect()
        if (paytacaConnection.connected) {
          if (!paytacaConnection.address.startsWith('bitcoincash')) {
            // $q.notify({ message: 'Please select a bitcoin cash address', color: 'negative', timeout: 1500 })
            // dismiss()
            return
          }else {
            address = paytacaConnection.address
          }
        }
      } else {
        address = await window.paytaca.address('bch')
      }
      if (address) {
        paytacaWalletAddress.value = formatAddress(address)
        paytacaWallet.value = await getWalletClass().watchOnly(address)
        paytacaWalletTokenAddress.value = paytacaWallet.value.getTokenDepositAddress()
      }
      
    }
    
  }

  const paytacaDisconnect = async() => {
    paytacaWalletAddress.value = ''
    paytacaWallet.value = undefined
    paytacaWalletTokenAddress.value = ''
    try {
      await window.paytaca?.disconnect()  
    } catch {
    } finally {
      if (localStorage.getItem('user.walletType') === 'paytaca') {
        localStorage.removeItem('user.walletType')
      }
    }
  }

  const paytacaSignTransaction = async (decodedTransaction:any, sourceOutputs:any, broadcast?:boolean, prompt?:string): Promise<any> => {
    try {
      const signResult = await window.paytaca.signTransaction({
          transaction: decodedTransaction,
          sourceOutputs: [...sourceOutputs],
          broadcast: Boolean(broadcast),
          userPrompt: prompt || 'Signature Requested'
      })
      return signResult
    } catch (error) {
      throw error
    }
  }

  const paytacaTransactionSigner:TransactionSigner = {
    type: 'paytaca',
    signTransaction: paytacaSignTransaction
  }

  return {
    paytacaWalletAddress,
    paytacaWalletTokenAddress,
    paytacaWallet,
    paytacaConnect,
    paytacaDisconnect,
    paytacaTransactionSigner
    
  }
}



