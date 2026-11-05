import { fetchWithTimeout } from '../utils/fetch-with-timeout';
import { decodeBcmrOpReturn } from '../bcmr';
import { inbrowserGatewayUrl, isCID, parseIpfsUrl } from '../ipfs';
import { type BaseParams } from './types';
import { getAuthheadReserve } from './get-authhead-supply';

export { getTokenHolders } from './get-token-holders'
export type { GetTokenHoldersParams } from './get-token-holders'

export { getTokenGenesis } from './get-token-genesis'
export type { GetTokenGenesisParams, GetTokenGenesisResponse } from './get-token-genesis'

export {
    TOKEN_BURNER_LOCKING_BYTECODE_HEX,
    circulatingStatsFromUnspentOutputs,
    getTokenSupply,
    isBurnScript,
    sumFungibleAmounts,
} from './get-token-supply'
export type { GetTokenSupplyParams, TokenSupplyStats } from './get-token-supply'

export { getAuthheadReserve } from './get-authhead-supply'
export type { GetAuthheadReserveParams, AuthheadReserve } from './get-authhead-supply'

export { getAuthchain } from './get-authchain'
export type { AuthchainEntry, AuthchainPublication, GetAuthchainParams } from './get-authchain'

export async function fetchAuthheadTxid(params: BaseParams): Promise<string> {
    const reserve = await getAuthheadReserve({
        authbase: params.authbase,
        chainGraphUrl: params.chainGraphUrl,
    })
    if (!reserve) {
        throw new Error(`No authchain found for authbase ${params.authbase}`)
    }
    return reserve.authheadTxid
}

export async function getGenesis(params: {category: string, chainGraphUrl?: string}): Promise<string|undefined> {

  const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL

  if (!url)  {
      throw new Error('ChainGraph url required')
  }

  // query FindGenesisTransaction($tokenCategoryId: bytea!) {
  //     # 1. Search for the Genesis Transaction that spent the category's outpoint 0
  //     transaction(
  //       where: {
  //         inputs: {
  //           outpoint_transaction_hash: { _eq: $tokenCategoryId }
  //           outpoint_index: { _eq: 0 }
  //         }
  //       }
  //     ) {
  //       # This is the actual Genesis TXID (Transaction B)
  //       authbase: hash 
        
  //       block_inclusions {
  //         block {
  //           height
  //           timestamp
  //         }
  //       }
        
  //       # 2. Extract the Libauth-style flattened output fields
  //       outputs(where: { token_category: { _is_null: false } }) {
  //         output_index
  //         valueSatoshis: value_satoshis
  //         lockingBytecode: locking_bytecode
  //         token_category
  //         fungible_token_amount
  //         nonfungible_token_capability
  //         nonfungible_token_commitment
  //       }
  //     }
  //   }
    

  // Query Variables 
  // {
  //     "tokenCategoryId": "\\x96b59aeb1e693daf667eb03436b7f08aca5e231c8b5d5d5f41e6e8f1c0150e5d"
  //   }


  const payload = {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        operationName: "FindGenesisTransaction",
        variables: {
          category: `\\x${params.category}`
        },
        
        query: `
          query FindGenesisTransaction($category: bytea!) {
            transaction(
              where: {
                inputs: {
                  outpoint_transaction_hash: { _eq: $category }
                  outpoint_index: { _eq: 0 }
                }
              }
            ) {

              genesis: hash 
              
              block_inclusions {
                block {
                  height
                  timestamp
                }
              }
              
              inputs {
                outpoint_transaction_hash,
                outpoint_index
              }
              outputs(where: { token_category: { _is_null: false } }) {
                output_index
                valueSatoshis: value_satoshis
                lockingBytecode: locking_bytecode
                token_category
                fungible_token_amount
                nonfungible_token_capability
                nonfungible_token_commitment
              }
            }
          }
        `,
      }),
    };

  let response: any = await fetchWithTimeout(url, payload);

  if (response.status >= 400) {
      throw response.statusText;
  }

  response = await response.json();
  return response as string
}

