import { fetchWithTimeout } from "../utils/fetch-with-timeout"
import { sumFungibleAmounts } from "./get-token-supply"

export type GetTokenGenesisParams = { category: string, chainGraphUrl?: string, network?: 'mainnet' | 'chipnet'}

export type GetTokenGenesisResponse = { genesisTxid: string, genesisFtSupply: string, genesisNftCapability: string | null, genesisTimestamp: string }

export async function getTokenGenesis(params: GetTokenGenesisParams): Promise<GetTokenGenesisResponse>{

    const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
    if (!url)  {
        throw new Error('ChainGraph url required')
    }

    const query = `query GetTokenGenesis($category: bytea) {
        transaction(
          where: {inputs: {outpoint_transaction_hash: {_eq: $category}, outpoint_index: {_eq: 0}}}
        ) {
          hash
          outputs(where: {token_category: {_eq: $category}}) {
            fungible_token_amount
            nonfungible_token_capability
            __typename
          }
          block_inclusions {
            block {
              timestamp
              __typename
            }
            __typename
          }
          __typename
        }
      }`

    const payload = {
        headers: {
        'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
            operationName: 'GetTokenGenesis',
            variables: { category: `\\x${params.category}` },
            query
        }),
    }

    const response: any = await fetchWithTimeout(url, payload);

    if (response.status >= 400) {
        
        throw response.statusText;
    }

    const responseText = await response.text()
    const { data } = JSON.parse(responseText || '')
    const genesisTxid = data?.transaction?.[0]?.hash?.replace('\\x', '') || ''
    // Every category output of the genesis transaction creates supply, so the total is their sum
    // rather than the first output's denomination (which may be the minting NFT with zero tokens).
    const genesisOutputs = data?.transaction?.[0]?.outputs ?? []
    const genesisFtSupply = genesisOutputs.length
        ? sumFungibleAmounts(
            genesisOutputs.map((output: { fungible_token_amount: string }) =>
                output.fungible_token_amount
            )
        ).toString()
        : ''
    const genesisNftCapability = genesisOutputs[0]?.nonfungible_token_capability
    const genesisTimestamp = data?.transaction?.[0]?.block_inclusions?.[0]?.block?.timestamp ?? ''

    return {
        genesisTxid,
        genesisFtSupply,
        genesisNftCapability,
        genesisTimestamp
    }
}

