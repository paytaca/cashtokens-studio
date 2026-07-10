import { isBroadcastSuccess } from "src/core/transaction";
import { safeAsync } from "src/core/utils";
import { broadcastTransaction as watchtowerBroadcast } from "./watchtower";
import { NetworkType, BaseWallet } from "mainnet-js-v3";

export type BroadcastTransactionParams = {
    transactionHex: string,
    network?: 'chipnet' | 'mainnet' | 'testnet', 
    onProgress?: (progress: string) => void
}

export async function broadcastTransaction(params: BroadcastTransactionParams ): Promise<any> {

    const [watchtowerBroadcastError, watchtowerBroadcastResult] = await safeAsync(watchtowerBroadcast(params.transactionHex))

    if (!watchtowerBroadcastError && isBroadcastSuccess(watchtowerBroadcastResult)) {
        return [watchtowerBroadcastError, watchtowerBroadcastResult.txid]
    }

    params.onProgress?.('Primary broadcast provider unreachable. Trying alternative route. Please wait...')

    let n = NetworkType.Mainnet
    if (params.network && params.network !== NetworkType.Mainnet) {
        n = params.network && NetworkType.Testnet
    }

    const baseWallet = new BaseWallet(n)

    const [electrumBroadcastError, electrumBroadcastResult] = 
        await safeAsync(baseWallet.provider.sendRawTransaction(params.transactionHex, true))
    
    return [electrumBroadcastError, electrumBroadcastResult]
  }