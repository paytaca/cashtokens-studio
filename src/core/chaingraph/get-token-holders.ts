import { fetchWithTimeout } from "../utils/fetch-with-timeout"
import { type CashAddressResult, type DecodedCashAddress, decodeCashAddress, hexToBin, lockingBytecodeToCashAddress } from "bitauth-libauth-v3"

export type GetTokenHoldersParams = { category: string, chainGraphUrl?: string, network?: 'mainnet' | 'chipnet'}

export async function getTokenHolders(params: GetTokenHoldersParams): Promise<Array<string>>{

    const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
    if (!url)  {
        throw new Error('ChainGraph url required')
    }

    const query = `{
        output(
          where: {
            token_category: { _eq: "\\\\x${params.category}" }
            _not:{ spent_by: {} }
          }
        ) {
        
          locking_bytecode
          value_satoshis
          transaction {
            hash
          }
        }
      }`

    const payload = {
        headers: {
        'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
        operationName: null,
        variables: {},
        query
        }),
    }

    const response: any = await fetchWithTimeout(url, payload);

    if (response.status >= 400) {
        
        throw response.statusText;
    }

    const responseText = await response.text()
    const { data } = JSON.parse(responseText || '')
    const addresses = new Set()
    for (const o of data.output) {
        const lockingBytecodeHex = o.locking_bytecode.replace('\\x', '') || ''
        const address = lockingBytecodeToCashAddress({ bytecode: hexToBin(lockingBytecodeHex), tokenSupport: true, prefix: params.network === 'chipnet'? 'bchtest': 'bitcoincash' }) as CashAddressResult
        const decoded = decodeCashAddress(address.address) as DecodedCashAddress
        if (decoded.type === 'p2pkhWithTokens') {
            addresses.add(address.address)
        }
    }
    return Array.from(addresses) as Array<string>
}
