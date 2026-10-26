import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { DEFAULT_FEE_RATE_SATS_PER_KB, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { isTokenAwareAddress } from "../utils"
import { buildWcSourceOutputs, jsonReplacer } from "./utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"

export type TransferNftsParams = {
    /**
     * The NFT UTXOs to move — one output each. Every `token` is carried over exactly as it is:
     * `amount`, `nft.capability` and `nft.commitment` are never recalculated, and each output keeps
     * the satoshis of the input it came from, so the UTXO moves whole. A UTXO with `amount: 10n` and
     * `nft: { capability: 'none', commitment: 'aa' }` arrives unchanged, and a pure NFT (`amount: 0n`)
     * stays a pure NFT.
     */
    nfts: UtxoWithPath[]
    /** Must already be a token-aware (z-prefix) CashAddr: it is validated, never rewritten. */
    recipientAddress: string
    /** Where the leftover BCH from the funder inputs goes — a plain wallet address. */
    changeAddress: string
    walletUtxos: UtxoWithPath[]
    network?: Network
    /** Prompt shown by the wallet while signing, passed in from i18n so core holds no UI copy. */
    userPrompt: string
}

/**
 * Fee estimate for the wallet transfer. cashscript builds with placeholder unlockers, so the size it
 * reports omits every scriptSig and the change output has to be added in — see
 * `P2PKH_UNLOCKING_BYTECODE_BYTESIZE`.
 */
const minimumFeeFor = (transaction: TransactionBuilder, transactionHex: string) =>
    getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        DEFAULT_FEE_RATE_SATS_PER_KB
    )

/**
 * Move NFT UTXOs between wallets. This is a plain P2PKH spend: the tokens ride along on their own
 * UTXOs and the fee comes from separate BCH-only inputs, so nothing about the tokens is touched.
 * NFTs held by a contract (an AuthGuard vault) need the contract's own unlocker instead.
 */
export function transferNfts(params: TransferNftsParams): SignTransactionRequest {
    if (!params.nfts.length) throw new Error('No NFT UTXO to transfer.')

    if (!isTokenAwareAddress(params.recipientAddress)) {
        throw new Error('Recipient address cannot receive tokens: use a token-aware (z-prefix) address.')
    }

    const nfts = params.nfts.map((nft) => {
        if (!nft.token) throw new Error(`UTXO ${nft.txid}:${nft.vout} has no token to transfer.`)
        return nft
    })

    const funderUtxos = params.walletUtxos
        .filter(u => {
            if (u.token) return false
            return !nfts.some(n => n.txid === u.txid && n.vout === u.vout)
        })
        .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))

    const funderInput = funderUtxos.shift()
    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    const spentUtxos = [...nfts, funderInput]

    for (const nft of nfts) {
        transaction.addInput(nft, placeholderP2PKHUnlocker(nft.address))
        transaction.addOutput({
            to: params.recipientAddress,
            amount: nft.satoshis,
            token: nft.token
        })
    }

    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))

    // The NFT inputs fund their own outputs, so only the fee has to come out of the funder.
    let transactionHex = transaction.build()
    let minimumFee = minimumFeeFor(transaction, transactionHex)
    let totalSatoshiFunds = BigInt(funderInput.satoshis)
    let enoughFunds = totalSatoshiFunds > minimumFee
    const change = totalSatoshiFunds - minimumFee
    let changeOutputIndex = -1
    if (change > 546n) {
        transaction.addOutput({
            to: params.changeAddress,
            amount: change
        })
        changeOutputIndex = transaction.outputs.length - 1
        transactionHex = transaction.build()
    }

    while (funderUtxos.length > 0 && !enoughFunds) {
        const additionalFunderInput = funderUtxos.shift() as UtxoWithPath
        transaction.addInput(
            additionalFunderInput,
            placeholderP2PKHUnlocker(additionalFunderInput.address)
        )
        spentUtxos.push(additionalFunderInput)
        totalSatoshiFunds += BigInt(additionalFunderInput.satoshis)
        transactionHex = transaction.build()

        minimumFee = minimumFeeFor(transaction, transactionHex)
        enoughFunds = totalSatoshiFunds > minimumFee
        const newChange = totalSatoshiFunds - minimumFee
        if (newChange > 546n) {
            if (changeOutputIndex === -1) {
                transaction.addOutput({
                    to: params.changeAddress,
                    amount: newChange
                })
                changeOutputIndex = transaction.outputs.length - 1
            } else {
                transaction.outputs[changeOutputIndex]!.amount = newChange
            }
            transactionHex = transaction.build()
        }
        if (enoughFunds) break
    }

    if (!enoughFunds) throw new Error('Insufficient BCH balance to fund the transaction')

    const sourceOutputs = buildWcSourceOutputs(transactionHex, spentUtxos)

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transactionHex,
            sourceOutputs: JSON.parse(JSON.stringify(sourceOutputs, jsonReplacer)),
            userPrompt: params.userPrompt,
            broadcast: false
        },
        inputPaths: spentUtxos.map((utxo, inputIndex) => {
            if (!utxo.pathName) return []
            return [inputIndex, utxo.pathName, utxo.addressIndex]
        }).filter(p => p.length === 3) as [number, string, number][]
    } as SignTransactionRequest
}
