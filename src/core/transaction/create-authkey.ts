import { 
    ElectrumNetworkProvider, 
    Network, 
    placeholderP2PKHUnlocker, 
    TransactionBuilder 
} from "cashscript"
import { UtxoTxid, UtxoVout, UtxoWithPath } from "../types"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
// import { decodeCashAddress, encodeCashAddress, getMinimumFee, hexToBin } from "@bitauth/libauth"
import { decodeCashAddress, encodeCashAddress, getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"
import { NFTCapability } from "mainnet-js-v3"

export type CreateAuthkeyParams = {
    genesisInputId: `${UtxoTxid}:${UtxoVout}`,
    utxos: UtxoWithPath[],
    authKeyRecipientAddress?: string,
    network?: Network,
    registryPublicationData?: {
        contentHash: string,
        uris: string[]
    }
}

export function createAuthkey(params: CreateAuthkeyParams): SignTransactionRequest {
    
    const utxos = [...params.utxos].sort((u1, u2) => Number(u2.satoshis) - Number(u1.satoshis))
    
    const index = utxos.findIndex(utxo => {
        return `${utxo.txid}:${utxo.vout}` === params.genesisInputId
    })

    if (index === -1 || !utxos[index] || utxos[index].vout !== 0) {
        throw new Error('Missing required genesis input.')
    }
    
    const genesisInput = utxos.splice(index, 1)[0]!

    const authkeySpec = {
        category: genesisInput.txid,
        amount: 0n,
        nft: {
            capability: 'none' as NFTCapability,
            commitment: '00'
        }
    }
    
    const spentUtxos = [genesisInput]
    const funderUtxosPrimary = utxos.filter((utxo) => !utxo.token && utxo.vout !== 0) as UtxoWithPath[]
    const funderUtxosSecondary = utxos.filter((utxo) => !utxo.token && utxo.vout === 0) as UtxoWithPath[] // Use genesis input compatible utxos if not enough funder utxos

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    let recipientAddress = params.authKeyRecipientAddress || genesisInput.address

    const decodedCashAddress = decodeCashAddress(recipientAddress)
    if (typeof (decodedCashAddress) === 'string') {
        throw new Error(decodedCashAddress)
    }

    if (!decodedCashAddress.type.includes('WithTokens')) {
        const genesisInputOwnerAddress = encodeCashAddress({
            ...decodedCashAddress,
            throwErrors: true,
            type: `${decodedCashAddress.type as 'p2pkh'|'p2sh'}WithTokens`
        })
        recipientAddress = genesisInputOwnerAddress.address
    }
    
    transaction.addInput(genesisInput, placeholderP2PKHUnlocker(genesisInput.address))
    transaction.addOutput({
        to: recipientAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: authkeySpec
    })

    let transactionHex = transaction.build()

    const fixedCost = DEFAULT_TOKEN_VALUE
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE), 
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    const estimatedCost = fixedCost + minimumFee
    let totalSatoshiFunds = genesisInput.satoshis
    let enoughFunds = totalSatoshiFunds > estimatedCost
    const change = totalSatoshiFunds - estimatedCost
    let changeOutputIndex = -1
    if (change > 546n) {
        transaction.addOutput({
            to: recipientAddress,
            amount: change
        })
        changeOutputIndex = transaction.outputs.length - 1
        transactionHex = transaction.build()  // Rebuild with change
    }

    while((funderUtxosPrimary.length > 0 || funderUtxosSecondary.length > 0) && !enoughFunds) {
        let additionalFunderInput = funderUtxosPrimary.shift() as UtxoWithPath

        if (!additionalFunderInput) {
            additionalFunderInput = funderUtxosSecondary.shift() as UtxoWithPath
        }
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
                    to: recipientAddress, 
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
            userPrompt: 'Create Authguad Key NFT (Authkey)',
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