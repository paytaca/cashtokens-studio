import { Contract, ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TransactionBuilder, Unlocker, WcSourceOutput } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract, filterAuthKeys, UtxoWithAuthKey } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { encodeCashAddress, getMinimumFee, hexToBin, decodeCashAddress, CashAddressType} from "bitauth-libauth-v3"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { binToHex, decodeTransactionCommon, Output, TransactionCommon } from "@bitauth/libauth"

export type PublishRegistryParams = {
    authhead: UtxoWithAuthKey,
    funderUtxos: UtxoWithPath[],
    registryPublicationData: {
        contentHash: string,
        uris: string[]
    },
    network?: Network,
    authkeyRecipientAddress?: string,
    authheadRecipientAddress?: string,
    userPrompt?: string,

}

export function publishRegistry(params: PublishRegistryParams): SignTransactionRequest {

    if (params.authhead.vout !== 0) {
        throw new Error('Invalid authhead')
    }

    let authguard: Contract|null = null 
    
    const authkey = filterAuthKeys([params.authhead.authkey || {} as UtxoWithPath])[0] as UtxoWithPath

    if(authkey) {
        authguard = createAuthguardContract({
            authkeyTokenId: authkey.token!.category,
            network: params.network
        })

        if (params.authhead.address !== authguard.address) {
            throw new Error('Address attached to the authhead is not the same as the generated authguard contract.')
        }
    }
    
    const funderUtxo = 
        [
            ...params.funderUtxos
                .filter(utxo => {
                    const notToken = !utxo.token 
                    const notAuthhead = `${utxo.txid}:${utxo.vout}` !== `${params.authhead.txid}:${params.authhead.vout}`
                    const notAuthkey = authkey ? `${utxo.txid}:${utxo.vout}` !== `${authkey.txid}:${authkey.vout}` : true
                    return (
                        notToken && notAuthhead && notAuthkey
                    )
                })
                .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
        ]

    const funderInput = funderUtxo.shift()

    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })
    
    const spentUtxos: any = [
        params.authhead
    ]

    let authheadUnlocker = null 
    
    if (authguard) {
        authheadUnlocker = authguard.unlock.unlockWithNft!(true)
    } else {
        authheadUnlocker = placeholderP2PKHUnlocker(params.authhead.address)
    }

    transaction.addInput(params.authhead, authheadUnlocker)

    let authkeyRecipientTokenAddress = ''
    if (authkey) {
        spentUtxos.push(authkey)
        transaction.addInput(authkey, placeholderP2PKHUnlocker(authkey.address))

        const decodedAuthkeyRecipientAddress = decodeCashAddress(params.authkeyRecipientAddress || authkey.address)
        if (typeof(decodedAuthkeyRecipientAddress) === 'string') {
            throw new Error('Error decoding Authkey recipient address')
        }

        authkeyRecipientTokenAddress = encodeCashAddress({
            payload: decodedAuthkeyRecipientAddress.payload,
            prefix: decodedAuthkeyRecipientAddress.prefix,
            type: CashAddressType.p2pkhWithTokens
        }).address
    }

    spentUtxos.push(funderInput)
    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))

    let authheadRecipientAddress = ''

    if (authguard) {
        if (params.authhead.token?.category) {
            authheadRecipientAddress = authguard.tokenAddress
        } else {
            authheadRecipientAddress = authguard.address
        }
    }

    if (!authheadRecipientAddress) {
        if (params.authhead.token?.category) {
            const decoded = decodeCashAddress(params.authheadRecipientAddress || params.authhead.address)
            if (typeof(decoded) === 'string') {
                throw new Error('Error decoding Authkey recipient address')
            }
            authheadRecipientAddress = encodeCashAddress({
                payload: decoded.payload,
                prefix: decoded.prefix,
                type: CashAddressType.p2pkhWithTokens
            }).address
        } else {
            authheadRecipientAddress = params.authheadRecipientAddress || params.authhead.address
        }
    }

    const firstOutput: any  = {
        to: authheadRecipientAddress,
        amount: params.authhead.satoshis
    }

    if (params.authhead.token) {
        firstOutput.token = params.authhead.token
    }

    transaction.addOutput(firstOutput)

    if (authkey) {
        const secondOutput = {
            to: authkeyRecipientTokenAddress,
            amount: authkey.satoshis,
            token: authkey.token
        }

        transaction.addOutput(secondOutput)
    }

    // Third output
    transaction.addOpReturnOutput([
        'BCMR', 
        `0x${params.registryPublicationData.contentHash}`,
        ...params.registryPublicationData.uris
    ])

    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE * 2n
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE), 
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    const estimatedCost = fixedCost + minimumFee
    let totalSatoshiFunds = funderInput.satoshis
    let enoughFunds = totalSatoshiFunds > estimatedCost
    const change = totalSatoshiFunds - estimatedCost
    let changeOutputIndex = -1

    // Return to owner of authkey or owner of authhead if not using authguard
    const changeRecipientAddress = authkey.address || params.authhead.address

    if (change > 546n) {
        transaction.addOutput({
            to: changeRecipientAddress, 
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
                    to: changeRecipientAddress, // Return to owner of authKey
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
    const sourceOutputs = spentUtxos.map((utxo: UtxoWithPath) => {
        const args: UtxoToWcSourceOutputParams = {
            utxo
        }
        return utxoToWcSourceOutput(args)
    })    

    if (authguard) {
        // Generate authguard unlocking bytecode for the authhead
        const authheadSourceOutputIndex = sourceOutputs.findIndex((s: WcSourceOutput) => {
            return `${binToHex(s.outpointTransactionHash)}:${s.outpointIndex}` === `${params.authhead.txid}:${params.authhead.vout}`
        })
    
        if (authheadSourceOutputIndex === -1) throw new Error('Unexpected state, authhead utxo not found on source output list')
    
        const authheadSourceOutput = sourceOutputs[authheadSourceOutputIndex]
    
        const decodedTransaction = decodeTransactionCommon(hexToBin(transactionHex)) as TransactionCommon
    
        const unlockingBytecode = transaction.inputs[0]?.unlocker.generateUnlockingBytecode({
            transaction: decodedTransaction as TransactionCommon,
            sourceOutputs: sourceOutputs.map((sourceOutput: any) => {
                return {
                    lockingBytecode: sourceOutput.lockingBytecode,
                    token:  sourceOutput.token,
                    valueSatoshis: sourceOutput.valueSatoshis
                }
            }) as Output[],
            inputIndex: authheadSourceOutputIndex
        })
    
        authheadSourceOutput!.unlockingBytecode = unlockingBytecode as Uint8Array
    }

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transactionHex,
            sourceOutputs: JSON.parse(JSON.stringify(sourceOutputs, jsonReplacer)),
            userPrompt: params.userPrompt || 'Publish Registry',
            broadcast: false
        },
        inputPaths: spentUtxos.map((utxo: UtxoWithPath, inputIndex: number) => {
            if (!utxo.pathName) {
                return []
            }
            return [
                inputIndex, 
                utxo.pathName,
                utxo.addressIndex
            ]
        }).filter((p: [number,string,number]) => p.length === 3) as [number, string, number][]
    } as SignTransactionRequest
}