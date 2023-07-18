/* eslint-disable @typescript-eslint/no-explicit-any */
import { BCMR, hexToBin } from 'mainnet-js'
/**
 *
 * Fetch the authchain information from a trusted external indexer
 * The authchain in this implementation is specific to resolve to a valid metadata registry
 *
 * (Modified BCMR.fetchAuthChainFromChaingraph of mainnet-js, only gets the authhead instead of the
 * entire chain)
 *
 * @param  {string} options.chaingraphUrl (required) URL of a chaingraph indexer instance to fetch info from
 * @param  {string} options.transactionHash (required) transaction hash from which to build the auth chain
 * @param  {string?} options.network (default=mainnet) network to query the data from, specific to the queried instance, can be mainnet, chipnet, or anything else
 *
 * @returns {AuthChain} returns the resolved authchain
 */
export default async (options:{chaingraphUrl:string, transactionHash:string, network: string}) => {

  if (!options.chaingraphUrl) {
      throw new Error('Provide `chaingraphUrl` param.');
  }
  if (options.network === undefined) {
      options.network = 'mainnet';
  }

  let response:any = await fetch(options.chaingraphUrl, {
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
      query: `{transaction(where:{hash:{_eq:\"\\\\x${options.transactionHash}\"},node_validation_timeline:{node:{name:{_ilike:\"%${options.network}%\"}}}}){hash authchains{authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
    })
  });
  response = await response.json()
  const result:any[] = [];
  const migrations = response.data.transaction[0]?.authchains[0].migrations;
  if (!migrations) {
      return result;
  }
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
      const txHash = transaction.hash.replace('\\x', '');
      result.push(BCMR.makeAuthChainElement(transaction, txHash));
  }
  return result.filter((element) => element.contentHash.length && element.httpsUrl.length);
}
