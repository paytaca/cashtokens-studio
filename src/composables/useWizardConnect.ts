import type { 
  WalletReadyMessage, 
  RelayUpdatePayload,
  DisconnectReason as DisconnectReasonType,
  DappRelayOptions,
  PathXpub
} from '@wizardconnect/core';
import { HDWallet, Utxo } from 'mainnet-js-v3';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref, toRaw, watch } from 'vue';
// import { getDappMgr } from 'src/apps/wizard-connect/connection-manager';
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue';
import { getHDWalletClass } from 'src/apps/utils';
import { DappConnectionManager, StoredSession } from '@wizardconnect/dapp';
import { filterAuthKeys } from 'src/core/authguard';
import { UtxoWithPath } from 'src/core/types';
import { initiateDappRelay, DisconnectReason } from '@wizardconnect/core';
import { loadSession } from '@wizardconnect/dapp';
import { WizardConnectState } from './types';

type WZWalletPath = { name: string, xpub: string}

type WZWallet = {
  receive?: HDWallet | undefined,
  change?: HDWallet | undefined,
  defi?: HDWallet | undefined,
  balance?: bigint | undefined,
  utxos?: UtxoWithPath[]|Utxo[],
  ready: boolean
}

type WzWalletGetUtxosOptions = {
  excludeTokens?: boolean, 
  authKeysOnly?: boolean,
  resolveAddressIndex?: boolean
}

const modal = ref()
const wzDappMgr = ref()
const wzState = ref<WizardConnectState>('idle')
const relayStartAttempted = ref<boolean>()
const wzWallet = ref<WZWallet>({ ready: false })
const wzRelayConn = ref()
  
