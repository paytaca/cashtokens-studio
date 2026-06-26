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
    P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, 
    P2PKH_UNLOCKING_BYTECODE_BYTESIZE
} from "../constants"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"
import { decodeTransactionBCH } from "@bitauth/libauth"


export type CreateGenesisInputParams = {
    recipientAddress: string,
    funderUtxos: UtxoWithPath[],
    network?: Network,
    feeRateSatsPerKb?: bigint
}

export function createGenesisInput(params: CreateGenesisInputParams): SignTransactionRequest {

    const feeRateSatsPerKb = params.feeRateSatsPerKb || DEFAULT_FEE_RATE_SATS_PER_KB
    console.log('Params', params)
    
    const funderUtxos = 
        params.funderUtxos.filter((utxo) => {
            return !utxo.token    
        }).sort((u1, u2) => Number(u2.satoshis) - Number(u1.satoshis))

    const funderInput = funderUtxos.shift()

    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')
        const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })
    
    const spentUtxos = [
        funderInput
    ]

    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))
    transaction.addOutput({
        to: params.recipientAddress,
        amount: DEFAULT_TOKEN_VALUE
    })
    
    let totalFunds = spentUtxos.reduce((acc, u) => acc + u.satoshis, 0n)
    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE
    let minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_UNLOCKING_BYTECODE_BYTESIZE + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        feeRateSatsPerKb
    )

    let estimatedCost = fixedCost + minimumFee
    let hasEnoughFunds = totalFunds > estimatedCost

    while(funderUtxos.length > 0 && !hasEnoughFunds) {
        const additionalFunderInput = funderUtxos.shift() as UtxoWithPath
        transaction.addInput(
            additionalFunderInput,
            placeholderP2PKHUnlocker(additionalFunderInput.address)
        )
        spentUtxos.push(additionalFunderInput)
        totalFunds += additionalFunderInput.satoshis
        transactionHex = transaction.build()

        const unlockingBytecodesBytesize = P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length
        const transactionBytesize = BigInt(hexToBin(transactionHex).length + unlockingBytecodesBytesize +  P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE) 

        minimumFee = getMinimumFee(
            transactionBytesize,
            feeRateSatsPerKb
        )

        estimatedCost = fixedCost + minimumFee
        hasEnoughFunds = totalFunds > estimatedCost
        
        if (hasEnoughFunds) break
    }

    if (!hasEnoughFunds) throw new Error('Insufficient BCH balance to fund the transaction')

    let change = totalFunds - estimatedCost 

    if (change > 546n) { 
        transaction.addOutput({
            to: transaction.outputs[0]!.to,
            amount: change
        })
        transactionHex = transaction.build()  
    }

    const sourceOutputs = spentUtxos.map((utxo) => {
        const args: UtxoToWcSourceOutputParams = {
            utxo
        }
        return utxoToWcSourceOutput(args)
    }) 
    
    console.log('Transaction', transaction)
    console.log("Decoded Tranasction", decodeTransactionBCH(hexToBin(transactionHex)))
    console.log('Estimated Cost', estimatedCost)
    console.log('Transaction Bytesize', hexToBin(transactionHex).length)
    console.log('Total Change', change)
    console.log('Minimum Fee', minimumFee)

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