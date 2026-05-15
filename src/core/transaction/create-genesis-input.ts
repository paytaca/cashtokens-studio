import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import {
    ElectrumNetworkProvider,
    Network,
    placeholderP2PKHUnlocker,
    TransactionBuilder
} from "cashscript"
import { getMinimumFee, hexToBin} from "bitauth-libauth-v3"
import { UtxoWithPath } from "../types"
import { 
    DEFAULT_FEE_RATE_SATS_PER_KB, 
    DEFAULT_TOKEN_VALUE, 
    P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE 
} from "../constants"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"


export type CreateGenesisInputParams = {
    recipientAddress?: string,
    funderUtxos: UtxoWithPath[],
    network?: Network
}

export function createGenesisInput(params: CreateGenesisInputParams): SignTransactionRequest {

    const funderUtxo = 
        params.funderUtxos.filter((utxo) => {
            return !utxo.token    
        }).sort((u1, u2) => Number(u2.satoshis) - Number(u1.satoshis))

    const funderInput = funderUtxo.shift()

    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')
        const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })
    
    const spentUtxos = [
        funderInput
    ]

    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))
    transaction.addOutput({
        to: params.recipientAddress || funderInput.address,
        amount: DEFAULT_TOKEN_VALUE
    })
    
    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE), 
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    const estimatedCost = fixedCost + minimumFee
    let totalSatoshiFunds = funderInput.satoshis
    let enoughFunds = totalSatoshiFunds > estimatedCost
    const change = totalSatoshiFunds - estimatedCost
    let changeOutputIndex = -1
    if (change > 546n) {
        transaction.addOutput({
            to: params.recipientAddress || funderInput.address, 
            amount: change
        })
        changeOutputIndex = transaction.outputs.length - 1
        transactionHex = transaction.build()  // Rebuild with change
    }

    while(funderUtxo.length > 0 && !enoughFunds) {
        const additionalFunderInput = funderUtxo.shift() as UtxoWithPath
        transaction.addInput(
            additionalFunderInput,
            placeholderP2PKHUnlocker(additionalFunderInput.address)
        )
        spentUtxos.push(additionalFunderInput)
        totalSatoshiFunds += additionalFunderInput.satoshis
        transactionHex = transaction.build()

        const newMinimumFee = getMinimumFee(
            // Taking change into consideration
            BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
            DEFAULT_FEE_RATE_SATS_PER_KB
        )
        const newEstimatedCost = fixedCost + newMinimumFee
        enoughFunds = totalSatoshiFunds > newEstimatedCost
        const newChange = totalSatoshiFunds - newEstimatedCost
        if (newChange > 546n) {
            if (changeOutputIndex === -1) {
                transaction.addOutput({
                    to: params.recipientAddress || funderInput.address, 
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
        const args: UtxoToWcSourceOutputParams = {
            utxo
        }
        return utxoToWcSourceOutput(args)
    })    

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transactionHex,
            sourceOutputs: JSON.parse(JSON.stringify(sourceOutputs, jsonReplacer)),
            userPrompt: 'Generate genesis input (Token Id)',
            broadcast: false
        },
        inputPaths: spentUtxos.map((utxo, inputIndex) => {
            if (!utxo.pathName) {
                return []
            }
            return [
                inputIndex, 
                utxo.pathName,
                utxo.addressIndex
            ]
        }).filter(p => p.length === 3) as [number, string, number][]
    } as SignTransactionRequest
}