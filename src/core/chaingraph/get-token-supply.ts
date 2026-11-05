import { fetchWithTimeout } from "../utils/fetch-with-timeout"

export type GetTokenSupplyParams = { category: string, chainGraphUrl?: string }

export type TokenSupplyStats = {
    /** Fungible amount held in spendable outputs (any capability except `minting`, excluding burns). */
    circulatingSupply: bigint,
    /** Fungible amount parked in OP_RETURN (null-data) outputs, i.e. permanently destroyed. */
    burnedSupply: bigint,
    /** Distinct addresses holding unspent circulating outputs of the category. */
    holders: number,
}

type UnspentTokenOutput = {
    locking_bytecode_hex: string | null,
    fungible_token_amount: bigint | number | string,
    nonfungible_token_capability: 'none' | 'minting' | 'mutable' | null,
}

/** Burns park the token at a null-data script, which always begins with `OP_RETURN` (`6a`). */
export function isBurnScript(lockingBytecodeHex: string | null | undefined): boolean {
    return !lockingBytecodeHex || lockingBytecodeHex.startsWith('6a')
}

export function sumFungibleAmounts(amounts: Array<bigint | number | string>): bigint {
    return amounts.reduce<bigint>((total, amount) => total + BigInt(amount || 0), 0n)
}

/** Pure classification of unspent token outputs into circulating / burned / holders. */
export function supplyStatsFromUnspentOutputs(unspentOutputs: UnspentTokenOutput[]): TokenSupplyStats {
    const burnOutputs = unspentOutputs.filter((output) => isBurnScript(output.locking_bytecode_hex))
    const circulatingOutputs = unspentOutputs.filter(
        (output) =>
            output.nonfungible_token_capability !== 'minting' &&
            !isBurnScript(output.locking_bytecode_hex)
    )

    return {
        circulatingSupply: sumFungibleAmounts(
            circulatingOutputs.map((output) => output.fungible_token_amount)
        ),
        burnedSupply: sumFungibleAmounts(burnOutputs.map((output) => output.fungible_token_amount)),
        holders: new Set(circulatingOutputs.map((output) => output.locking_bytecode_hex)).size,
    }
}

/**
 * Token economics of a category, derived from its unspent outputs.
 *
 * ChainGraph exposes no aggregate fields over `output`, so the sums and the distinct-holder count
 * are computed here from a single unspent-outputs query; the classification stays pure so the
 * accounting rules remain readable and type-safe.
 */
export async function getTokenSupply(params: GetTokenSupplyParams): Promise<TokenSupplyStats> {
    const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
    if (!url) {
        throw new Error('ChainGraph url required')
    }

    const query = `query GetTokenSupply($category: bytea) {
        output(where: { token_category: { _eq: $category }, _not: { spent_by: {} } }) {
            locking_bytecode_hex
            fungible_token_amount
            nonfungible_token_capability
        }
    }`

    const payload = {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
            operationName: 'GetTokenSupply',
            variables: { category: `\\x${params.category}` },
            query
        }),
    }

    const response = await fetchWithTimeout(url, payload)

    if (response.status >= 400) {
        throw response.statusText
    }

    const responseText = await response.text()
    const { data } = JSON.parse(responseText || '')
    const unspentOutputs: UnspentTokenOutput[] = data?.output ?? []

    return supplyStatsFromUnspentOutputs(unspentOutputs)
}
