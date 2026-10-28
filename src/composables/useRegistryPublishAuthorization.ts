import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { authenticate } from 'src/core/bcmr'
import { shortenTokenId } from 'src/core/utils'

/**
 * Guards registry publications.
 *
 * A registry update is only valid when the authhead being spent is the authhead the authchain
 * currently tracks for that registry's authbase; publishing under any other authhead would fork
 * the identity onto an unauthorized chain. The check itself lives in `core/bcmr/authenticate`
 * (Watchtower first, chaingraph fallback); this composable adds the app-level policy — off-chain
 * registries have no authchain to verify, and a failed check is explained to the user before the
 * publish is abandoned.
 */
export const useRegistryPublishAuthorization = () => {
  const $q = useQuasar()
  const { t } = useI18n()

  const ensureAuthorized = async (params: {
    authheadTxid: string,
    /**
     * Authbase of the registry being published, or its persisted `offchain:<hash>` identity.
     * Empty when the record carries no identity yet — nothing to verify against.
     */
    registryIdentity?: string,
  }): Promise<boolean> => {
    const identity = params.registryIdentity || ''

    // Off-chain and brand-new registries have no authchain: trust is DNS/HTTPS, as it always was.
    if (!identity || identity.startsWith('offchain:')) return true

    const result = await authenticate(params.authheadTxid, identity)
    if (result.authenticated) return true

    await new Promise<void>((resolve) => {
      $q.dialog({
        message: t('error.unauthorizedRegistryAuthhead', { category: shortenTokenId(result.authbase) }),
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg',
      }).onDismiss(() => resolve())
    })

    return false
  }

  return { ensureAuthorized }
}
