import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TokenDetails, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "@bitauth/libauth"
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

    const authkeyInputIndex = params.sourceUtxos.findIndex(u => {
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

    const remainingUtxos = sourceUtxos.filter(u => !u.token).sort((u1, u2) => Number(u2.satoshis) - Number(u1.satoshis))

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
    const authkeyOutputAmount = authkeyInput.satoshis || DEFAULT_TOKEN_VALUE
    const fixedCost = DEFAULT_TOKEN_VALUE + authkeyOutputAmount
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    let estimatedCost = fixedCost + minimumFee
    let enoughFunds = totalFunds > estimatedCost
    let changeOutputIndex = -1

    if (!enoughFunds) {
        while (remainingUtxos.length > 0) {
            const funderInput = remainingUtxos.shift() as UtxoWithPath
            transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))
            spentUtxos.push(funderInput)
            totalFunds += funderInput.satoshis
            transactionHex = transaction.build()

            const newMinimumFee = getMinimumFee(
                BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
                DEFAULT_FEE_RATE_SATS_PER_KB
            )
            const newEstimatedCost = fixedCost + newMinimumFee
            enoughFunds = totalFunds > newEstimatedCost

            if (enoughFunds) {
                estimatedCost = newEstimatedCost
                break
            }
        }
    }

    if (!enoughFunds) {
        throw new Error('Insufficient BCH balance to fund the transaction')
    }

    const change = totalFunds - estimatedCost
    if (change > 546n) {
        if (changeOutputIndex === -1) {
            transaction.addOutput({
                to: params.changeRecipientAddress || params.authkeyRecipientAddress,
                amount: change
            })
            changeOutputIndex = transaction.outputs.length - 1
        } else {
            transaction.outputs[changeOutputIndex]!.amount = change
        }
        transactionHex = transaction.build()
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
            userPrompt: 'Issue FTs from reserves',
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