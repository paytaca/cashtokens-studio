import { fetchAuthheadTxid } from '../chaingraph'
import { authenticateAuthhead } from 'src/services/watchtower'
import type { OffChainRegistryIdentity } from './bcmr-v2.schema'

export type RegistryAuthenticationResult =
  | { authenticated: true }
  | { authenticated: false; authbase: string }

/**
 * Determine whether `authheadTxid` is authorized to publish the registry
 * identified by `registryIdentity`.
 *
 * - If `registryIdentity` is an authbase (string), the registry is
 *   chain-resolved: the provided authhead must be the current authhead of that
 *   authbase's authchain.
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
  if (trackedAuthhead !== authheadTxid) {
    return { authenticated: false, authbase }
  }

  return { authenticated: true }
}
