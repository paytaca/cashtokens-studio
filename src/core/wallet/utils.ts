import { Utxo } from "mainnet-js";
import { UtxoWithPath } from "../types";

export function filterGenesisInputs(utxos: UtxoWithPath[]|Utxo[]) {
    return utxos.filter(u => !u.token && Number(u.vout) === 0) || []
}

export type WalletStatusCallback = (status: string | null, address: string) => void

/**
 * The parts of a wallet this helper needs. Structural on purpose: `src/core/wallet` must not depend
 * on the WalletConnect module just to watch an address.
 */
type WatchableWallet = {
    getWalletType(): string
    receive?: { watchStatus(callback: WalletStatusCallback): Promise<unknown> }
    watchStatus?(callback: WalletStatusCallback): Promise<unknown>
}

/**
 * Subscribes to wallet activity regardless of which connect path produced the wallet.
 *
 * A WizardConnect session watches its receive HD wallet; a single-address WalletConnect wallet
 * watches its one address directly. Both return a cancel function, or nothing when there is nothing
 * to watch.
 */
export function watchWalletActivity(wallet: WatchableWallet | undefined, callback: WalletStatusCallback) {
    if (!wallet) return undefined
    if (wallet.getWalletType() === 'wallet-connect') return wallet.watchStatus?.(callback)
    return wallet.receive?.watchStatus(callback)
}
