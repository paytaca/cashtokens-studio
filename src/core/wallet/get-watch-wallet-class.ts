/**
 * The watch-only wallet class for the configured network.
 *
 * WalletConnect sessions expose a single address and no xpubs, so the wallet behind them is a
 * `WatchWallet` rather than the `HDWallet` a WizardConnect session can rebuild. Imported lazily for
 * the same reason as the HD class: only load mainnet-js when a session actually needs it.
 */
export async function getWatchWalletClass() {
    const { WatchWallet, TestNetWatchWallet } = await import('mainnet-js')
    const network = import.meta.env.VITE_BCH_NETWORK

    return network === 'chipnet' || network === 'testnet' ? TestNetWatchWallet : WatchWallet
}
