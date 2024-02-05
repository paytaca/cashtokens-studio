import { inject, onMounted, ref, unref, watch } from "vue"
import { getWalletClass } from "src/app/utils"
import { useUser } from "src/stores/user";
import { ADDRESS_WATCHER_TRIGGERED, DEFAULT_TOKEN_VALUE, Watchtower } from 'src/app';
import { UtxoI, delay } from 'mainnet-js';
import { useRouter } from 'vue-router';
import { EventBus } from 'quasar';
import { useUI } from "src/stores/ui";
import { usePage } from "src/stores/page";
import { useLocalForage } from "./useLocalForage";
import { stringify } from "@bitauth/libauth";

export const useInit = () => {
  const user = useUser()
  const ui = useUI()
  const localForage = useLocalForage()
  const page = usePage()
  const watchtower = ref<Watchtower>()
  const router = useRouter()
  const eventBus = inject<EventBus>('eventBus')
  const unwatchAddress = ref()
  
  onMounted(()=>{
    watchtower.value = new Watchtower()
    window.onbeforeunload = () => {
      localStorage.setItem('user.walletType', user.walletType || '')
    }

    page.$subscribe((mutation:any, state)=>{
      console.log('MUTATION', mutation)
      console.log('STATE', state)
      if (mutation.events?.key == 'state') {
        console.log('PAGE PATH', state.path)
        localForage.pageStore.setItem(state.path, stringify(state.state))
        console.log('SAVING NEW VALUE', mutation.events.newValue)
      }
      
    })

    

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
      unwatchAddress?.value()
      router.replace('/')
    }
  })
  
  
}



