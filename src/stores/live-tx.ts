import { BaseWallet, NetworkType } from 'mainnet-js'
import { defineStore } from 'pinia'
import { ParsedFrame } from 'src/services/blockexplorer'
import { ref, watch } from 'vue'

export const useLiveTxStore = defineStore('live-tx-store', () => {
  const isConnected = ref(false)
  const watchedTxId = ref<string | null>(null)
  const foundTransaction = ref<any | null>(null)

  let clearTimer: ReturnType<typeof setTimeout> | null = null
  const WATCH_TIMEOUT = 1 * 60 * 1000

  function clear() {
    watchedTxId.value = null
    foundTransaction.value = null
    if (clearTimer) {
      clearTimeout(clearTimer)
      clearTimer = null
    }
  }

  function watchTxId(txId: string) {
    // Reset any previous watch and timer
    clear()
    watchedTxId.value = txId

    // Auto-clear after 2 minutes if missed
    clearTimer = setTimeout(() => {
      console.warn(`Stopped watching missed txId: ${txId}`)
      clear()
    }, WATCH_TIMEOUT)
  }

  function handleLiveTx({ metaTags, payload }: ParsedFrame) {
    if (!watchedTxId.value || !Array.isArray(payload)) return

    const match = payload.find((tx) => tx?.txId === watchedTxId.value)
    // TODO: console.log('@match', match), match payload contains actual fee, we can display it the user
    if (match) {
      foundTransaction.value = {
        ...match,
        metaTags,
        detectedAt: Date.now()
      }
      watchedTxId.value = null
      if (clearTimer) {
        clearTimeout(clearTimer)
        clearTimer = null
      }
    }
  }

  function setConnected(status: boolean) {
    isConnected.value = status
  }

  async function waitForTransaction(txId: string, timeoutMs = WATCH_TIMEOUT): Promise<any> {
    return new Promise((resolve, reject) => {
      if (foundTransaction.value?.txId === txId) {
        return resolve(foundTransaction.value)
      }

      watchTxId(txId)

      const stopWatch = watch(foundTransaction, (txData) => {
        if (txData?.txId === txId) {
          clearTimeout(promiseTimer)
          stopWatch()
          resolve(txData)
        }
      })

      const promiseTimer = setTimeout(() => {
        stopWatch()
        clear()
        reject(new Error(`Timeout waiting for txId: ${txId}`))
      }, timeoutMs)
    })
  }

  async function waitForTransactionWithFallback(txId: string) {
    const networkType =
        import.meta.env.VITE_BCH_NETWORK === 'chipnet'
          ? NetworkType.Testnet
          : NetworkType.Mainnet;
    return await Promise.any([
      waitForTransaction(txId),
      new BaseWallet(networkType).waitForTransaction({
        txHash: txId,
      })
    ])
  }

  return {
    isConnected,
    watchedTxId,
    foundTransaction,
    handleLiveTx,
    watchTxId,
    waitForTransaction,
    waitForTransactionWithFallback,
    setConnected,
    clear
  }
})
