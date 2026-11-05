import { fetchWithTimeout } from "../utils/fetch-with-timeout"
import { sumFungibleAmounts } from "./get-token-supply"

export type GetAuthheadReserveParams = { authbase: string, chainGraphUrl?: string }

export type AuthheadReserve = {
    authheadTxid: string,
    /** Fungible amount held by the authhead's identity output(s): the token's reserved supply. */
    fungibleTokenAmount: bigint,
    authchainLength: number,
}

type AuthheadOutput = { fungible_token_amount: bigint | number | string }

type AuthchainResponse = {
    authchain_length?: number,
    authhead?: {
        hash: string,
        identity_output?: AuthheadOutput[],
    },
}

/**
 * The current authhead of `authbase` and the fungible tokens it holds.
 *
 * ChainGraph anchors the authchain to its authbase (the registry identity), and an authhead's
 * `identity_output` is the output(s) re-locking the identity token. That output is where an
 * Authguard vault keeps its mintable reserves, so its fungible amount is the reserved supply.
 * Returns `undefined` when the authbase has no indexed authchain/authhead yet.
 */
export async function getAuthheadReserve(
    params: GetAuthheadReserveParams
): Promise<AuthheadReserve | undefined> {
    const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
    if (!url) {
        throw new Error('ChainGraph url required')
    }

    const query = `query GetAuthheadReserve($authbase: bytea) {
        transaction(where: { hash: { _eq: $authbase } }) {
            authchains {
                authchain_length
                authhead {
                    hash
                    identity_output {
                        fungible_token_amount
                    }
                }
            }
        }
    }`

    const payload = {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
            operationName: 'GetAuthheadReserve',
            variables: { authbase: `\\x${params.authbase}` },
            query
        }),
    }

    const response = await fetchWithTimeout(url, payload)
    const responseJson = await response.json()
    const authchain: AuthchainResponse | undefined =
        responseJson?.data?.transaction?.[0]?.authchains?.[0]

    if (!authchain?.authhead) return undefined

    return {
        authheadTxid: String(authchain.authhead.hash).replace('\\x', ''),
        fungibleTokenAmount: sumFungibleAmounts(
            (authchain.authhead.identity_output ?? []).map((output) => output.fungible_token_amount)
        ),
        authchainLength: Number(authchain.authchain_length ?? 0),
    }
}
