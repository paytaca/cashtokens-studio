/**
 * The HD wallet class for the configured network.
 *
 * Imported lazily so the wallet module only loads when a WizardConnect session actually needs it.
 */
export async function getHDWalletClass() {
    const { HDWallet, TestNetHDWallet } = await import('mainnet-js-v3')
    const network = import.meta.env.VITE_BCH_NETWORK

    return network === 'chipnet' || network === 'testnet' ? TestNetHDWallet : HDWallet
}
