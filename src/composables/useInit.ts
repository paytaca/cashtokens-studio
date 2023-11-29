import { inject, onMounted, ref, watch } from "vue"
import { getWalletClass } from "src/app/utils"
import { useUser } from "src/stores/user";
import { ADDRESS_WATCHER_TRIGGERED, DEFAULT_TOKEN_VALUE, Watchtower } from 'src/app';
import { UtxoI, delay } from 'mainnet-js';
import { useRouter } from 'vue-router';
import { EventBus } from 'quasar';

export const useInit = () => {
  const user = useUser()
  const watchtower = ref<Watchtower>()
  const router = useRouter()
  const eventBus = inject<EventBus>('eventBus')
  const unwatchAddress = ref()
  
  onMounted(()=>{
    watchtower.value = new Watchtower()
    window.onbeforeunload = () => {
      localStorage.setItem('user.walletType', user.walletType || '')
    }
  })

  const loadWalletBchBalance = async (address: string) => {
    if (address) {
      await delay(3000)
      try {
        const balance = await watchtower.value!.fetchBchBalance(address)
        user.walletBchBalance = balance?.balance
      } catch (error) {
        user.walletBchBalance = await user.wallet?.getBalance('bch') as string
      }
    }
  }

  const filterAndStoreGenesisInputs = (userUtxos: UtxoI[]) => {
    user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
      return Boolean(!utxo.token) &&
        utxo.vout === 0 &&
        utxo.satoshis >= DEFAULT_TOKEN_VALUE
    }).slice(0, 5)
    
  }

  watch(() => user.walletAddress, async (address) => {
    if(address) {  
      if (!user.wallet) {
        user.wallet = await getWalletClass().watchOnly(address)
      }
      const userUtxos = await user.wallet.getAddressUtxos()
      loadWalletBchBalance(address)
      filterAndStoreGenesisInputs(userUtxos)
      unwatchAddress.value = user.wallet.watchAddress(async () => {
        const userUtxos = await user.wallet?.getAddressUtxos()
        await loadWalletBchBalance(address)
        if (userUtxos) {
          filterAndStoreGenesisInputs(userUtxos)
        }
        eventBus?.emit(ADDRESS_WATCHER_TRIGGERED)
      })
    } else {
      unwatchAddress.value()
      router.replace('/')
    }
  })
  
  
}



