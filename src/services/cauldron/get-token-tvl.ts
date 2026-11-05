import { getTokenLiquidityPools } from "./get-token-liquidity-pool"

/**
 * @returns Active Token Category Pools
 */
export async function getTokenTvl(params: { category: string, cauldronIndexerUrl: string }) {
    const pools = await getTokenLiquidityPools(params) || []
    const bch = pools.reduce((acc: number, next: any) => acc = acc + next.sats, 0)
    const token = pools.reduce((acc: number, next: any) => acc = acc + next.tokens, 0)
    return {
        bch,
        token
    }
}