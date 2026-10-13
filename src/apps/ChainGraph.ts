export class ChainGraph {
  chainGraphUrl: string;
  network?: string;
  processing?: string;
  constructor(options?: { chainGraphUrl?: string }) {
    this.chainGraphUrl =
      options?.chainGraphUrl || 'https://gql.chaingraph.pat.mn/v1/graphql';
  }

  async fetchAuthheadTxid(tokenId: string): Promise<string> {
    try {
      let response: any = await fetch(this.chainGraphUrl, {
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
          query: `query {transaction(where:{hash:{_eq:"\\\\x${tokenId}"}}){hash authchains{authhead{hash,identity_output{fungible_token_amount}},authchain_length}}}`,
        }),
      });
      response = await response.json();
      const authhead = response.data.transaction[0]?.authchains[0].authhead;
      return authhead.hash.replace('\\x', '');
    } catch (error) {
      console.log(error);
      throw error;
    }
    return '';
  }

}
