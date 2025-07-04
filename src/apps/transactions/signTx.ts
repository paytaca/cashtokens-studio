import { TransactionCommon } from "@bitauth/libauth"
import { TransactionSigner } from "../types"
import { SigningResult } from "./types"

export const signTx = async (args: {signer: TransactionSigner, decodedTx: TransactionCommon, sourceOutputs: any, broadcast?: boolean, prompt?: string}): Promise<SigningResult> => {
  return await args.signer?.signTransaction(args.decodedTx, args.sourceOutputs, args.broadcast, args.prompt || 'CashTokens Studio signature request')
}