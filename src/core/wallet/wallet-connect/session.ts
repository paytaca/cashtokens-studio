import { binToHex, decodeTransactionCommon, hexToBin } from 'bitauth-libauth-v3'
import type { SignTransactionRequest } from '@wizardconnect/core'
import {
  walletConnectSignMessage,
  walletConnectSignTransaction,
  type WalletConnectClient,
  type WalletConnectSession
} from './client'

/**
 * The WalletConnect counterpart of `DappConnectionManager.signTransaction`.
 *
 * The transaction builders emit a WizardConnect envelope — `action`, `sequence`, `inputPaths` —
 * whose `transaction` field is the WalletConnect payload. Only that field travels over the wire:
 * `inputPaths` exists so a WizardConnect wallet can derive the signing key from an xpub, while a
 * WalletConnect wallet already knows the address it is signing for.
 */
export type WalletConnectSigner = {
  signTransaction(
    request: SignTransactionRequest,
    options?: { signal?: AbortSignal }
  ): Promise<{ signedTransaction: string }>
  signMessage(request: { message: string; userPrompt?: string }): Promise<string>
}

/**
 * A source output as the builders serialise it: plain hex and decimal strings. WizardConnect's
 * parser accepts that, WalletConnect's schema does not — see `toWalletConnectParams`.
 */
type PlainSourceOutput = {
  outpointTransactionHash: string
  outpointIndex: number
  unlockingBytecode?: string
  sequenceNumber?: number
  valueSatoshis: string
  lockingBytecode: string
  token?: {
    category: string
    amount: string
    nft?: { capability?: string, commitment?: string }
  }
  contract?: PlainContractInfo
}

/** Cashscript's contract descriptor. `redeemScript` is bytes, the rest is plain JSON. */
type PlainContractInfo = {
  abiFunction?: unknown
  redeemScript?: string | Uint8Array
  artifact?: unknown
}

/**
 * WalletConnect's BCH schema validates libauth's `stringify` encoding *strictly*: a `Uint8Array`
 * must be the string `<Uint8Array: 0x…>` and a `bigint` the string `<bigint: …n>`. Plain hex and
 * decimal strings — which the builders produce, and which WizardConnect's lenient parser accepts —
 * are rejected with "Error in validation wallet connect schema".
 *
 * This mirrors cashscript's `generateWcTransactionObject` plus the reference connector's
 * `JSON.parse(stringify(options))`, so the payload is byte-for-byte what WalletConnect wallets are
 * built against. It is applied here, at the edge, and never touches the shared builders.
 */
const walletConnectReplacer = (_key: string, value: unknown) => {
  if (typeof value === 'bigint') return `<bigint: ${value}n>`
  if (value instanceof Uint8Array) return `<Uint8Array: 0x${binToHex(value)}>`
  return value
}

/**
 * `contract.redeemScript` is a `Uint8Array` in the WalletConnect source output, so it has to go back
 * to bytes for the replacer to emit `<Uint8Array: 0x…>`. Builders that go through cashscript's
 * `generateWcTransactionObject` carry the descriptor (the FT-reserves flow); the others do not.
 */
const toNativeContract = (contract: PlainContractInfo) => ({
  ...contract,
  ...(contract.redeemScript !== undefined
    ? {
        redeemScript:
          contract.redeemScript instanceof Uint8Array
            ? contract.redeemScript
            : hexToBin(contract.redeemScript)
      }
    : {})
})

const toNativeSourceOutput = (sourceOutput: PlainSourceOutput) => ({
  outpointTransactionHash: hexToBin(sourceOutput.outpointTransactionHash),
  outpointIndex: sourceOutput.outpointIndex,
  unlockingBytecode: hexToBin(sourceOutput.unlockingBytecode ?? ''),
  sequenceNumber: sourceOutput.sequenceNumber,
  valueSatoshis: BigInt(sourceOutput.valueSatoshis),
  lockingBytecode: hexToBin(sourceOutput.lockingBytecode),
  ...(sourceOutput.token && {
    token: {
      category: hexToBin(sourceOutput.token.category),
      amount: BigInt(sourceOutput.token.amount),
      ...(sourceOutput.token.nft && {
        nft: {
          capability: sourceOutput.token.nft.capability,
          commitment: hexToBin(sourceOutput.token.nft.commitment ?? '')
        }
      })
    }
  }),
  ...(sourceOutput.contract ? { contract: toNativeContract(sourceOutput.contract) } : {})
})

/** The builders hand over the transaction as hex; WalletConnect wallets expect the decoded object. */
const toNativeTransaction = (transaction: string | object) => {
  if (typeof transaction !== 'string') return transaction
  const decoded = decodeTransactionCommon(hexToBin(transaction))
  if (typeof decoded === 'string') throw new Error(decoded)
  return decoded
}

export function toWalletConnectParams(transaction: SignTransactionRequest['transaction']) {
  return JSON.parse(
    JSON.stringify(
      {
        transaction: toNativeTransaction(transaction.transaction as string | object),
        sourceOutputs: (transaction.sourceOutputs as unknown as PlainSourceOutput[]).map(toNativeSourceOutput),
        broadcast: transaction.broadcast ?? false,
        userPrompt: transaction.userPrompt
      },
      walletConnectReplacer
    )
  )
}

export function createWalletConnectSigner(params: {
  client: WalletConnectClient
  session: WalletConnectSession
  chainId: string
}): WalletConnectSigner {
  const { client, session, chainId } = params

  return {
    async signTransaction(request, options) {
      if (options?.signal?.aborted) throw new Error('Signing was cancelled')

      const signing = walletConnectSignTransaction(client, session, {
        chainId,
        request: toWalletConnectParams(request.transaction)
      })

      // WalletConnect has no cancel RPC for `bch_signTransaction`, so an abort only releases the
      // caller — the wallet may still complete the signature on its side. WizardConnect, by
      // contrast, tells the wallet to cancel; this is the one place the two protocols differ.
      if (!options?.signal) return signing

      return Promise.race([
        signing,
        new Promise<never>((_, reject) => {
          options.signal!.addEventListener('abort', () => reject(new Error('Signing was cancelled')), {
            once: true
          })
        })
      ])
    },
    signMessage(request) {
      return walletConnectSignMessage(client, session, { chainId, request })
    }
  }
}
