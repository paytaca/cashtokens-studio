import { 
  binToHex,
  cashAddressToLockingBytecode,
  encodeTransactionOutput,
  hexToBin,
  isHex,
  NonFungibleTokenCapability,
  Output,
  readTransactionOutput
} from "@bitauth/libauth";

import { Utxo } from 'mainnet-js-v3';
import { UtxoFormSafe, UtxoWithPath } from "../types";
import { SourceOutput } from "@wizardconnect/core/hdwalletv1-serialize";
import { SEQUENCE_NUMBER_DISABLE_VALUE } from "../constants";
import { WcContractInfo, WcSourceOutput } from "cashscript";

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

export function utxoToLibauthSourceOutput (utxo: Utxo, transportSafe: boolean = false) {

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
