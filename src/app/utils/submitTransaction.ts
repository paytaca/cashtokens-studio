import { Wallet, hexToBin } from "mainnet-js"

/**
 * Submits a signed transaction
 */
export default async (signResult:any, ownerWallet: Wallet): Promise<string|undefined> => {
  if (signResult?.signedTransaction) {
    return ownerWallet!.submitTransaction(hexToBin(signResult.signedTransaction), true)
  }
}
