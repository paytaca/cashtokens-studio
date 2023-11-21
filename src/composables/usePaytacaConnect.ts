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
        paytacaWalletAddress.value = formatAddress(paytacaConnection.address)
        paytacaWallet.value = await getWalletClass().watchOnly(user.walletAddress)
        paytacaWalletTokenAddress.value = paytacaWallet.value.getTokenDepositAddress()
      }
    }
    
  }

  const paytacaDisconnect = async() => {
    user.walletAddress = ''
    user.wallet = undefined
    user.walletTokenAddress = ''
    await window.paytaca?.disconnect()
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



