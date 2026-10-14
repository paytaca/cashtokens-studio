import { 
  binToHex,
  cashAddressToLockingBytecode,
  decodeTransactionCommon,
  encodeTransactionOutput,
  hexToBin,
  isHex,
  NonFungibleTokenCapability,
  Output,
  readTransactionOutput,
  TransactionCommon
} from "bitauth-libauth-v3";

import { Utxo } from 'mainnet-js-v3';
import { DecoratedUtxoFormSafe, UtxoWithPath } from "../types";
import { SourceOutput } from "@wizardconnect/core/hdwalletv1-serialize";
import { SEQUENCE_NUMBER_DISABLE_VALUE } from "../constants";
import { Network, placeholderP2PKHUnlocker, TransactionBuilder, WcContractInfo, WcSourceOutput } from "cashscript";
import { createAuthguardContract } from "../authguard";
import { CashAddressType, decodeCashAddress, encodeCashAddress } from "bitauth-libauth-v3";
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core";

export function jsonReplacer(k: string, v: any) {
    const binaryKeys = new Set([
      'outpointTransactionHash',
      'outpointTransaction',
      'publicKey',
      'sig',
      'sigHash',
      'redeemScript',
      'lockingBytecode',
      'unlockingBytecode',
      'commitment',
      'capability',
      'category',
    ]);
    
    const bigintKeys = new Set([
      'valueSatoshis',
      'satoshis',
      'amount'
    ]);

    if (k === 'sourceOutput' || k === 'utxo') {
      if (v && isHex(v)) return v
      // encode
      return binToHex(
        encodeTransactionOutput(
          JSON.parse(JSON.stringify(v, jsonReplacer), jsonReviver)
        )
      )
    }

    if (k === 'signatures') {
      const publicKeys = Object.keys(v || {})
      // Convert signatures to hex
      for (const p of publicKeys) {
        if (v[p] && v[p] instanceof Uint8Array) {
          v[p] = binToHex(v[p])
        }
      }
    }

    if (binaryKeys.has(k) && typeof v !== 'string') {
      return binToHex(Uint8Array.from(Object.values(v)))
    }
    
    if (bigintKeys.has(k) && typeof v !== 'string') {
      return v.toString();
    }    
    
    return v
  }

  export function jsonReviver(k: string, v: any) {
    const binaryKeys = new Set([
      'outpointTransactionHash',
      'outpointTransaction',
      'publicKey',
      'sig',
      'sigHash',
      'redeemScript',
      'lockingBytecode',
      'unlockingBytecode',
      'commitment',
      'capability',
      'category',
    ]);
    
    const bigintKeys = new Set([
      'valueSatoshis',
      'amount'
    ]);

    
    if (binaryKeys.has(k) && !(v instanceof Uint8Array)) {
      return hexToBin(v)
    }

    if (k === 'signatures') {
      const publicKeys = Object.keys(v || {})
      // Convert signatures to hex
      for (const p of publicKeys) {
        if (v[p] && isHex(v[p])) {
          v[p] = hexToBin(v[p])
        }
      }
    }
    
    if (bigintKeys.has(k)) {
      return BigInt(v ?? 0)
    }

    if (k === 'sourceOutput' || k === 'utxo') {
      if (isHex(v)) {
        const readResult = readTransactionOutput({ bin: hexToBin(v), index: 0 })
        if (typeof(readResult) === 'string') throw new Error('Error encoding sourceOutput')
        return readResult.result
      }
    }
    return v
  }

export type LibauthSourceOutput = {
  outpointTransactionHash: string|Uint8Array
  outpointIndex: string|bigint
  token?: {
    amount: string|bigint;
    category: string|Uint8Array;
    nft?: {
        capability: `${NonFungibleTokenCapability}`;
        commitment: string|Uint8Array;
    };
  };
  lockingBytecode: string|Uint8Array;
  valueSatoshis: string|bigint;
}

