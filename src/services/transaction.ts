import { isBroadcastSuccess } from "src/core/transaction";
import { safeAsync } from "src/core/utils";
import { broadcastTransaction as watchtowerBroadcast } from "./watchtower";
import { NetworkType, BaseWallet } from "mainnet-js-v3";

export async function broadcastTransaction(transactionHex: string, network?: 'chipnet' | 'mainnet' | 'testnet'): Promise<any> {

    const [watchtowerBroadcastError, watchtowerBroadcastResult] = await safeAsync(watchtowerBroadcast(transactionHex))

    if (!watchtowerBroadcastError && isBroadcastSuccess(watchtowerBroadcastResult)) {
        return [watchtowerBroadcastError, watchtowerBroadcastResult.txid]
    }

    let n = NetworkType.Mainnet
    if (network && network !== NetworkType.Mainnet) {
        n = network && NetworkType.Testnet
    }

    const baseWallet = new BaseWallet(n)

    const [electrumBroadcastError, electrumBroadcastResult] = 
        await safeAsync(baseWallet.provider.sendRawTransaction(transactionHex, true))
    
    return [electrumBroadcastError, electrumBroadcastResult]
  }