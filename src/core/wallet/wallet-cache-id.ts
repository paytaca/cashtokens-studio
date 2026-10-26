import { binToHex, sha256, utf8ToBin } from 'bitauth-libauth-v3'

/**
 * Opaque, stable identity for wallet-scoped cache rows (authhead snapshots, the persisted active
 * authhead). One IndexedDB per network; this id separates the wallets inside it.
 *
 * The digest is truncated to 16 hex chars: uniqueness is all a same-origin cache key needs, and a
 * shorter id keeps rows readable in devtools. Hashing keeps raw xpubs out of an on-disk key.
 */
const digest = (value: string) => binToHex(sha256.hash(utf8ToBin(value))).slice(0, 16)

/**
 * WizardConnect: identity is the receive xpub. It is stable across address derivation changes and
 * across reconnects, unlike an address taken from the current UTXO scan.
 */
export const wizardConnectCacheId = (receiveXpub: string) => `ctswz${digest(receiveXpub)}`

/** WalletConnect: a session only carries a single address, so that address is the identity. */
export const walletConnectCacheId = (address: string) => `ctswc${digest(address)}`
