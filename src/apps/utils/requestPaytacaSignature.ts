import { decodeTransaction } from "@bitauth/libauth"

/**
 * Request a signature from Paytaca. The parameters `encodedTransaction` and `sourceOutputs`
 * are results of building unsigned transaction.
 */
export default async (encodedTransaction:any, sourceOutputs:any, prompt?:string): Promise<any> => {
  const decoded = decodeTransaction(encodedTransaction)
  if (typeof decoded === 'string') {
    throw new Error('Error decoding transaction')
  }
  try {
    const signResult = await window.paytaca.signTransaction({
        transaction: decoded,
        sourceOutputs: [...sourceOutputs],
        broadcast: false,
        userPrompt: prompt || 'Signature Requested'
    })
    return signResult
  } catch (error) {
    throw error
  }
}
