import SignClient from '@walletconnect/sign-client';
import { onMounted, ref, watch } from "vue"
import { formatAddress, getWalletClass } from "src/app/utils"
import { useUser } from "src/stores/user";
import { DEFAULT_TOKEN_VALUE, Watchtower } from 'src/app';
import { UtxoI, delay } from 'mainnet-js';
import { useRouter } from 'vue-router';

export const useInit = () => {
  const user = useUser()
  const watchtower = ref<Watchtower>()
  const router = useRouter()
  
  onMounted(()=>{
    watchtower.value = new Watchtower()
    console.log('INITING')
  })

  const loadWalletBchBalance = async (address: string) => {
    if (address) {
      await delay(3000)
      try {
        const balance = await watchtower.value!.fetchBchBalance(address)
        user.walletBchBalance = balance?.balance
        console.log('BALANCE', balance)
      } catch (error) {
        user.walletBchBalance = await user.wallet?.getBalance('bch') as string
      }
      
    }
  }

  const filterAndStoreGenesisInputs = (userUtxos: UtxoI[]) => {
    console.log('GINPUT', user.genesisInputs)
    user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
      return Boolean(!utxo.token) &&
        utxo.vout === 0 &&
        utxo.satoshis >= DEFAULT_TOKEN_VALUE
    }).slice(0, 5)
    
  }

  // const init = async () => {
  //   if (user.walletAddress && user.wallet) {
  //     const userUtxos = await user.wallet.getAddressUtxos()
  //     loadWalletBchBalance(user.walletAddress)
  //     filterAndStoreGenesisInputs(userUtxos)
  //   }
  // }

  watch(() => user.walletAddress, async (value) => {
    console.log('WATCHER TRIGGERED')
    console.log(value, user.wallet)
    if(value) {  
      const userWallet =  await getWalletClass().watchOnly(user.walletAddress)
      const userUtxos = await userWallet.getAddressUtxos()
      console.log('UTXOS', userUtxos)
      loadWalletBchBalance(user.walletAddress)
      filterAndStoreGenesisInputs(userUtxos)
      
    } else {
      router.replace('/')
    }
  })
  
}



