import { ContractUnlocker, ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TokenDetails, TransactionBuilder, Unlocker, Utxo } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "@bitauth/libauth"
import { LibauthSourceOutput, utxoToLibauthSourceOutput, utxoToWizardConnectSourceOutput } from "./utils"
import { SourceOutput } from "@wizardconnect/core/hdwalletv1-serialize"

export type IssueFungibleTokensParams = {
    issuerTokenUtxo: UtxoWithPath,
    issuedTokenAmount: bigint,
    recipientAddress: string,
    authKeyUtxo: UtxoWithPath,
    authKeyRecipientAddress: string,           
    funderUtxos: UtxoWithPath[],
    network?: Network,
}

export type IssueFungibleTokensReturnType = {
    transaction: string,
    sourceOutputs: LibauthSourceOutput[]
}

export function issueFungibleTokens(params: IssueFungibleTokensParams): IssueFungibleTokensReturnType {

    if (!params.issuerTokenUtxo?.token) throw new Error(`Issuing tokens requires a token of the same category.`)
    if (params.authKeyUtxo?.token?.nft?.commitment !== '00') throw new Error(`Invalid AuthKey.`)
    if (!params.issuedTokenAmount) throw new Error(`Invalid token amount.`)

    const authguardContract = createAuthguardContract({
        authKeyTokenId: params.authKeyUtxo.token.category,
        network: params.network
    })

    // This is here because ts is complaining
    if (authguardContract.unlock?.unlockWithNft === undefined) throw new Error('Error creating Authguard contract.')

    const funderUtxo = 
        [
            ...params.funderUtxos
                .filter(utxo => !utxo.token && `${utxo.txid}:${utxo.vout}` !== `${params.authKeyUtxo.txid}:${params.authKeyUtxo.vout}`)
                .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
        ]

    const funderInput = funderUtxo.shift()

    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')
        const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })
    
    const spentUtxos = [
        params.issuerTokenUtxo, 
        params.authKeyUtxo,
        funderInput
    ]

    transaction.addInput(params.issuerTokenUtxo, authguardContract.unlock.unlockWithNft() as any)
    transaction.addInput(params.authKeyUtxo, placeholderP2PKHUnlocker(params.authKeyUtxo.address))
    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))
    transaction.addOutput({
        to: authguardContract.tokenAddress,
        amount: params.issuerTokenUtxo.satoshis,
        token: params.issuerTokenUtxo.token
    })
    transaction.addOutput({
        to: params.authKeyUtxo.address,
        amount: params.authKeyUtxo.satoshis,
        token: params.authKeyUtxo.token
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
            to: params.authKeyUtxo.address, // Return to owner of authKey
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
                    to: params.authKeyUtxo.address, // Return to owner of authKey
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
    
    return {
        transaction: transactionHex,
        sourceOutputs: spentUtxos.map(utxo => utxoToLibauthSourceOutput(utxo, true)) as LibauthSourceOutput[]
    }
}