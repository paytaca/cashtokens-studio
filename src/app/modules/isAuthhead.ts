import { ChainGraph } from "../ChainGraph"

/**
 * @returns {boolean} true if txid is the current authhead txid
 */
export default async (authbase: string, txid: string):Promise<boolean> => {
  const foundAuthhead = await (new ChainGraph()).fetchAuthheadTxid(authbase)
  return foundAuthhead == txid
}