export function utxoToLibauthSourceOutput (utxo: Utxo, transportSafe = false) {

    const lockingBytecode = cashAddressToLockingBytecode(utxo.address)
    if (typeof(lockingBytecode) === 'string') throw new Error('Error converting address to locking bytecode')
    const output: LibauthSourceOutput = {
      outpointTransactionHash: transportSafe? utxo.txid: hexToBin(utxo.txid),
      outpointIndex: transportSafe? `${utxo.vout}`: BigInt(utxo.vout),
      valueSatoshis: transportSafe ? `${utxo.satoshis}`: utxo.satoshis,
      lockingBytecode: transportSafe ? binToHex(lockingBytecode.bytecode): lockingBytecode.bytecode
    }
  
    if (utxo.token) {
      output.token = {
          amount: transportSafe ? `${utxo.token.amount}` : utxo.token.amount,
          category: transportSafe? utxo.token.category: hexToBin(utxo.token.category)
      }

      if (utxo.token.nft) {
          output.token.nft = {
              capability: utxo.token.nft.capability,
              commitment: transportSafe? utxo.token.nft.commitment : hexToBin(utxo.token.nft.commitment ?? '')
          }
      }
    }
    return output
  }

/**
 * Wc instead of Wz is not a mistake. 
 * WizardConnect is also using a WalletConnect type which is exported by cashscript.
 */
export type UtxoToWcSourceOutputParams = {
  utxo: UtxoWithPath, 
  unlockingBytecode?: Uint8Array, 
  contractInfo?: WcContractInfo
}

export function utxoToWcSourceOutput (params: UtxoToWcSourceOutputParams): WcSourceOutput {

  console.log('PARARMS', params)
  const lockingBytecode = cashAddressToLockingBytecode(params.utxo.address)
  if (typeof(lockingBytecode) === 'string') throw new Error('Error decoding utxo address')
  const output: WcSourceOutput = {
    outpointTransactionHash: hexToBin(params.utxo.txid),
    outpointIndex: Number(params.utxo.vout),
    valueSatoshis: params.utxo.satoshis,
    unlockingBytecode: params.unlockingBytecode || new Uint8Array([]),
    lockingBytecode: lockingBytecode.bytecode,
    sequenceNumber: SEQUENCE_NUMBER_DISABLE_VALUE
  }

  if (params.utxo.token) {
    output.token = {
      category: hexToBin(params.utxo.token.category),
      amount: params.utxo.token.amount
    }

    if (params.utxo.token?.nft) {
      output.token.nft = {
        capability: params.utxo.token.nft.capability,
        commitment: hexToBin(params.utxo.token.nft.commitment)
      }
    }
  }
  
  if (params.contractInfo) {
    output.contract = params.contractInfo.contract
  }

   return output
}


export function jsonFormSafeUtxoReviver (k: string, v: unknown) {
  if (k === 'amount') return BigInt(v as string)
  if (k === 'satoshis') return BigInt(v as string)
  return v
}


export function isBroadcastSuccess(broadcastResult: {success?: boolean, error?: boolean, message?: string}) {
  return Boolean(broadcastResult.success) || broadcastResult.message?.includes('txn-already-known') 
}

/**
 * Wallet UTXOs usable for fees: BCH-only, excluding the AuthKey itself (it is an input already),
 * largest first — the same selection every builder makes.
 */
export function usableFunderUtxos(funderUtxos: UtxoWithPath[], excludeUtxo?: UtxoWithPath): UtxoWithPath[] {
  return funderUtxos
    .filter(utxo => !utxo.token &&
      (!excludeUtxo || `${utxo.txid}:${utxo.vout}` !== `${excludeUtxo.txid}:${excludeUtxo.vout}`))
    .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
}

/**
 * Adds the two inputs every AuthGuard spend needs: the vaulted identity output — unlocked with the
 * AuthKey and `keepGuarded = false`, i.e. released from the contract — and the AuthKey UTXO itself.
 * Shared because both the release and the burn builders must spend that output identically.
 */
