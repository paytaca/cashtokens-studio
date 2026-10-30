export * from './create-airdrop-beacon-contract'
export * from './opt-in'


export const MAX_AIRDROP_RECIPIENTS = 50
export const AIRDROP_NFT_ADMIN_ID = 'airdrop'

export function getBeaconNftTokenCategory (): string {
    return import.meta.env.VITE_AIRDROP_BEACON_TOKEN_CATEGORY
}

/** The beacon category is baked in at build time; without it the airdrop feature is parked. */
export const isAirdropBeaconConfigured = (): boolean => Boolean(getBeaconNftTokenCategory())