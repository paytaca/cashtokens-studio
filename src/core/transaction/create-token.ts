import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TokenDetails, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { encodeTransactionOutput, getMinimumFee, hexToBin, Output } from "@bitauth/libauth"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"

export type CreateTokenParams = {
    tokenSpec: Omit<TokenDetails, 'category'>,                   // The new spec of the new token to be created
    genesisInputUtxoId: `${string}:${number}`, // txid:vout
    authkeyUtxoId: `${string}:${number}`,
    authkeyRecipientAddress: string,           // token address
    changeRecipientAddress?: string,           
    sourceUtxos: UtxoWithPath[],
    network?: Network,
    registryPublicationData: {
        contentHash: string,
        uris: string[]
    }
}

export function createToken(params: CreateTokenParams): SignTransactionRequest {

    const sourceUtxos = [...params.sourceUtxos] as UtxoWithPath[]

    const genesisInputIndex = sourceUtxos.findIndex((u) => {
        return (
            params.genesisInputUtxoId === `${u.txid}:${u.vout}`
        )
    })

    if (genesisInputIndex === -1) throw new Error('Genesis input not found from source utxos')

    const genesisInput = sourceUtxos.splice(genesisInputIndex, 1)[0] as UtxoWithPath

    const authkeyInputIndex = sourceUtxos.findIndex(u => {
        return (
            params.authkeyUtxoId === `${u.txid}:${u.vout}`
        )
    })

    if (authkeyInputIndex === -1) throw new Error('AuthKey not found from source utxos')

    const authkeyInput = sourceUtxos.splice(authkeyInputIndex, 1)[0] as UtxoWithPath
    
    const createNewAuthKey = !authkeyInput.token

    if (createNewAuthKey && authkeyInput.vout !== 0) throw new Error('AuthKey utxo should be a valid genesis input if creating an AuthKey genesis.')

    if (!createNewAuthKey && authkeyInput?.token?.nft?.commitment !== '00') throw new Error('Invalid AuthKey commitment format') 
    
    const newToken = {
        ...params.tokenSpec,
        category: genesisInput.txid
    }

    let authKeyToken = authkeyInput.token
    
    if (createNewAuthKey) {
        authKeyToken = {
            category: authkeyInput.txid,
            amount: 0n,
            nft: {
                capability: 'none',
                commitment: '00'
            }
        }
    }   

    const authguardContract = createAuthguardContract({
        authkeyTokenId: authKeyToken!.category,
        network: params.network
    })

    const funderUtxos = sourceUtxos.filter(u => !u.token).sort((u1, u2) => Number(u2.satoshis) - Number(u1.satoshis))

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    const spentUtxos = [genesisInput, authkeyInput]

    transaction.addInput(genesisInput, placeholderP2PKHUnlocker(genesisInput.address))
    transaction.addInput(authkeyInput, placeholderP2PKHUnlocker(authkeyInput.address))
    transaction.addOutput({
        to: authguardContract.tokenAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: newToken
    })
    transaction.addOutput({
        to: params.authkeyRecipientAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: authKeyToken
    })
    
    transaction.addOpReturnOutput([
        'BCMR', 
        `0x${params.registryPublicationData.contentHash}`,
        ...params.registryPublicationData.uris
    ])

    let totalFunds = spentUtxos.reduce((acc, u) => acc + u.satoshis, 0n)
    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE * 2n

    const opReturnOutput: Output = {
        lockingBytecode: transaction.outputs[2]!.to as Uint8Array,
        valueSatoshis: 0n
    }
    const opReturnOutputByteSize = encodeTransactionOutput(opReturnOutput)

    let minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE + opReturnOutputByteSize.byteLength),
        DEFAULT_FEE_RATE_SATS_PER_KB
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

        minimumFee = getMinimumFee(
            // Taking change into consideration
            BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
            DEFAULT_FEE_RATE_SATS_PER_KB
        )
        estimatedCost = fixedCost + minimumFee
        hasEnoughFunds = totalFunds > estimatedCost
        
        if (hasEnoughFunds) break
    }

    if (!hasEnoughFunds) throw new Error('Insufficient BCH balance to fund the transaction')

    const change = totalFunds - estimatedCost 

    if (change > 546n) { 
        transaction.addOutput({
            to: params.changeRecipientAddress || params.authkeyRecipientAddress, // Return to owner of authKey
            amount: change
        })
        transactionHex = transaction.build()  // Rebuild with change
    }
    
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
            userPrompt: 'Create New Token',
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