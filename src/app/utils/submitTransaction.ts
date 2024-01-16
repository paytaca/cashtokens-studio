import { Wallet, hexToBin } from "mainnet-js"
import { Watchtower } from "../Watchtower"

/**
 * Submits a signed transaction
 */
export default async (signingResult:any, ownerWallet: Wallet): Promise<string|undefined> => {
  if (signingResult?.signedTransaction) {
    // return ownerWallet!.submitTransaction(hexToBin(signResult.signedTransaction), true)
    const broadcastResp = await (new Watchtower()).broadcastTx(signingResult.signedTransaction)
      if (broadcastResp && broadcastResp.success) {
        return broadcastResp.txid
      }
  }
}
