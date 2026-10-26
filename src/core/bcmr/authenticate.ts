import { fetchAuthheadTxid } from '../chaingraph'
import { fetchTransactionHex } from 'src/services/electrum'
import { authenticateAuthhead } from 'src/services/watchtower'
import { binToHex, decodeTransactionCommon, hexToBin } from 'bitauth-libauth-v3'
import type { OffChainRegistryIdentity } from './bcmr-v2.schema'

export type RegistryAuthenticationResult =
  | { authenticated: true }
  | { authenticated: false; authbase: string }

/**
 * How many authhead transactions ahead of the chain-tracked head are still accepted.
 *
 * Only reached while a run of fresh spends is unconfirmed; once the first one confirms, the chain
 * tracks it and the walk is a single hop. The cap keeps a superseded authhead from costing an
 * unbounded number of electrum requests when it is followed back up its abandoned branch.
 */
const MAX_UNCONFIRMED_AUTHHEAD_HOPS = 8

/**
 * Accept an authhead the indexers cannot see yet because it is a fresh spend of the tracked one.
 *
 * Minting or publishing moves the authhead to output 0 of a new transaction. Until that transaction
 * is confirmed, Watchtower and chaingraph still report the previous authhead as the head, so an
 * otherwise authorised publication is refused. Walk back from the provided authhead along input 0
 * and accept it when the tracked authhead is an ancestor: the authhead output can only be spent
 * with the AuthKey, so every hop was authorised by the same key that authorised the tracked head.
 *
 * Each hop must also re-lock the authbase token in output 0, so an unrelated transaction that
 * happens to spend the authhead does not count as the identity's next authhead.
 */
const isFreshDescendantOfTrackedAuthhead = async (
  authheadTxid: string,
  trackedAuthhead: string,
  authbase: string
): Promise<boolean> => {
  let txid = authheadTxid

  for (let hop = 0; hop < MAX_UNCONFIRMED_AUTHHEAD_HOPS; hop++) {
    let transactionHex: string
    try {
      // Electrum serves mempool transactions here as well as confirmed ones.
      transactionHex = await fetchTransactionHex(txid)
    } catch {
      return false
    }

    const transaction = decodeTransactionCommon(hexToBin(transactionHex))
    if (typeof transaction === 'string') return false

    const identityOutputCategory = transaction.outputs[0]?.token?.category
    if (!identityOutputCategory || binToHex(identityOutputCategory) !== authbase) return false

    const authheadSpend = transaction.inputs[0]
    if (!authheadSpend || authheadSpend.outpointIndex !== 0) return false

    const parentTxid = binToHex(authheadSpend.outpointTransactionHash)
    if (parentTxid === trackedAuthhead) return true

    txid = parentTxid
  }

  return false
}

/**
 * TEMPORARY PUBLISH OVERRIDE — REMOVE BEFORE THE GUARD IS EXPECTED TO PROTECT AGAIN.
 *
 * TODO(authentication): delete this switch (and the early return in `authenticate` below) once the
 * authchain providers can be trusted again. While `true`, every on-chain registry identity is treated
 * as authenticated: a publish from a superseded authhead will fork the identity instead of being
 * refused. Off-chain registries were never gated by this check, so they are unaffected either way.
 */
const SKIP_AUTHCHAIN_AUTHENTICATION = false

/**
 * Determine whether `authheadTxid` is authorized to publish the registry
 * identified by `registryIdentity`.
 *
 * - If `registryIdentity` is an authbase (string), the registry is
 *   chain-resolved: the provided authhead must be the current authhead of that
 *   authbase's authchain, or a not-yet-indexed spend of it (see
 *   `isFreshDescendantOfTrackedAuthhead`), so publishing straight after a mint
 *   does not have to wait for a confirmation.
 * - If it is an off-chain IdentitySnapshot (object), on-chain resolution is not
 *   supported and trust is DNS/HTTPS-based, so there is no authchain to verify.
 *
 * The authchain check is done by Watchtower first, falling back to a direct
 * chaingraph query when Watchtower errors or reports the authhead as not
 * authenticated, so a single provider being down or lagging cannot make a
 * legitimate publication look unauthenticated.
 *
 * Note: CHIP-BCMR anchors authentication to the authbase, not `token.category`
 * (a migrated identity's category may differ from its authbase).
 */
export async function authenticate(
  authheadTxid: string,
  registryIdentity: OffChainRegistryIdentity | string
): Promise<RegistryAuthenticationResult> {
  if (SKIP_AUTHCHAIN_AUTHENTICATION) {
    console.warn(
      '[bcmr] authchain authentication is bypassed (SKIP_AUTHCHAIN_AUTHENTICATION) — registry publications are unguarded'
    )
    return { authenticated: true }
  }

  // Off-chain registry identity → authenticated via DNS/HTTPS, not the authchain. Registry records
  // persist that identity as `offchain:<hash>` (see the registry worker), so the prefixed string
  // must take the same path as the object form.
  if (typeof registryIdentity !== 'string' || registryIdentity.startsWith('offchain:')) {
    return { authenticated: true }
  }

  const authbase = registryIdentity

  // Primary provider. A single attempt with a short timeout only: the chaingraph
  // query below is the redundancy, so retrying here would just delay the answer
  // (the retry helper defaults to 3 attempts with 8s timeouts).
  try {
    const watchtowerAuthenticated = await authenticateAuthhead(authbase, authheadTxid, {
      attempts: 1,
      timeoutMs: 5000,
    })

    if (watchtowerAuthenticated) {
      return { authenticated: true }
    }
  } catch {
    // Watchtower unreachable or failed → resolve it directly instead.
  }

  const trackedAuthhead = await fetchAuthheadTxid({ authbase })
  if (trackedAuthhead === authheadTxid) {
    return { authenticated: true }
  }

  // The authhead may be a spend of the tracked head that has not been indexed yet.
  if (await isFreshDescendantOfTrackedAuthhead(authheadTxid, trackedAuthhead, authbase)) {
    return { authenticated: true }
  }

  return { authenticated: false, authbase }
}
