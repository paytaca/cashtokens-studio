import { getTokenLiquidityPools } from "./get-token-liquidity-pool"


function roundToSignificantDigits(num: number, digits: number) {
    if (num === 0) return "0";
    const magnitude = Math.floor(Math.log10(Math.abs(num)));
    const decimalPlaces = Math.max(0, -magnitude + (digits - 1));
    return num.toLocaleString('en-US', {
        style: 'decimal',
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    });
}

/**
 * Based on how Cauldron derive the market price on the Liquidity Pool page (Manual observation using the Token Liquidity Pools data). 
 */
export async function getTokenMarketPrice(params: { category: string, tokenDecimals?: number, cauldronIndexerUrl: string }) {
    
    const pools = await getTokenLiquidityPools(params) || []
    
    const largestPool = pools.reduce((acc: any, next: any) => {
        if (Object.keys(acc).length === 0) return next 
  
        if (next.sats > acc.sats) {
          acc = next 
        }
  
        return acc
      }, {})

    const token = largestPool.tokens / Number(`1e${params.tokenDecimals ?? 0}`)
    const bch = largestPool.sats / 1e8
    const price = (bch / token).toLocaleString('en-US', { 
        style: 'decimal', 
        maximumFractionDigits: 20 
    });

    return {
        price,
        priceRounded: roundToSignificantDigits(Number(price), 5),
        sourcePool: largestPool
    }
    
}


