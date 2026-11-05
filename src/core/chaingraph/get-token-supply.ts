import { fetchWithTimeout } from "../utils/fetch-with-timeout"

/**
 * tokenburner.cash's burner covenant (`gitlab.com/dagurval/contract-burner`, `burner.cash`),
 * compiled as P2SH32: `aa20` + HASH256(redeem script) + `87`.
 *
 * The covenant can only be spent into a single token-free OP_RETURN output, so every fungible
 * amount that ever enters it is destroyed — implicitly, without a token-carrying OP_RETURN. The
 * script is network independent, so it covers both mainnet and chipnet.
 */
export const TOKEN_BURNER_LOCKING_BYTECODE_HEX =
    'aa20fe61963d65350d4baaa445b4697243b1f48c99e8daed32aaf67d5e33534d87fc87'

export type GetTokenSupplyParams = {
    category: string,
    chainGraphUrl?: string,
    /**
     * Exact locking bytecodes (hex) of burn destinations besides OP_RETURN, e.g. the app's burn
     * address. Fungible amounts ever parked there are counted as burned.
     */
    burnLockingBytecodesHex?: string[],
}

export type TokenSupplyStats = {
    /** Fungible amount held in spendable outputs (any capability except `minting`, excluding burns). */
    circulatingSupply: bigint,
    /**
     * Fungible amount ever sent to a burn destination (OP_RETURN, the app's burn address, the
     * tokenburner.cash covenant) whether or not the burn transaction has since destroyed it.
     */
    burnedSupply: bigint,
    /** Distinct addresses holding unspent circulating outputs of the category. */
    holders: number,
}

type TokenOutput = {
    locking_bytecode_hex: string | null,
    fungible_token_amount: bigint | number | string,
    nonfungible_token_capability: 'none' | 'minting' | 'mutable' | null,
}

type FungibleAmountRow = { fungible_token_amount: bigint | number | string }

/** Burns park the token at a null-data script, which always begins with `OP_RETURN` (`6a`). */
export function isBurnScript(lockingBytecodeHex: string | null | undefined): boolean {
    return !lockingBytecodeHex || lockingBytecodeHex.startsWith('6a')
}

export function sumFungibleAmounts(amounts: Array<bigint | number | string>): bigint {
    return amounts.reduce<bigint>((total, amount) => total + BigInt(amount || 0), 0n)
}

/** OP_RETURN plus any explicit burn destination script (the burner covenant, the app's address). */
function isBurnDestination(
    lockingBytecodeHex: string | null | undefined,
    burnLockingBytecodesHex: string[]
): boolean {
    if (isBurnScript(lockingBytecodeHex)) return true
    return !!lockingBytecodeHex && burnLockingBytecodesHex.includes(lockingBytecodeHex)
}

/** Pure classification of unspent outputs into circulating supply and distinct holders. */
export function circulatingStatsFromUnspentOutputs(
    unspentOutputs: TokenOutput[],
    burnLockingBytecodesHex: string[] = []
): Pick<TokenSupplyStats, 'circulatingSupply' | 'holders'> {
    const circulatingOutputs = unspentOutputs.filter(
        (output) =>
            output.nonfungible_token_capability !== 'minting' &&
            !isBurnDestination(output.locking_bytecode_hex, burnLockingBytecodesHex)
    )

    return {
        circulatingSupply: sumFungibleAmounts(
            circulatingOutputs.map((output) => output.fungible_token_amount)
        ),
        holders: new Set(circulatingOutputs.map((output) => output.locking_bytecode_hex)).size,
    }
}

/** ChainGraph caps a single `output` query at 5000 rows; larger categories are paged. */
const OUTPUT_PAGE_SIZE = 5000

/** Runs a paged `output` query, following the row cap until a short page is returned. */
async function fetchOutputPages<T>(
    url: string,
    query: string,
    variables: Record<string, unknown>
): Promise<T[]> {
    const rows: T[] = []

    for (let offset = 0; ; offset += OUTPUT_PAGE_SIZE) {
        const payload = {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({
                variables: { ...variables, limit: OUTPUT_PAGE_SIZE, offset },
                query,
            }),
        }

        const response = await fetchWithTimeout(url, payload)

        if (response.status >= 400) {
            throw response.statusText
        }

        const { data } = JSON.parse((await response.text()) || '')
        const page: T[] = data?.output ?? []

        rows.push(...page)

        if (page.length < OUTPUT_PAGE_SIZE) return rows
    }
}

const UNSPENT_OUTPUTS_QUERY = `query GetTokenSupply($category: bytea, $limit: Int!, $offset: Int!) {
    output(
        where: { token_category: { _eq: $category }, _not: { spent_by: {} } }
        order_by: { transaction_hash: asc, output_index: asc }
        limit: $limit
        offset: $offset
    ) {
        locking_bytecode_hex
        fungible_token_amount
        nonfungible_token_capability
    }
}`

/**
 * Every output ever locked to a burn destination, spent or not. A burn output that has already
 * been consumed (the tokenburner covenant burns by omission, so its outputs do get spent) still
 * counts toward the destroyed total.
 */
const BURNED_OUTPUTS_QUERY = `query GetTokenBurns(
    $category: bytea,
    $burnLockingBytecodes: [String!]!,
    $limit: Int!,
    $offset: Int!
) {
    output(
        where: {
            token_category: { _eq: $category }
            _or: [
                { locking_bytecode_hex: { _like: "6a%" } }
                { locking_bytecode_hex: { _in: $burnLockingBytecodes } }
            ]
        }
        order_by: { transaction_hash: asc, output_index: asc }
        limit: $limit
        offset: $offset
    ) {
        fungible_token_amount
    }
}`

/**
 * Token economics of a category.
 *
 * ChainGraph exposes no aggregate fields over `output`, so the sums and the distinct-holder count
 * are computed here from the category's outputs. Circulating supply comes from the unspent set;
 * burned supply from every output ever sent to a burn destination, so burns that were completed by
 * omission (tokenburner.cash) remain counted after their transaction has been spent.
 */
export async function getTokenSupply(params: GetTokenSupplyParams): Promise<TokenSupplyStats> {
    const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
    if (!url) {
        throw new Error('ChainGraph url required')
    }

    const burnLockingBytecodesHex = params.burnLockingBytecodesHex ?? []

    const [unspentOutputs, burnedOutputs] = await Promise.all([
        fetchOutputPages<TokenOutput>(url, UNSPENT_OUTPUTS_QUERY, {
            category: `\\x${params.category}`,
        }),
        fetchOutputPages<FungibleAmountRow>(url, BURNED_OUTPUTS_QUERY, {
            category: `\\x${params.category}`,
            burnLockingBytecodes: burnLockingBytecodesHex,
        }),
    ])

    return {
        ...circulatingStatsFromUnspentOutputs(unspentOutputs, burnLockingBytecodesHex),
        burnedSupply: sumFungibleAmounts(
            burnedOutputs.map((output) => output.fungible_token_amount)
        ),
    }
}
