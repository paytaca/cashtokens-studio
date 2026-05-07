import type { 
  WalletReadyMessage, 
  RelayUpdatePayload,
  DisconnectReason as DisconnectReasonType
} from '@wizardconnect/core';
import { HDWallet, Utxo } from 'mainnet-js-v3';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref, toRaw } from 'vue';
import { getDappMgr } from 'src/apps/wizard-connect/connection-manager';
import QrCodeModal from 'src/components/wizard-connect/QrCodeModal.vue';
import { getHDWalletClass } from 'src/apps/utils';
import { StoredSession } from '@wizardconnect/dapp';
import { filterAuthKeys } from 'src/core/authguard';
import { UtxoWithPath } from 'src/core/types';
import { initiateDappRelay } from '@wizardconnect/core';
type WZWalletPath = { name: string, xpub: string}

type WZWallet = {
  receive?: HDWallet | undefined,
  change?: HDWallet | undefined,
  defi?: HDWallet | undefined,
  balance?: bigint | undefined,
  utxos?: UtxoWithPath[]|Utxo[],
}

type WzWalletGetUtxosOptions = {
  excludeTokens?: boolean, 
  authKeysOnly?: boolean
}

const wzDappMgr = ref();
const wzRelayConn = ref()

export const useWizardConnect = () => {
  const $q = useQuasar()
  const modal = ref()
  const wzSession = ref()
  const wzWallet = ref<WZWallet>()

  const wzWalletAuthKeyUtxos = computed(() => {
    return filterAuthKeys(wzWallet.value?.utxos || [])
  })
  
  const wzWalletGenesisInputUtxos = computed(() => {
    const nonTokenUtxos = wzWallet.value?.utxos?.filter(u => !u.token && Number(u.vout) === 0) || []
    return nonTokenUtxos.map(u => toRaw(u))
})

  const wzInitiateConnection = async () => {
    // const { initiateDappRelay } = await import('@wizardconnect/core')
  
    wzRelayConn.value = initiateDappRelay(
        (payload: RelayUpdatePayload) => {
          wzDappMgr.value.updateConnection(payload.client, payload.status);
        },
        { explicitRelayUrls: ['wss://relay.cauldron.quest:443'] },
      )

    modal.value = $q.dialog({
      component: QrCodeModal,
      componentProps: { contents: wzRelayConn.value.uri }
    })

    wzDappMgr.value.attachRelay(wzRelayConn.value)

    wzDappMgr.value.on("walletready", (msg: WalletReadyMessage) => {
      if (msg.action === 'wallet_ready') {
        if (modal.value) {
          modal.value.hide()
        }
        wzDappMgr.value.pushDappReady()
      }
    })

    // Listen for wallet-initiated disconnect or protocol mismatch:
    const { DisconnectReason } = await import('@wizardconnect/core')
    wzDappMgr.value.on("disconnect", (reason: DisconnectReasonType, msg: WalletReadyMessage) => {
      if (reason === DisconnectReason.ProtocolMismatch) {
        console.error("Protocol mismatch:", msg);
      } else {
        console.log("Wallet disconnected:", reason, msg);
      }
      wzRelayConn.value?.cleanup();
      wzDappMgr.value?.clearStoredSession();
    });
  }

  const wzCreateWalletObject = async (wzSession: StoredSession) => {
    if (!wzSession.paths || wzSession.paths?.length === 0) return {}
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
    } as WZWallet
  }

  const wzWalletGetUtxos = async (wzWallet: WZWallet, options?: WzWalletGetUtxosOptions) => {
    
    const utxoRequests: { name: string, req: Promise<Utxo[]>}[] = []

    if (wzWallet.receive) utxoRequests.push({ name: 'receive', req: wzWallet.receive.getUtxos() })
    if (wzWallet.change) utxoRequests.push({ name: 'change', req: wzWallet.change.getUtxos() })
    if (wzWallet.defi) utxoRequests.push({ name: 'defi', req: wzWallet.defi.getUtxos() })

    const utxoPromiseResults = await Promise.allSettled([...utxoRequests.map((r) => r.req)])

    let utxos: Utxo[] = []
    
    for (const i in utxoRequests) {
      if(utxoPromiseResults[i]?.status === 'rejected') continue
      utxos = utxos.concat(
        (utxoPromiseResults[i] as PromiseFulfilledResult<Utxo[]>).value.map((u: Utxo) => ({ ...u, pathName: utxoRequests[i]!.name }))
      )
    }

    if (options?.excludeTokens) {
      return utxos?.filter((u) => !u.token)
    }

    if (options?.authKeysOnly) {
      return utxos.filter(u => u.token?.nft?.commitment === '00')
    }
    return utxos
  }

  const wzWalletResolveUtxosAddressIndex = (utxos: UtxoWithPath[]) => {
    const utxosWithPath = []
    for (const utxo of utxos) {
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
    return utxosWithPath
  };

  const wzWalletGetGenesisInputUtxos = async (wzWallet: WZWallet) => {
    const utxos = await wzWalletGetUtxos(wzWallet)
    return utxos?.filter(utxo => !utxo.token && utxo.vout === 0)
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

  const wzWalletGetAuthKeyUtxos = async (wzWallet: WZWallet) => {
    const utxos = await wzWalletGetUtxos(wzWallet)
    return utxos.filter(u => u.token?.nft?.commitment === '00')
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
                inputIndex,
                utxo.pathName,
                addressDetails.index
            ]
            inputPaths.push(inputPath)
        }
    return inputPaths 
  }

  const wzInitWallet = async () => {
    const { loadSession } = await import('@wizardconnect/dapp')
    
    wzSession.value = loadSession()
    if (wzSession.value) {
      wzRelayConn.value = initiateDappRelay(
        (payload: RelayUpdatePayload) => {
          wzDappMgr.value.updateConnection(payload.client, payload.status);
        },
        { existingCredentials: wzSession.value },
      )

      wzDappMgr.value.attachRelay(wzRelayConn.value)

    }

    if (wzSession.value) {
      wzWallet.value = await wzCreateWalletObject(wzSession.value)
    }
    if (wzWallet.value) {
      wzWallet.value.utxos = await wzWalletGetUtxos(wzWallet.value)
      if (wzWallet.value.utxos && wzWallet.value.utxos.length > 0) {
        wzWallet.value.balance = getBalanceFromUtxos(wzWallet.value.utxos || [])
      }
      
    }
  }

  const wzDisconnect = async () => {
    wzDappMgr.value?.clearStoredSession();
    await wzDappMgr.value?.sendDisconnect("user closed the tab");
    wzRelayConn.value?.cleanup();
  }

  onMounted(async () => {
    
    if (!wzDappMgr.value) {
      wzDappMgr.value = await getDappMgr(
        process.env.APP_NAME as string,
        process.env.APP_ICON_URL as string,
      );
    }
    
    await wzInitWallet()
    

  });

  return {
    wzDappMgr,
    wzRelayConn,
    wzSession,
    wzWallet,
    wzWalletAuthKeyUtxos,
    wzWalletGenesisInputUtxos,
    wzInitiateConnection,
    wzDisconnect,
    wzWalletGetUtxos,
    wzGetInputPaths,
    wzWalletResolveUtxosAddressIndex,
    wzWalletGetGenesisInputUtxos,
    wzWalletGetBalance
  }
};
