import { TransactionCommon } from "@bitauth/libauth"
import { TransactionSigner } from "../types"

export default async (args: {signer: TransactionSigner, decodedTx: TransactionCommon, sourceOutputs: any, broadcast?: boolean, prompt?: string}) => {
  return await args.signer?.signTransaction(args.decodedTx, args.sourceOutputs, args.broadcast, args.prompt || 'CashTokens Studio signature request')
}