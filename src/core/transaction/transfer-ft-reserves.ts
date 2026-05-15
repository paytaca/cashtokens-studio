import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { encodeCashAddress, getMinimumFee, hexToBin, decodeCashAddress, CashAddressType} from "bitauth-libauth-v3"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { binToHex, decodeTransactionCommon, Output, TransactionCommon } from "@bitauth/libauth"

export type TransferFungibleReservesParams = {
    issuerTokenUtxo: UtxoWithPath,
    transferTokenAmount: bigint,
    recipientAddress: string,
    authkeyUtxo: UtxoWithPath,
    funderUtxos: UtxoWithPath[],
    authKeyRecipientAddress?: string,
    network?: Network,
    transferType: 'issuance' | 'burn'
}

export function transferFungibleReserves(params: TransferFungibleReservesParams): SignTransactionRequest {

    if (!params.issuerTokenUtxo?.token) throw new Error(`Transferring tokens requires a token of the same category.`)
    if (params.authkeyUtxo?.token?.nft?.commitment !== '00') throw new Error(`Invalid AuthKey.`)
    if (!params.transferTokenAmount) throw new Error(`Invalid token amount.`)

    const authguardContract = createAuthguardContract({
        authKeyTokenId: params.authkeyUtxo.token.category,
        network: params.network
    })

    if (authguardContract.unlock?.unlockWithNft === undefined) throw new Error('Error creating Authguard contract.')

    const funderUtxo = 
        [
            ...params.funderUtxos
                .filter(utxo => !utxo.token && `${utxo.txid}:${utxo.vout}` !== `${params.authkeyUtxo.txid}:${params.authkeyUtxo.vout}`)
                .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
        ]

    const funderInput = funderUtxo.shift()

    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')
        const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })
    
    const spentUtxos = [
        params.issuerTokenUtxo, 
        params.authkeyUtxo,
        funderInput
    ]

    const decodedAuthkeyRecipientAddress = decodeCashAddress(params.authkeyUtxo.address)
    if (typeof(decodedAuthkeyRecipientAddress) === 'string') {
        throw new Error('Error decoding Authkey recipient address')
    }
    const authkeyRecipientTokenAddress = encodeCashAddress({
        payload: decodedAuthkeyRecipientAddress.payload,
        prefix: decodedAuthkeyRecipientAddress.prefix,
        type: CashAddressType.p2pkhWithTokens
    }).address

    transaction.addInput(params.issuerTokenUtxo, authguardContract.unlock.unlockWithNft(true) as any)
    transaction.addInput(params.authkeyUtxo, placeholderP2PKHUnlocker(params.authkeyUtxo.address))
    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))

    const tokenChange = params.issuerTokenUtxo.token.amount - params.transferTokenAmount
    if (tokenChange < 0n) {
        throw new Error('Insufficient token balance')
    }
    transaction.addOutput({
        to: authguardContract.tokenAddress,
        amount: params.issuerTokenUtxo.satoshis,
        token: {
            ...params.issuerTokenUtxo.token,
            amount: tokenChange
        }
    })
    transaction.addOutput({
        to: authkeyRecipientTokenAddress,
        amount: params.authkeyUtxo.satoshis,
        token: params.authkeyUtxo.token
    })
    transaction.addOutput({
        to: params.recipientAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: {
            category: params.issuerTokenUtxo.token.category,
            amount: params.transferTokenAmount
        }
    })
    
    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE * 3n
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
            to: params.authkeyUtxo.address, // Return to owner of authKey
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
                    to: params.authkeyUtxo.address, // Return to owner of authKey
                    amount: newChange
                })
                changeOutputIndex = transaction.outputs.length - 1
            } else {
                transaction.outputs[changeOutputIndex]!.amount = newChange 
            }
            transactionHex = transaction.build()  // Rebuild with change
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

    const issuerTokenSourceOutputIndex = sourceOutputs.findIndex(s => {
        return `${binToHex(s.outpointTransactionHash)}:${s.outpointIndex}` === `${params.issuerTokenUtxo.txid}:${params.issuerTokenUtxo.vout}`
    })

    if (issuerTokenSourceOutputIndex === -1) throw new Error('Unexpected state, token issuer utxo not found on source output list')

    const issuerTokenSourceOutput = sourceOutputs[issuerTokenSourceOutputIndex]

    const decodedTransaction = decodeTransactionCommon(hexToBin(transactionHex)) as TransactionCommon

    const unlockingBytecode = transaction.inputs[0]?.unlocker.generateUnlockingBytecode({
        transaction: decodedTransaction as TransactionCommon,
        sourceOutputs: sourceOutputs.map((sourceOutput) => {
            return {
                lockingBytecode: sourceOutput.lockingBytecode,
                token:  sourceOutput.token,
                valueSatoshis: sourceOutput.valueSatoshis
            }
        }) as Output[],
        inputIndex: issuerTokenSourceOutputIndex
    })

    issuerTokenSourceOutput!.unlockingBytecode = unlockingBytecode as Uint8Array
    let userPrompt = ''
    if (params.transferType === 'issuance') {
        userPrompt = 'Issue FTs from reserves'
    } else if (params.transferType === 'burn') {
        userPrompt = 'Burn FTs from reserves'
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