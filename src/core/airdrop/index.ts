export * from './create-airdrop-beacon-contract'
export * from './opt-in'


export const AIRDROP_NFT_ADMIN_ID = 'airdrop'

export function getBeaconNftTokenCategory (): string {
    return import.meta.env.VITE_AIRDROP_BEACON_TOKEN_CATEGORY
}