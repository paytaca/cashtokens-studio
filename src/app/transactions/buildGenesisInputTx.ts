import { NFTCapability, OpReturnData, SendRequest, TestNetWallet, TokenI, TokenSendRequest, UnitEnum, UtxoI, Wallet, hexToBin } from "mainnet-js"

import { DEFAULT_TOKEN_VALUE } from "../constants"
import { calcMinerFee } from "../utils"
import { getInstance } from "../contracts"
import { Utxo } from "cashscript"
import { decodeTransaction } from "@bitauth/libauth"

export type GenesisInputOptions = {
  wallet: Wallet|TestNetWallet
}

export type GenesisInputResult = {
  encoded: any,
  decoded: any,
  sourceOutputs: any
}

export const genesisInputCost = calcMinerFee({ P2PKH: 1 }, { P2PKH:1 }) + DEFAULT_TOKEN_VALUE + 400

/**
 * Creates a transaction that produces a valid genesis input. Basically just transfer funds to 
 * the same wallet. :-) 
 */
export const buildGenesisInputTx = async (opt: GenesisInputOptions): Promise<GenesisInputResult> => {
    const funds = (await opt.wallet.getAddressUtxos()).filter((u:UtxoI)=> Boolean(!u.token) && u.satoshis > genesisInputCost)[0]
    if (!funds) {
      throw new Error('Insufficient balance! If you have BCH in your account, please try to consolidate your utxos.')
    }
    const { encodedTransaction, sourceOutputs } = await opt.wallet.encodeTransaction(
      [new SendRequest({
        cashaddr: opt.wallet!.getDepositAddress(),
        value: DEFAULT_TOKEN_VALUE,
        unit: UnitEnum.SATOSHIS
      })],
      false,
      {
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: [funds],
        ensureUtxos: [funds]
      }
    )
  return { encoded: encodedTransaction, decoded: decodeTransaction(encodedTransaction), sourceOutputs }
}