import { BCMR } from 'mainnet-js';
import { hexToBin } from '@bitauth/libauth'

export type BaseParams = {
    authbase: string,
    chainGraphUrl?: string
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

    const response: any = await fetch(url, payload);
    const responseJson = await response.json();
    const authhead = responseJson?.data?.transaction[0]?.authchains[0].authhead;
    return authhead.hash.replace('\\x', '');
  }

  export async function retrieveLastRegistryPublication(params: BaseParams): Promise<any> {
    
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
          // query: `query {transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          // query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%${n}%\"}}}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          query: `{transaction(where:{hash:{_eq:\"\\\\x${params.authbase}\"}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`,
        }),
      }

    let response: any = await fetch(url, payload);

    if (response.status >= 400) {
    throw response.statusText;
    }

    response = await response.json();

    const result: any = [];

    const migrations = response.data.transaction[0]?.authchains[0].migrations;
    if (!migrations) {
        return result;
    }
    for (const migration of migrations) {
        const transaction = migration.transaction[0];
        if (!transaction) {
            continue;
        }
        transaction.inputs.forEach(
            (input: any) => (input.outpointIndex = Number(input.outpoint_index))
        );
        transaction.outputs.forEach((output: any) => {
                output.outputIndex = Number(output.output_index);
                output.lockingBytecode = hexToBin(
                    output.locking_bytecode.replace('\\x', '')
                );
        });
        // txHash here is the transaction where the last publication occured
        const txHash = transaction.hash.replace('\\x', '');
        result.push({
            authbase: params.authbase,
            ...BCMR.makeAuthChainElement(transaction, txHash),
        });
    }
    return result;
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
          // 1. Label the operation for cleaner network debugging
          operationName: "FindGenesisTransaction",
          
          // 2. Safely inject your token identity variable using the single backslash prefix
          variables: {
            category: `\\x${params.category}`
          },
          
          // 3. Paste your exact functional playground query here
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

    let response: any = await fetch(url, payload);

    if (response.status >= 400) {
        throw response.statusText;
    }

    response = await response.json();

    console.log('Authbase of category', response)
      
    return response as string
      // Example execution inside your Pinia store or component:
      // const response = await fetch('YOUR_CHAINGRAPH_URL', payload);
      // const { data } = await response.json();
      
      
  }