export async function fetchMintedNftsByCategory (params: {category: string, chainGraphUrl?: string}) {

  const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL

  if (!url)  {
      throw new Error('ChainGraph url required')
  }
  
  const payload = {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      operationName: "FindGenesisTransaction",
      variables: {
        category: `\\x${params.category}`
      },
      query: `
        query GetNFTsByCategory($category: bytea!) {
          output(
            where: {
              token_category: { _eq: $category }
              # Filters out any outputs that have a matching spent_by transaction entry
              _not: { spent_by: {} } 
            }
          ) {
            spent_by {
              outpoint_transaction_hash
            }
            transaction_hash
            output_index
            fungible_token_amount
            nonfungible_token_capability
            nonfungible_token_commitment
          }
        }
      `,
    }),
  };

  let response: any = await fetchWithTimeout(url, payload);

  if (response.status >= 400) {
      throw response.statusText;
  }
  response = await response.json();
  return response
}

export async function fetchLastRegistryPublication(params: BaseParams) {

  const url = params.chainGraphUrl || import.meta.env.VITE_CHAINGRAPH_URL
  
  if (!url)  {
      throw new Error('ChainGraph url required')
  }

  let result = {
    authbase: params.authbase,
    txHash: '',
    contentHash: '',
    uris: [],
    urisOriginal: [],
    httpsUrl: "",
  } as any

  const query = `{transaction(where:{hash:{_eq:"\\\\x${params.authbase}"}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:"6a04%"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:"0"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:"6a04%"}}){output_index locking_bytecode}}}}}}`

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
  if (!data) return result
  const lastPublicationTxid = data.transaction?.[0]?.authchains?.[0]?.migrations?.[0]?.transaction[0]?.hash 
  const opReturnOutput = data.transaction?.[0]?.authchains?.[0]?.migrations?.[0]?.transaction[0]?.outputs?.[0]
  const publication = decodeBcmrOpReturn(opReturnOutput.locking_bytecode)
  if (!publication) return result

  try {
    result = {
      ...result,
      txHash: lastPublicationTxid?.replace('\\x', ''),
      contentHash: publication.contentHash
    }

    if (publication.bareCid) {
      // IPFS publication output: `OP_RETURN "BCMR" <bare CID>` with no URI chunks.
      // (mainnet-js v2 derived `ipfs://<cid>` from this same payload.)
      const cid = publication.uris[0] || ''
      if (isCID(cid)) {
        result.uris.push(`ipfs://${cid}`)
        result.httpsUrl = inbrowserGatewayUrl(cid)
      }
      return result
    }

    // Process published URIS
    publication.uris.forEach((uri) => {
      result.urisOriginal!.push(uri)
      try {

        if (isCID(uri)) { // handle maybe older publications that didn't include ipfs:// scheme to the cid
          result.httpsUrl = inbrowserGatewayUrl(uri)
          return result.uris.push(`ipfs://${uri}`)
        }
        
        const url = new URL(uri.includes('://') ? uri: `https://${uri}`)
        
        if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
          const { id: cid }  = parseIpfsUrl(uri)
          result.httpsUrl = inbrowserGatewayUrl(cid)
          return result.uris.push(uri as string)
        }

        if (url.protocol === 'https:') {
          let candidateUrl = `${url.protocol}//${url.host}`

          if (url.pathname && url.pathname !== '/') {

            candidateUrl = url.href

          } else {
            
            candidateUrl = `${candidateUrl}/.well-known/bitcoin-cash-metadata-registry.json`

          }
          
          if (!result.httpsUrl) {
            result.httpsUrl = candidateUrl
          }
          
          return result.uris.push(result.httpsUrl)
          
        }

      } catch (error) {
        console.error('@fetchLastRegistryPublication:', error)
      }
      result.uris.push(uri as string)
    })

    return result
  } catch (error) {
    console.error('@fetchLastRegistryPublication:', error)
    return result
  }

}

