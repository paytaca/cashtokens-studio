import { Wallet, hexToBin } from "mainnet-js"
import { Watchtower } from "../Watchtower"

/**
 * Submits a signed transaction.
 * TODO: add backup in case Watchtower isn't reachable.
 */
export default async (args: {signingResult: { signedTransaction: string }, signer?: Wallet}): Promise<string|undefined> => {
  if (args.signingResult?.signedTransaction) {
    const w = new Watchtower()
    const broadcastResp = await w.broadcastTx(args.signingResult.signedTransaction)
    if (broadcastResp && broadcastResp.success) {
      return broadcastResp.txid
    }
    if (w.error) {
      throw w.error
    }
  }
}