export function addAuthheadSpendInputs(params: {
  transaction: TransactionBuilder
  authheadUtxo: UtxoWithPath
  authkeyUtxo: UtxoWithPath
  network?: Network
}) {
  if (!params.authheadUtxo?.token) {
    throw new Error('Authhead UTXO must have a token.')
  }
  if (!params.authkeyUtxo?.token) {
    throw new Error('Authkey UTXO is missing.')
  }
  if (params.authkeyUtxo.token.nft?.commitment !== '00') {
    throw new Error('Invalid AuthKey.')
  }

  const authguardContract = createAuthguardContract({
    authkeyTokenId: params.authkeyUtxo.token.category,
    network: params.network
  })

  if (authguardContract.unlock?.unlockWithNft === undefined) {
    throw new Error('Error creating Authguard contract.')
  }

  params.transaction.addInput(
    params.authheadUtxo,
    authguardContract.unlock.unlockWithNft(false) as any
  )
  params.transaction.addInput(
    params.authkeyUtxo,
    placeholderP2PKHUnlocker(params.authkeyUtxo.address)
  )

  const decodedAuthkeyAddress = decodeCashAddress(params.authkeyUtxo.address)
  if (typeof decodedAuthkeyAddress === 'string') {
    throw new Error('Error decoding Authkey address')
  }
  const authkeyTokenAddress = encodeCashAddress({
    payload: decodedAuthkeyAddress.payload,
    prefix: decodedAuthkeyAddress.prefix,
    type: CashAddressType.p2pkhWithTokens
  }).address

  return { authguardContract, authkeyTokenAddress }
}

/**
 * Wraps a built transaction as a WizardConnect sign request, filling in the AuthGuard contract's
 * unlocking bytecode for the identity input (index 0 of `spentUtxos`).
 */
export function buildSignRequest(
  transaction: TransactionBuilder,
  transactionHex: string,
  spentUtxos: UtxoWithPath[],
  userPrompt: string
): SignTransactionRequest {
  const sourceOutputs = spentUtxos.map((utxo) => {
    const args: UtxoToWcSourceOutputParams = { utxo }
    return utxoToWcSourceOutput(args)
  })

  const authheadIndex = sourceOutputs.findIndex(s =>
    `${binToHex(s.outpointTransactionHash)}:${s.outpointIndex}` ===
    `${spentUtxos?.[0]?.txid}:${spentUtxos?.[0]?.vout}`
  )
  if (authheadIndex === -1) {
    throw new Error('Authhead UTXO not found in source outputs')
  }

  const decodedTransaction = decodeTransactionCommon(hexToBin(transactionHex)) as TransactionCommon
  const unlockingBytecode = transaction.inputs[authheadIndex]?.unlocker.generateUnlockingBytecode({
    transaction: decodedTransaction as TransactionCommon,
    sourceOutputs: sourceOutputs.map((sourceOutput) => ({
      lockingBytecode: sourceOutput.lockingBytecode,
      token: sourceOutput.token,
      valueSatoshis: sourceOutput.valueSatoshis
    })) as Output[],
    inputIndex: authheadIndex
  })

  sourceOutputs[authheadIndex]!.unlockingBytecode = unlockingBytecode as Uint8Array

  return {
    action: RelayMsgAction.SignTransactionRequest,
    transaction: {
      transaction: transactionHex,
      sourceOutputs: JSON.parse(JSON.stringify(sourceOutputs, jsonReplacer)),
      userPrompt: userPrompt,
      broadcast: false
    },
    inputPaths: spentUtxos.map((utxo, inputIndex) => {
      if (!utxo.pathName) {
        return []
      }
      return [inputIndex, utxo.pathName, utxo.addressIndex]
    }).filter(p => p.length === 3) as [number, string, number][]
  } as SignTransactionRequest
}
