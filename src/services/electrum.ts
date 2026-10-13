import { ElectrumNetworkProvider, type Network } from 'cashscript'
import { delay } from 'mainnet-js-v3'

/** Networks this app is expected to run against (cashscript also knows mocknet/regtest). */
const SUPPORTED_NETWORKS: Network[] = ['mainnet', 'testnet3', 'testnet4', 'chipnet']

/** Fall back to the network the app is configured for, or mainnet. */
const configuredNetwork = (): Network => {
    const configured = import.meta.env.VITE_BCH_NETWORK as Network | undefined

    return configured && SUPPORTED_NETWORKS.includes(configured) ? configured : 'mainnet'
}

export type MempoolCheckParams = {
    address: string
    txHash: string
    /** Chain the transaction was broadcast on. Defaults to `VITE_BCH_NETWORK`. */
    network?: Network
    /** Total budget for polling before giving up. */
    timeout?: number
    /** How many times to poll inside `timeout`. */
    retries?: number
}

/**
 * Wait for a transaction to show up in the mempool of the given address.
 *
 * A freshly broadcast transaction is not visible to every electrum server immediately, so this
 * polls the address's mempool until it appears, and throws once the retry budget is exhausted.
 *
 * Runs on cashscript's `ElectrumNetworkProvider` — the same client the core transaction builders
 * use — so host selection stays in one place (`chipnet.bch.ninja`, `bch.imaginary.cash`, ...) and
 * `{ hostname }` can point at a different server if that is ever needed.
 *
 * The provider opens and closes the socket around each request by itself, so there is no
 * connection to manage here. (The implementation this replaced used a raw `ElectrumClient` that
 * was never disconnected, leaking a socket per call.)
 */
export async function isTransactionInMempool({
    address,
    txHash,
    network,
    timeout = 5000,
    retries = 5,
}: MempoolCheckParams): Promise<boolean> {
    const provider = new ElectrumNetworkProvider(network ?? configuredNetwork())
    const interval = Math.max(1, Math.floor(timeout / retries))

    for (let attempt = 0; attempt < retries; attempt++) {
        const mempool = await provider.performRequest('blockchain.address.get_mempool', address)

        if (Array.isArray(mempool) && mempool.some((entry: { tx_hash: string }) => entry.tx_hash === txHash)) {
            return true
        }

        await delay(interval)
    }

    throw new Error('Request timed out verifying tx in mempool. Please check address history in explorer.')
}
