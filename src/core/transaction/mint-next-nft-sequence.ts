import { 
    ElectrumNetworkProvider,
    Network, 
    placeholderP2PKHUnlocker, 
    TransactionBuilder, 
    type Output as TransactionOutput 
} from "cashscript"

import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"

import { 
    encodeCashAddress,
    getMinimumFee,
    hexToBin, 
    binToHex, 
    binToBigIntUintLE, 
    bigIntToVmNumber, 
    decodeCashAddress, 
    CashAddressType, 
    type Output, 
    TransactionCommon, 
    decodeTransactionCommon
} from "bitauth-libauth-v3"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { 
    DEFAULT_FEE_RATE_SATS_PER_KB, 
    DEFAULT_TOKEN_VALUE, 
    P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE 
} from "../constants"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"

export type MintNextNftSequence = {
    minterUtxo: UtxoWithPath,
    mintQuantity: number,
    recipient: string,
    capability: 'none' | 'mutable' | 'minting',
    funderUtxos: UtxoWithPath[],
    authkeyUtxo?: UtxoWithPath,
    network?: Network,
}

export function mintNextNftSequence(params: MintNextNftSequence): SignTransactionRequest & { mintOutputs: TransactionOutput[]} {
    if (!params.minterUtxo?.token) throw new Error(`Minting requires a token of the same category.`)
    if (params.authkeyUtxo && params.authkeyUtxo?.token?.nft?.commitment !== '00') throw new Error(`Invalid AuthKey.`)

    let authguard = null 
    let authkeyId = null
    let authkeyReturnAddress = null
    if (params.authkeyUtxo) {
        authguard = createAuthguardContract({
            authkeyTokenId: params.authkeyUtxo.token!.category,
            network: params.network
        })
        authkeyId = `${params.authkeyUtxo!.txid}:${params.authkeyUtxo!.vout}`
        const decodedAuthkeyRecipientAddress = decodeCashAddress(params.authkeyUtxo!.address)
        if (typeof(decodedAuthkeyRecipientAddress) === 'string') {
            throw new Error('Error decoding Authkey recipient address')
        }
        authkeyReturnAddress = encodeCashAddress({
            payload: decodedAuthkeyRecipientAddress.payload,
            prefix: decodedAuthkeyRecipientAddress.prefix,
            type: CashAddressType.p2pkhWithTokens
        }).address
        if (authguard.unlock?.unlockWithNft === undefined) throw new Error('Error creating Authguard contract.')
    }
    
    const funderUtxo = 
        [
            ...params.funderUtxos
                .filter(utxo => {
                    let notAuthkey = true
                    if (authkeyId) {
                        notAuthkey = `${utxo.txid}:${utxo.vout}` !== authkeyId
                    }
                    return !utxo.token && notAuthkey
                })
                .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
        ]

    const funderInput = funderUtxo.shift()
    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    const spentUtxos = [
        params.minterUtxo
    ]

    if (authguard && authkeyReturnAddress) {
        
        transaction.addInput(params.minterUtxo, authguard.unlock.unlockWithNft!(true) as any)
        transaction.addInput(params.authkeyUtxo!, placeholderP2PKHUnlocker(params.authkeyUtxo!.address))
        transaction.addOutput({
            to: authguard.tokenAddress,
            amount: params.minterUtxo.satoshis,
            token: params.minterUtxo.token
        })
        transaction.addOutput({
            to: authkeyReturnAddress,
            amount: params.authkeyUtxo!.satoshis,
            token: params.authkeyUtxo!.token
        })

        spentUtxos.push(params.authkeyUtxo!)

    } else {
        transaction.addInput(params.minterUtxo, placeholderP2PKHUnlocker(params.minterUtxo.address))

        const decoded = decodeCashAddress(params.minterUtxo!.address)
        if (typeof(decoded) === 'string') {
            throw new Error('Error decoding Authkey recipient address')
        }

        const minterReturnAddress = encodeCashAddress({
            payload: decoded.payload,
            prefix: decoded.prefix,
            type: CashAddressType.p2pkhWithTokens
        }).address

        transaction.addOutput({
            to: minterReturnAddress,
            amount: params.minterUtxo.satoshis,
            token: params.minterUtxo.token
        })
    }

    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))
    spentUtxos.push(funderInput)

    let sequenceNo = 0n
    if (params.minterUtxo.token.nft?.commitment) {
        sequenceNo = binToBigIntUintLE(hexToBin(params.minterUtxo.token.nft?.commitment))
    }
    const startingSequence = sequenceNo + 1n
    const outputNfts: TransactionOutput[] = []
    Array.from({ length: params.mintQuantity }).forEach(() => {
        sequenceNo = sequenceNo + 1n
        const commitment = binToHex(bigIntToVmNumber(sequenceNo))
        const output = {
            to: params.recipient,
            amount: DEFAULT_TOKEN_VALUE,
            token: {
                category: params.minterUtxo.token!.category,
                amount: 0n,
                nft: {
                    capability: params.capability || 'none',
                    commitment
                }
            }
        }
        transaction.addOutput(output)
        outputNfts.push(output)
    })

    const endSequence = sequenceNo
    
    let transactionHex = transaction.build()
    const minOutputCount = authguard ? 3: 2
    const fixedCost = DEFAULT_TOKEN_VALUE * BigInt(minOutputCount + params.mintQuantity)
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE), 
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    const estimatedCost = fixedCost + minimumFee
    let totalSatoshifunderUtxos = funderInput.satoshis
    let enoughfunderUtxos = totalSatoshifunderUtxos > estimatedCost
    const change = totalSatoshifunderUtxos - estimatedCost
    let changeOutputIndex = -1
    if (change > 546n) {
        transaction.addOutput({
            to: params.authkeyUtxo!.address,
            amount: change
        })
        changeOutputIndex = transaction.outputs.length - 1
        transactionHex = transaction.build()
    }

    while(funderUtxo.length > 0 && !enoughfunderUtxos) {
        const additionalFunderInput = funderUtxo.shift() as UtxoWithPath
        transaction.addInput(
            additionalFunderInput,
            placeholderP2PKHUnlocker(additionalFunderInput.address)
        )
        spentUtxos.push(additionalFunderInput)
        totalSatoshifunderUtxos += additionalFunderInput.satoshis
        transactionHex = transaction.build()

        const newMinimumFee = getMinimumFee(
            BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
            DEFAULT_FEE_RATE_SATS_PER_KB
        )
        const newEstimatedCost = fixedCost + newMinimumFee
        enoughfunderUtxos = totalSatoshifunderUtxos > newEstimatedCost
        const newChange = totalSatoshifunderUtxos - newEstimatedCost
        if (newChange > 546n) {
            if (changeOutputIndex === -1) {
                transaction.addOutput({
                    to: params.authkeyUtxo!.address,
                    amount: newChange
                })
                changeOutputIndex = transaction.outputs.length - 1
            } else {
                transaction.outputs[changeOutputIndex]!.amount = newChange 
            }
            transactionHex = transaction.build()
        }
        if (enoughfunderUtxos) break
    }

    if (!enoughfunderUtxos) throw new Error('Insufficient BCH balance to fund the transaction')
    const sourceOutputs = spentUtxos.map((utxo) => {
        const args: UtxoToWcSourceOutputParams = { utxo }
        return utxoToWcSourceOutput(args)
    })    

    const minterTokenSourceOutputIndex = sourceOutputs.findIndex(s => {
        return `${binToHex(s.outpointTransactionHash)}:${s.outpointIndex}` === `${params.minterUtxo.txid}:${params.minterUtxo.vout}`
    })

    if (minterTokenSourceOutputIndex === -1) throw new Error('Unexpected state, token issuer utxo not found on source output list')

    if (authguard) {
        // Minter is on authguard
        const minterTokenSourceOutput = sourceOutputs[minterTokenSourceOutputIndex]
        const decodedTransaction = decodeTransactionCommon(hexToBin(transactionHex)) as TransactionCommon
        const unlockingBytecode = transaction.inputs[0]?.unlocker.generateUnlockingBytecode({
            transaction: decodedTransaction as TransactionCommon,
            sourceOutputs: sourceOutputs.map((sourceOutput) => {
                return {
                    lockingBytecode: sourceOutput.lockingBytecode,
                    token: sourceOutput.token,
                    valueSatoshis: sourceOutput.valueSatoshis
                }
            }) as Output[],
            inputIndex: minterTokenSourceOutputIndex
        })
        minterTokenSourceOutput!.unlockingBytecode = unlockingBytecode as Uint8Array
    }

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transactionHex,
            sourceOutputs: JSON.parse(JSON.stringify(sourceOutputs, jsonReplacer)),
            userPrompt: `Mint NFT(s) #${startingSequence} - #${endSequence}`,
            broadcast: false
        },
        inputPaths: spentUtxos.map((utxo, inputIndex) => {
            if (!utxo.pathName) return []
            return [inputIndex, utxo.pathName, utxo.addressIndex]
        }).filter(p => p.length === 3) as [number, string, number][],

        mintOutputs: outputNfts
        
    } as SignTransactionRequest & { mintOutputs: TransactionOutput[] }
}
