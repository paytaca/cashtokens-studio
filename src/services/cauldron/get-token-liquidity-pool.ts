export interface CauldronActivePool {
    owner_p2pkh_addr: string;
    owner_pkh: string;
    sats: number;
    token_id: string;
    tokens: number;
    tx_pos: number;
    txid: string;
  }

/**
 * @returns Active Token Category Pools
 */
export async function getTokenLiquidityPools(params: { category: string, cauldronIndexerUrl: string }){
    const result = await fetch(`${params.cauldronIndexerUrl}/pool/active?token=${params.category}`)
    const data = await result.json() 
    console.log('@data', data)
    const bch = data.active.reduce((acc: number, next: any) => acc = acc + next.sats, 0)
    const tokens = data.active.reduce((acc: number, next: any) => acc = acc + next.tokens, 0)
    const largestPool = data.active.reduce((acc: any, next: any) => {

      if (Object.keys(acc).length === 0) return next 

      if (next.sats > acc.sats) {
        acc = next 
      }

      return acc
    }, {})
    // console.log('@bch', bch / 1e8)
    // console.log('@tokens', tokens / 1e2)
    // console.log('@largest pool', largestPool)
    return data.active as CauldronActivePool[]
}



// await getTokenLiquidityPools({ category: '963dbc7d3e3b0e9aab4b34c4fc84f5d03a899b6a53ca831bb26665cc992bab0f', cauldronIndexerUrl: 'https://indexer.cauldron.quest/cauldron'})
