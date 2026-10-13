import { decodeAuthenticationInstructions, hexToBin, binToHex, binToUtf8, type AuthenticationInstructionPush } from 'bitauth-libauth-v3'
import { BCMR_PREFIX } from '../bcmr';
import { gatewayUrlToIpfs, isCID, parseIpfsUrl } from '../ipfs';

export type BaseParams = {
    authbase: string,
    chainGraphUrl?: string
}

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 15_000): Promise<Response> {
    return new Promise((resolve, reject) => {
        const controller = new AbortController()
        const id = setTimeout(() => {
            controller.abort()
            reject(new Error(`Chaingraph query timed out after ${timeoutMs}ms`))
        }, timeoutMs)
        fetch(url, { ...options, signal: controller.signal })
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(id))
    })
}

export async function fetchAuthheadTxid(params: BaseParams): Promise<string> {
    
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
            operationName: null,
            variables: {},
            // eslint-disable-next-line quotes
            /* chaingraph authhead query*/
            // eslint-disable-next-line quotes
            // query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%${n}%\"}}}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
            query: `query {transaction(where:{hash:{_eq:"\\\\x${params.authbase}"}}){hash authchains{authhead{hash,identity_output{fungible_token_amount}},authchain_length}}}`,
        }),
    }

    const response: any = await fetchWithTimeout(url, payload);
    const responseJson = await response.json();
    const authhead = responseJson?.data?.transaction[0]?.authchains[0].authhead;
    return authhead.hash.replace('\\x', '');
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
  console.log('@data', data)
  const lastPublicationTxid = data.transaction?.[0]?.authchains?.[0]?.migrations?.[0]?.transaction[0]?.hash 
  const opReturnOutput = data.transaction?.[0]?.authchains?.[0]?.migrations?.[0]?.transaction[0]?.outputs?.[0]
  console.log('@opReturnOutput', opReturnOutput)
  if (!opReturnOutput?.locking_bytecode) return result
  const opReturnOutputLockingBytecode = opReturnOutput.locking_bytecode.replace('\\x', '')
  if (!opReturnOutputLockingBytecode.startsWith(BCMR_PREFIX)) {
    return result
  }
  const opReturnOutputLockingBytecodeBytes = hexToBin(opReturnOutputLockingBytecode)
  try {
    const opReturnOutputLockingBytecodeBytesDecoded = decodeAuthenticationInstructions(opReturnOutputLockingBytecodeBytes)
    console.log('@opReturnOutputLockingBytecodeBytesDecoded', (opReturnOutputLockingBytecodeBytesDecoded[2] as AuthenticationInstructionPush)?.data)
    
    const contentHash = (opReturnOutputLockingBytecodeBytesDecoded[2] as AuthenticationInstructionPush)?.data

     result = {
      ...result,
      txHash: lastPublicationTxid?.replace('\\x', ''),
      contentHash: contentHash ? binToHex(contentHash) : ''
    }

    if (opReturnOutputLockingBytecodeBytesDecoded.length === 3) {
      // IPFS publication output: `OP_RETURN "BCMR" <bare CID>` with no URI chunks.
      // (mainnet-js v2 derived `ipfs://<cid>` from this same payload.)
      const payload = (opReturnOutputLockingBytecodeBytesDecoded[2] as AuthenticationInstructionPush)?.data
      const cid = payload ? binToUtf8(payload) : ''
      if (isCID(cid)) {
        result.uris.push(`ipfs://${cid}`)
        result.httpsUrl = `https://${cid}.ipfs.inbrowser.link`
      }
    }

    if (opReturnOutputLockingBytecodeBytesDecoded.length > 3) {
      // Process published URIS
      opReturnOutputLockingBytecodeBytesDecoded.splice(0, 3)
      opReturnOutputLockingBytecodeBytesDecoded.forEach((opReturnElement) => {
        const uri = binToUtf8((opReturnElement as AuthenticationInstructionPush).data)
        result.urisOriginal!.push(uri)
        try {

          if (isCID(uri)) { // handle maybe older publications that didn't include ipfs:// scheme to the cid
            result.httpsUrl = `https://${uri}.ipfs.inbrowser.link`
            return result.uris.push(`ipfs://${uri}`)
          }
          
          const url = new URL(uri.includes('://') ? uri: `https://${uri}`)
          
          if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
            const { id: cid }  = parseIpfsUrl(uri)
            result.httpsUrl = `https://${cid}.ipfs.inbrowser.link`
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
          console.log('@fetchLastRegistryPublication:', error)
        }
        result.uris.push(uri as string)
      })
    }

    console.log('@result', result)
    // if (chunks.length === 2) { 
    //   // IPFS Publication Output
    //   result.contentHash = binToHex(chunks[1]);
    //   const ipfsCid = binToUtf8(chunks[1]);
    //   result.uris = [`ipfs://${ipfsCid}`];
    //   result.httpsUrl = `${Config.DefaultIpfsGateway}${ipfsCid}`;
    return result
  } catch (error) {
    console.log('@fetchLastRegistryPublication:', error)
    return result
  }

}