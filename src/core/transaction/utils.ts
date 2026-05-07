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
/**
   * Converts values to exportable json safe format.
   * Binary -> hex, bigint -> string
   * 
   * @return {Object} pst
   */
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

  /**
   * A JSON reviver that converts
   * hex -> binary , string -> bigint (for keys that's expected to be bigint)
   * 
   * @return {Object} pst
   */
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