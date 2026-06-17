import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { binToHex, decodeTransactionCommon, Output, TransactionCommon } from "@bitauth/libauth"

export type TransferFtsParams = {
    category: string,
    tokenAmount: bigint,
    recipientAddress: string,
    changeAddress: string,
    walletUtxos: UtxoWithPath[],
    network?: Network,
    transferType: 'send' | 'burn'
}

export function transferFts(params: TransferFtsParams): SignTransactionRequest {
    if (!params.tokenAmount) throw new Error('Invalid token amount.')

    const tokenUtxos = params.walletUtxos
        .filter(u => u.token?.category === params.category && u.token?.amount && BigInt(u.token.amount) > 0n)
        .sort((a, b) => Number(BigInt(b.token!.amount)) - Number(BigInt(a.token!.amount)))

    let totalAmount = BigInt(0)
    const selectedUtxos: UtxoWithPath[] = []
    for (const utxo of tokenUtxos) {
        if (totalAmount >= params.tokenAmount) break
        const amount = BigInt(utxo.token!.amount)
        totalAmount += amount
        selectedUtxos.push(utxo)
    }

    if (totalAmount < params.tokenAmount) throw new Error('Insufficient token balance')

    const tokenChange = totalAmount - params.tokenAmount
    if (tokenChange < 0n) throw new Error('Insufficient token balance')

    const funderUtxos = params.walletUtxos
        .filter(u => {
            if (u.token) return false
            return !selectedUtxos.some(s => s.txid === u.txid && s.vout === u.vout)
        })
        .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))

    const funderInput = funderUtxos.shift()
    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    const spentUtxos = [...selectedUtxos, funderInput]

    for (const utxo of selectedUtxos) {
        transaction.addInput(utxo, placeholderP2PKHUnlocker(utxo.address))
    }

    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))

    transaction.addOutput({
        to: params.recipientAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: {
            category: params.category,
            amount: params.tokenAmount
        }
    })

    if (tokenChange > 0n) {
        const firstUtxo = selectedUtxos[0]
        transaction.addOutput({
            to: params.changeAddress,
            amount: DEFAULT_TOKEN_VALUE,
            token: {
                ...firstUtxo.token,
                amount: tokenChange
            }
        })
    }

    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE * (tokenChange > 0n ? 3n : 2n)
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    const estimatedCost = fixedCost + minimumFee
    let totalSatoshiFunds = BigInt(funderInput.satoshis)
    let enoughFunds = totalSatoshiFunds > estimatedCost
    const change = totalSatoshiFunds - estimatedCost
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

        const newMinimumFee = getMinimumFee(
            BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
            DEFAULT_FEE_RATE_SATS_PER_KB
        )
        const newEstimatedCost = fixedCost + newMinimumFee
        enoughFunds = totalSatoshiFunds > newEstimatedCost
        const newChange = totalSatoshiFunds - newEstimatedCost
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

    const sourceOutputs = spentUtxos.map((utxo) => {
        const args: UtxoToWcSourceOutputParams = { utxo }
        return utxoToWcSourceOutput(args)
    })

    const decodedTransaction = decodeTransactionCommon(hexToBin(transactionHex)) as TransactionCommon

    let userPrompt = ''
    if (params.transferType === 'send') {
        userPrompt = 'Send fungible tokens'
    } else if (params.transferType === 'burn') {
        userPrompt = 'Burn fungible tokens'
    }

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transactionHex,
            sourceOutputs: JSON.parse(JSON.stringify(sourceOutputs, jsonReplacer)),
            userPrompt: userPrompt,
            broadcast: false
        },
        inputPaths: spentUtxos.map((utxo, inputIndex) => {
            if (!utxo.pathName) return []
            return [inputIndex, utxo.pathName, utxo.addressIndex]
        }).filter(p => p.length === 3) as [number, string, number][]
    } as SignTransactionRequest
}
