export default async (tokenId: string, network: 'chipnet'|'mainnet'|'testnet' = 'mainnet'): Promise<Response> => {
  return await fetch(
  'https://gql.chaingraph.pat.mn/v1/graphql',
  {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      operationName: null,
      variables: {},
      // eslint-disable-next-line quotes
      /* chaingraph authhead query*/
      // eslint-disable-next-line quotes
      query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%${network}%\"}}}}){hash authchains{authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
    })
  })
}
