import {  Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "../constants"
import { encodeCashAddress, getMinimumFee, hexToBin, decodeCashAddress, CashAddressType} from "bitauth-libauth-v3"
import { jsonReplacer } from "./utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { CustomElectrumNetworkProvider } from "src/services/electrum"

export const AIRDROP_MAX_RECIPIENTS = 50

export type AirdropFungibleReservesParams = {
    issuerTokenUtxo: UtxoWithPath,
    /** Fungible token amount each recipient receives. */
    airdropTokenAmount: bigint,
    recipientAddresses: string[],
    authkeyUtxo: UtxoWithPath,
    funderUtxos: UtxoWithPath[],
    network?: Network,
    feeRateSatsPerKb?: bigint
}

export function airdropFungibleReserves(params: AirdropFungibleReservesParams): SignTransactionRequest {
    const feeRateSatsPerKb = params.feeRateSatsPerKb || DEFAULT_FEE_RATE_SATS_PER_KB

    if (!params.issuerTokenUtxo?.token) throw new Error(`Airdropping tokens requires a token of the same category.`)
    if (params.authkeyUtxo?.token?.nft?.commitment !== '00') throw new Error(`Invalid AuthKey.`)
    if (!params.airdropTokenAmount) throw new Error(`Invalid token amount.`)
    if (params.recipientAddresses.length === 0) throw new Error(`No airdrop recipients.`)
    if (params.recipientAddresses.length > AIRDROP_MAX_RECIPIENTS) {
        throw new Error(`Airdrops are limited to ${AIRDROP_MAX_RECIPIENTS} recipients per transaction.`)
    }

    const authguardContract = createAuthguardContract({
        authkeyTokenId: params.authkeyUtxo.token.category,
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
        provider: new CustomElectrumNetworkProvider(params.network)
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

    const airdroppedAmount = params.airdropTokenAmount * BigInt(params.recipientAddresses.length)
    const tokenChange = params.issuerTokenUtxo.token.amount - airdroppedAmount
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
    for (const recipientAddress of params.recipientAddresses) {
        transaction.addOutput({
            to: recipientAddress,
            amount: DEFAULT_TOKEN_VALUE,
            token: {
                category: params.issuerTokenUtxo.token.category,
                amount: params.airdropTokenAmount
            }
        })
    }

    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE * 3n
    let unlockingBytecodesBytesize = P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + unlockingBytecodesBytesize + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        feeRateSatsPerKb
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
        unlockingBytecodesBytesize = P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length
        const newMinimumFee = getMinimumFee(
            // Taking change into consideration
            BigInt(hexToBin(transactionHex).length + unlockingBytecodesBytesize + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
            feeRateSatsPerKb
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

    const wcPayload = transaction.generateWcTransactionObject()

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transaction.build(),
            sourceOutputs: JSON.parse(JSON.stringify(wcPayload.sourceOutputs, jsonReplacer)),
            userPrompt: 'Airdrop FTs from reserves',
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