export const useWizardConnect = () => {
  const $q = useQuasar()
  
  const wzWalletAuthKeyUtxos = computed(() => {
    return filterAuthKeys(wzWallet.value?.utxos || [])
  })
  
  const wzWalletGenesisInputUtxos = computed(() => {
    const nonTokenUtxos = wzWallet.value?.utxos?.filter(u => !u.token && Number(u.vout) === 0) || []
    return nonTokenUtxos.map(u => toRaw(u))
  })

  const wzSession = ref()

  const wzWalletDiscovered = computed(() => {
    return wzDappMgr.value?.isWalletDiscovered()
  })

  const wzStartRelay = async (storedSession?: StoredSession) => {
    relayStartAttempted.value = true

    if (wzState.value === 'connecting' || wzState.value === 'connected') return 
    
    if (wzDappMgr.value) {
      wzDappMgr.value.destroy()
    }

    wzDappMgr.value = new DappConnectionManager(
      import.meta.env.VITE_APP_NAME as string,
      import.meta.env.VITE_APP_ICON_URL as string,
    )

    wzDappMgr.value.on('walletready', async (msg: WalletReadyMessage) => {
      if (msg.action === 'wallet_ready') {
        if (modal?.value) { 
          modal.value?.hide() 
        }
        if (wzWallet.value && !wzWallet.value.ready) {
          await wzInitWallet(msg.session.hdwalletv1 as { paths: PathXpub[] })
          wzWallet.value.ready = true
        }
      }
      wzState.value = 'connected'
    })

    wzDappMgr.value.on('reconnecting', (msg: WalletReadyMessage) => {
      wzState.value = 'reconnecting'
    })

    wzDappMgr.value.on('messagereceive', (msg: any) => {
      if (msg.action === 'disconnect') {

        postDisconnectCleanUp()
      }
    })

    wzDappMgr.value.on('disconnect', (reason: DisconnectReasonType) => {
      postDisconnectCleanUp()
      if (reason === DisconnectReason.ProtocolMismatch) {
        $q.notify({
          type: 'Disconnect Warning',
          message: 'Protocol mismatch'
        })
      }
      if(DisconnectReason.UserDisconnect) {
        $q.notify({
          type: 'Info',
          message: 'User triggered disconnection on wallet'
        })
      } 
    });


    const relayOptions = {
      explicitRelayUrls: ['wss://relay.cauldron.quest:443']
    } as DappRelayOptions
    
    if (storedSession && storedSession.walletPublicKey) {
      relayOptions.existingCredentials = {
        privateKey: storedSession.privateKey,
        secret: storedSession.secret,
        walletPublicKey: storedSession.walletPublicKey,
      }
    } 

    try {
      wzRelayConn.value = initiateDappRelay(
        (payload: RelayUpdatePayload) => {
          if (payload.status.status === 'connected' && wzDappMgr.value?.isWalletDiscovered()) {
            return
          }
          wzDappMgr.value?.updateConnection(payload.client, payload.status);
        },
        relayOptions,
      )
    
      wzDappMgr.value.attachRelay(wzRelayConn.value)
    } catch (error) {
      $q.notify({
        type: 'Error',
        message: 'Error starting wizard connect!'
      })
      wzState.value = 'idle'
    } 

    if (!storedSession) {
      modal.value = $q.dialog({
        component: QrCodeModal,
        componentProps: { contents: wzRelayConn.value.uri }
      })
    }
  }

  const wzCreateWalletObject = async (wzSession: {paths?: PathXpub[]}): Promise<WZWallet> => {
    if (!wzSession.paths || wzSession.paths?.length === 0) return { ready: false }
    const receiveXPub = wzSession.paths.find((p: WZWalletPath) => p.name === 'receive')?.xpub
    const changeXPub = wzSession.paths.find((p: WZWalletPath) => p.name === 'change')?.xpub
    const defiXPub = wzSession.paths.find((p: WZWalletPath) => p.name === 'defi')?.xpub

    const HDWalletClass = await getHDWalletClass()
    const receiveWallet = receiveXPub && await HDWalletClass.fromXPub(receiveXPub)
    const changeWallet = changeXPub && await HDWalletClass.fromXPub(changeXPub)
    const defiWallet = defiXPub && await HDWalletClass.fromXPub(defiXPub)
    return {
      receive: receiveWallet,
      change: changeWallet,
      defi: defiWallet,
      balance: 0n,
      ready: true
    } as WZWallet
  }

  const wzWalletGetUtxos = async (wzWallet: WZWallet, options?: WzWalletGetUtxosOptions): Promise<UtxoWithPath[]> => {
    
    const utxoRequests: { name: string, req: Promise<Utxo[]>}[] = []
  
      if (!wzWallet.utxos) {
        wzWallet.utxos = []
      }
  
      let utxos: Utxo[] = wzWallet.utxos || []
      
      if (wzWallet.receive) utxoRequests.push({ name: 'receive', req: wzWallet.receive.getUtxos() })
      if (wzWallet.change) utxoRequests.push({ name: 'change', req: wzWallet.change.getUtxos() })
      if (wzWallet.defi) utxoRequests.push({ name: 'defi', req: wzWallet.defi.getUtxos() })
  
      const utxoPromiseResults = await Promise.allSettled([...utxoRequests.map((r) => r.req)])
      
      for (const i in utxoRequests) {
        if(utxoPromiseResults[i]?.status === 'rejected') continue
        utxos = utxos.concat(
          (utxoPromiseResults[i] as PromiseFulfilledResult<Utxo[]>).value.map((u: Utxo) => ({ ...u, pathName: utxoRequests[i]!.name }))
        )
      }
      
      const utxosMap = new Map((wzWallet.utxos).map(utxo => [`${utxo.txid}:${utxo.vout}`, utxo]))
  
      for (const utxo of utxos) {
        if (!utxosMap.get(`${utxo.txid}:${utxo.vout}`)) {
          wzWallet.utxos.push(utxo as UtxoWithPath)
        }
      }
  
      if (options?.excludeTokens) {
        utxos = utxos?.filter((u) => !u.token) as UtxoWithPath[]
      }
  
      if (!options?.excludeTokens && options?.authKeysOnly) {
        utxos = utxos.filter(u => u.token?.nft?.commitment === '00') as UtxoWithPath[]
      }
  
      if (options?.resolveAddressIndex) {
        utxos = wzWalletResolveUtxosAddressIndex(utxos as UtxoWithPath[]) as UtxoWithPath[]
      }
      console.log('utxos', utxos)
      const uniqueUtxosMap = new Map((utxos).map(utxo => [`${utxo.txid}:${utxo.vout}`, utxo]))
      const uniqueUtxos = [...uniqueUtxosMap.values()] as UtxoWithPath[]
      wzWallet.balance = getBalanceFromUtxos(uniqueUtxos as Utxo[])
      return uniqueUtxos
  }

  const wzWalletResolveUtxosAddressIndex = (utxos: UtxoWithPath[]) => {
    const utxosWithPath = []
    for (const utxo of utxos) {
      if (utxo.pathName) {
        const utxoDerivationInfo = wzWallet.value?.[utxo.pathName]?.walletCache?.get(utxo.address);
        if (!utxoDerivationInfo) {
          return $q.notify({
            type: 'Error',
            message: 'Error getting the address information of some of your unspent BCH. Please try to refresh the page. If problem persists, please contact admin.'
          })
        }
        utxosWithPath.push({
          ...utxo,
          addressIndex: utxoDerivationInfo.index
        })
      }
    }
    return utxosWithPath
  };

  const wzWalletGetGenesisInputUtxos = async (wzWallet: WZWallet) => {
    const utxos = await wzWalletGetUtxos(wzWallet)
    return utxos?.filter((utxo: Utxo|UtxoWithPath) => !utxo.token && utxo.vout === 0)
  }

  const getBalanceFromUtxos = (utxos: Utxo[]|UtxoWithPath[]) => {
    const utxoMap = new Map()
    const balance = utxos!.reduce((acc, next) => {
      if (next.token) return acc
      if(utxoMap.has(`${next.txid}:${next.vout}`)) return acc
      utxoMap.set(`${next.txid}:${next.vout}`, next)
      acc = acc + next.satoshis
      return acc
    }, 0n)

    return balance
  }

  const wzWalletGetBalance = async (wzWallet: WZWallet) => {
    const utxos = await wzWalletGetUtxos(wzWallet)
    return getBalanceFromUtxos(utxos)
  }

  const wzGetInputPaths = async (utxos: UtxoWithPath[], wallet: WZWallet) => {
    const inputPaths = []
        for (const inputIndex in utxos) {
            const utxo = utxos[inputIndex] as UtxoWithPath
            const addressDetails = wallet[utxo.pathName as 'receive' | 'change' | 'defi']?.walletCache.get(utxo.address)
            // Note: Don't use addressDetails.change produced by the walletCache it returns true even if the address is a receiving address
            if (!addressDetails) {
                $q.notify({
                    type: 'Error',
                    message: 'Error creating authkey. Please try refreshing the page.'
                })
                return
            }
            const inputPath = [
                Number(inputIndex),
                utxo.pathName,
                addressDetails.index
            ]
            inputPaths.push(inputPath)
        }
    return inputPaths 
  }

  const wzInitWallet = async (session: { paths: PathXpub[]}) => {
    if (session) {
      wzWallet.value = await wzCreateWalletObject(session)
    }

    if (wzWallet.value) {
      wzWallet.value.utxos = await wzWalletGetUtxos(wzWallet.value as WZWallet)
      if (wzWallet.value.utxos && wzWallet.value.utxos.length > 0) {
        wzWallet.value.balance = getBalanceFromUtxos(wzWallet.value.utxos || [])
      }
    }
  }

  const postDisconnectCleanUp = async () => {
    wzDappMgr.value?.clearStoredSession();
    wzRelayConn.value?.cleanup();
    wzDappMgr.value = null 
    wzRelayConn.value = null
    wzState.value = 'idle'
  }

  const wzDisconnect = async () => {
    try {
      await wzDappMgr.value?.sendDisconnect("Disconnecting Cashtokens Studio");  
      wzState.value = 'disconnected'
    } catch (error) {
      $q.notify({
        type: 'Warning',
        message: 'Error Disconnecting wizard connect'
      })
    } finally {
      postDisconnectCleanUp()
    }
  }

  watch(() => wzWalletDiscovered.value, (v) => {
    if (v) {
      modal.value?.hide()
    }
  })

  onMounted(async () => {
    const storedSession = loadSession()
    if (!storedSession || !storedSession.walletPublicKey) return
    if (storedSession.paths) {
      await wzInitWallet(storedSession as { paths: PathXpub[] })
    }
    if (relayStartAttempted.value) return
    await wzStartRelay(storedSession) 
  });

  return {
    wzDappMgr,
    wzRelayConn,
    wzState,
    wzSession,
    wzWalletDiscovered,
    wzWallet,
    wzWalletAuthKeyUtxos,
    wzWalletGenesisInputUtxos,
    wzStartRelay,
    wzDisconnect,
    wzWalletGetUtxos,
    wzGetInputPaths,
    wzWalletResolveUtxosAddressIndex,
    wzWalletGetGenesisInputUtxos,
    wzWalletGetBalance
  }
};
