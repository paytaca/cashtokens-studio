import { BCMR, NetworkType, hexToBin } from "mainnet-js";

export class ChainGraph {

  chainGraphUrl: string
  network?: string
  processing?: string
  constructor(options?: { chainGraphUrl?: string}) {
    this.chainGraphUrl = options?.chainGraphUrl || 'https://gql.chaingraph.pat.mn/v1/graphql'
  }

  async fetchAuthheadTxid(tokenId: string): Promise<string> {
    try {
      let response:any = await fetch(this.chainGraphUrl, {
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
          // query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%${n}%\"}}}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          query: `query {transaction(where:{hash:{_eq:"\\\\x${tokenId}"}}){hash authchains{authhead{hash,identity_output{fungible_token_amount}},authchain_length}}}`
        })
      });
      response = await response.json()
      const authhead = response.data.transaction[0]?.authchains[0].authhead;
      return authhead.hash.replace('\\x', '');
    } catch (error) {
      console.log(error)
      throw error
      
    }
    return ''
  }

  
  async retrieveLastRegistryPublication(tokenId: string): Promise<any> {
    this.processing = 'Checking last registry publication, please wait...'

    let n:any = this.network || 'chipnet'
      if (this.network === NetworkType.Testnet) {
        n = 'chipnet'
      }
    try {
      let response:any = await fetch(this.chainGraphUrl, {
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
          // query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%${n}%\"}}}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          // query: `query {transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          // query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%${n}%\"}}}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"}}){hash authchains{authhead{hash}, authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
        })
      });

      if(response.status >= 400) {
        throw response.statusText
      }

      response = await response.json()
      
      const result:any = []

      const migrations = response.data.transaction[0]?.authchains[0].migrations;
      if (!migrations) {
          return result;
      }
      this.processing = 'Registry publication found, parsing...'
      for (const migration of migrations) {
          const transaction = migration.transaction[0];
          if (!transaction) {
              continue;
          }
          transaction.inputs.forEach((input:any) => (input.outpointIndex = Number(input.outpoint_index)));
          transaction.outputs.forEach((output:any) => {
              output.outputIndex = Number(output.output_index);
              output.lockingBytecode = hexToBin(output.locking_bytecode.replace('\\x', ''));
          });
          // txHash here is the transaction where the last publication occured
          const txHash = transaction.hash.replace('\\x', '');
          result.push({
            tokenId: tokenId, ...BCMR.makeAuthChainElement(transaction, txHash)
          });
      }
      return result
    } catch (error) {
      throw error
    } finally {
      this.processing = ''
    }
  }


}