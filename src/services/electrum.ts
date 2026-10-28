import { ElectrumNetworkProvider, Network } from 'cashscript'
import { delay } from 'mainnet-js'
import { createAuthguardContract } from 'src/core/authguard'

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

/**
 * Raw transaction hex from the configured electrum host.
 *
 * Electrum serves mempool transactions here as well as confirmed ones, which is what lets the BCMR
 * authorization guard recognise an authhead that was just spent but is not indexed yet.
 */
export async function fetchTransactionHex(txId: string, network?: Network): Promise<string> {
    const provider = new ElectrumNetworkProvider(network ?? configuredNetwork())
    return provider.performRequest('blockchain.transaction.get', txId)
}

export type AuthheadVisibleParams = {
    /** Category of the AuthKey token that guards the authhead. */
    authkeyCategory: string
    /** `${txid}:${vout}` of the authhead the transaction created. */
    authheadId: string
    /** Chain the transaction was broadcast on. Defaults to `VITE_BCH_NETWORK`. */
    network?: Network
    /** Total budget for polling before giving up. */
    timeout?: number
    /** Delay between polls. */
    interval?: number
}

/**
 * Wait for an authhead to appear in its AuthGuard address on the electrum host the authhead scan
 * uses.
 *
 * Creating a token or minting an NFT locks the new authhead into the AuthGuard contract, and the
 * managed tokens table reads it back through cashscript's electrum host. `BaseWallet.waitForTransaction`
 * resolves on mainnet-js's host instead — a different server — so refreshing right after the buy
 * transaction can scan before this host has the output, leaving the new token missing from the table
 * until a manual reload. Poll on the host the refresh actually reads from.
 *
 * Resolves `false` when the budget runs out — the transaction itself already succeeded, so that is
 * not an error.
 */
export async function waitForAuthheadVisible({
    authkeyCategory,
    authheadId,
    network,
    timeout = 15000,
    interval = 1000,
}: AuthheadVisibleParams): Promise<boolean> {
    const authguard = createAuthguardContract({
        authkeyTokenId: authkeyCategory,
        network: network ?? configuredNetwork(),
    })
    const deadline = Date.now() + timeout

    for (;;) {
        try {
            const utxos = await authguard.getUtxos()

            if (utxos.some((utxo) => `${utxo.txid}:${utxo.vout}` === authheadId)) return true
        } catch {
            // A flaky electrum round must not turn a landed transaction into a failure.
        }

        if (Date.now() >= deadline) return false

        await delay(interval)
    }
}

export type AuthheadSpentParams = {
    /** The AuthGuard contract address the vaulted output lives at. */
    address: string
    /** `${txid}:${vout}` of the vaulted output the transaction spends. */
    authheadId: string
    /** Chain the transaction was broadcast on. Defaults to `VITE_BCH_NETWORK`. */
    network?: Network
    /** Total budget for polling before giving up. */
    timeout?: number
    /** Delay between polls. */
    interval?: number
}

/**
 * Wait for a vaulted authhead output to leave its AuthGuard address.
 *
 * The authhead's fungible reserves are read back through cashscript's `ElectrumNetworkProvider`
 * (`getLockedAuthheadUtxos` → `Contract.getUtxos`), which talks to a **different electrum server**
 * than mainnet-js's `waitForTransaction` does (`chipnet.bch.ninja` vs `chipnet.imaginary.cash`, and
 * likewise on mainnet). Waiting for the transaction on the mainnet-js provider therefore says
 * nothing about whether the vaulted UTXO has moved yet, which is how a release could land and leave
 * the reserves column showing its previous amount.
 *
 * Polls the contract's own address on the same client the refresh will use. Resolves `false` when
 * the budget runs out — the transaction itself already succeeded, so that is not an error.
 */
export async function waitForAuthheadSpent({
    address,
    authheadId,
    network,
    timeout = 15000,
    interval = 1000,
}: AuthheadSpentParams): Promise<boolean> {
    const provider = new ElectrumNetworkProvider(network ?? configuredNetwork())
    const deadline = Date.now() + timeout

    for (;;) {
        try {
            const utxos = await provider.getUtxos(address)

            if (!utxos.some((utxo) => `${utxo.txid}:${utxo.vout}` === authheadId)) return true
        } catch {
            // A flaky electrum round must not turn a landed transaction into a failure.
        }

        if (Date.now() >= deadline) return false

        await delay(interval)
    }
}


// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Disables the class field error because the runtime actually uses a method
export class CustomElectrumNetworkProvider extends ElectrumNetworkProvider {
    override getServerForNetwork(network: Network): string {
        switch (network) {
          case Network.CHIPNET:
            return 'chipnet.imaginary.cash';
          default:
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Disables the class field error because the runtime actually uses a method
            return super.getServerForNetwork(network)
        }
      }
  }