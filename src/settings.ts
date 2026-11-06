export type ReleaseTag = 'experimental' | 'alpha' | 'beta' | 'rc' | 'new'

const RELEASE_TAGS: readonly ReleaseTag[] = ['experimental', 'alpha', 'beta', 'rc', 'new']

/** A switch is on only when its variable is exactly `true`; anything else leaves it off. */
const isEnabled = (value: string | undefined): boolean =>
    value?.trim().toLowerCase() === 'true'

/** Unknown or misspelled tags are dropped rather than rendered as a badge. */
const readReleaseTag = (value: string | undefined): ReleaseTag | undefined => {
    const normalized = value?.trim().toLowerCase() as ReleaseTag | undefined
    return normalized && RELEASE_TAGS.includes(normalized) ? normalized : undefined
}

export const settings = {
    cauldron: {
        enabled: isEnabled(import.meta.env.VITE_CAULDRON_ENABLED),
        // Undefined means production: the feature ships without a pre-release badge.
        releaseTag: readReleaseTag(import.meta.env.VITE_CAULDRON_RELEASE_TAG),
    },
}
