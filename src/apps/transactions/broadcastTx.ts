import { Watchtower } from "../Watchtower"
import { SigningResult } from "./types"

/**
 * Submits a signed transaction
 */
export const broadcastTx = async (signingResult: SigningResult): Promise<string|undefined> => {
  if (signingResult?.signedTransaction) {
    // return ownerWallet!.submitTransaction(hexToBin(signResult.signedTransaction), true)
    const w = new Watchtower()
    const broadcastResp = await w.broadcastTx(signingResult.signedTransaction)
    if (broadcastResp && broadcastResp.success) {
      return broadcastResp.txid
    }
    if (w.error) {
      throw w.error
    }
  }
}