import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE } from "../constants"
import { encodeCashAddress, getMinimumFee, hexToBin, decodeCashAddress, CashAddressType } from "bitauth-libauth-v3"
import { jsonReplacer, utxoToWcSourceOutput, UtxoToWcSourceOutputParams } from "./utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { binToHex, decodeTransactionCommon, Output, TransactionCommon } from "@bitauth/libauth"

export type UnguardAuthheadParams = {
    authheadUtxo: UtxoWithPath
    authkeyUtxo: UtxoWithPath
    funderUtxos: UtxoWithPath[]
    recipientAddress: string
    network?: Network
}

export type BurnAuthheadParams = {
    authheadUtxo: UtxoWithPath
    authkeyUtxo: UtxoWithPath
    funderUtxos: UtxoWithPath[]
    burnAddress: string
    network?: Network
}

function buildAuthheadTransaction(
    params: {
        authheadUtxo: UtxoWithPath
        authkeyUtxo: UtxoWithPath
        funderUtxos: UtxoWithPath[]
        network?: Network
    }
) {
    if (!params.authheadUtxo?.token) {
        throw new Error('Authhead UTXO must have a token.')
    }
    if (!params.authkeyUtxo?.token) {
        throw new Error('Authkey UTXO is missing.')
    }
    if (params.authkeyUtxo.token.nft?.commitment !== '00') {
        throw new Error('Invalid AuthKey.')
    }

    const authguardContract = createAuthguardContract({
        authkeyTokenId: params.authkeyUtxo.token.category,
        network: params.network
    })

    if (authguardContract.unlock?.unlockWithNft === undefined) {
        throw new Error('Error creating Authguard contract.')
    }

    const funderUtxos = [
        ...params.funderUtxos
            .filter(utxo =>
                !utxo.token &&
                `${utxo.txid}:${utxo.vout}` !== `${params.authkeyUtxo.txid}:${params.authkeyUtxo.vout}`
            )
            .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
    ]

    const funderInput = funderUtxos.shift()
    if (!funderInput) {
        throw new Error('Insufficient BCH balance to fund the transaction')
    }

    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    const spentUtxos = [
        params.authheadUtxo,
        params.authkeyUtxo,
        funderInput
    ]

    transaction.addInput(
        params.authheadUtxo,
        authguardContract.unlock.unlockWithNft(false) as any
    )
    transaction.addInput(
        params.authkeyUtxo,
        placeholderP2PKHUnlocker(params.authkeyUtxo.address)
    )
    transaction.addInput(
        funderInput,
        placeholderP2PKHUnlocker(funderInput.address)
    )

    const decodedAuthkeyAddress = decodeCashAddress(params.authkeyUtxo.address)
    if (typeof decodedAuthkeyAddress === 'string') {
        throw new Error('Error decoding Authkey address')
    }
    const authkeyTokenAddress = encodeCashAddress({
        payload: decodedAuthkeyAddress.payload,
        prefix: decodedAuthkeyAddress.prefix,
        type: CashAddressType.p2pkhWithTokens
    }).address

    return {
        transaction,
        spentUtxos,
        funderUtxos,
        funderInput,
        authkeyTokenAddress,
        authguardContract
    }
}

function finalizeTransaction(
    transaction: TransactionBuilder,
    spentUtxos: UtxoWithPath[],
    funderUtxos: UtxoWithPath[],
    funderInput: UtxoWithPath,
    authkeyTokenAddress: string
) {
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
            to: authkeyTokenAddress,
            amount: change
        })
        changeOutputIndex = transaction.outputs.length - 1
        transactionHex = transaction.build()
    }

    while (funderUtxos.length > 0 && !enoughFunds) {
        const additionalFunder = funderUtxos.shift() as UtxoWithPath
        transaction.addInput(
            additionalFunder,
            placeholderP2PKHUnlocker(additionalFunder.address)
        )
        spentUtxos.push(additionalFunder)
        totalSatoshiFunds += additionalFunder.satoshis
        transactionHex = transaction.build()

        const newMinimumFee = getMinimumFee(
            BigInt(hexToBin(transactionHex).length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
            DEFAULT_FEE_RATE_SATS_PER_KB
        )
        const newEstimatedCost = fixedCost + newMinimumFee
        enoughFunds = totalSatoshiFunds > newEstimatedCost
        const newChange = totalSatoshiFunds - newEstimatedCost
        if (newChange > 546n) {
            if (changeOutputIndex === -1) {
                transaction.addOutput({
                    to: authkeyTokenAddress,
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

    if (!enoughFunds) {
        throw new Error('Insufficient BCH balance to fund the transaction')
    }

    return { transactionHex, spentUtxos }
}

function buildSignRequest(
    transaction: TransactionBuilder,
    transactionHex: string,
    spentUtxos: UtxoWithPath[],
    userPrompt: string
): SignTransactionRequest {
    const sourceOutputs = spentUtxos.map((utxo) => {
        const args: UtxoToWcSourceOutputParams = { utxo }
        return utxoToWcSourceOutput(args)
    })

    const authheadIndex = sourceOutputs.findIndex(s =>
        `${binToHex(s.outpointTransactionHash)}:${s.outpointIndex}` ===
        `${spentUtxos[0].txid}:${spentUtxos[0].vout}`
    )
    if (authheadIndex === -1) {
        throw new Error('Authhead UTXO not found in source outputs')
    }

    const decodedTransaction = decodeTransactionCommon(hexToBin(transactionHex)) as TransactionCommon
    const unlockingBytecode = transaction.inputs[authheadIndex]?.unlocker.generateUnlockingBytecode({
        transaction: decodedTransaction as TransactionCommon,
        sourceOutputs: sourceOutputs.map((sourceOutput) => ({
            lockingBytecode: sourceOutput.lockingBytecode,
            token: sourceOutput.token,
            valueSatoshis: sourceOutput.valueSatoshis
        })) as Output[],
        inputIndex: authheadIndex
    })

    sourceOutputs[authheadIndex]!.unlockingBytecode = unlockingBytecode as Uint8Array

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
            return [inputIndex, utxo.pathName, utxo.addressIndex]
        }).filter(p => p.length === 3) as [number, string, number][]
    } as SignTransactionRequest
}

/**
 * Releases an authhead UTXO from the AuthGuard contract back to the owner's wallet.
 *
 * The authhead UTXO is unlocked with `keepGuarded = false`, removing it from the
 * AuthGuard's control. The authkey UTXO is returned to the owner, and a funder UTXO
 * covers transaction fees.
 *
 * @param params.authheadUtxo - The vault UTXO currently locked in the AuthGuard contract
 * @param params.authkeyUtxo - The controlling AuthKey UTXO (proves ownership)
 * @param params.funderUtxos - Non-token wallet UTXOs to fund BCH fees
 * @param params.recipientAddress - Owner's token deposit address (e.g. wallet.getTokenDepositAddress(0))
 * @param params.network - BCH network (defaults to VITE_BCH_NETWORK)
 * @returns A SignTransactionRequest for WalletConnect signing
 * @throws If the authhead UTXO has no token, authkey is invalid, or insufficient BCH
 */
export function unguardAuthhead(params: UnguardAuthheadParams): SignTransactionRequest {
    const {
        transaction,
        spentUtxos,
        funderUtxos,
        funderInput,
        authkeyTokenAddress
    } = buildAuthheadTransaction(params)

    transaction.addOutput({
        to: params.recipientAddress,
        amount: params.authheadUtxo.satoshis,
        token: params.authheadUtxo.token
    })

    transaction.addOutput({
        to: authkeyTokenAddress,
        amount: params.authkeyUtxo.satoshis,
        token: params.authkeyUtxo.token
    })

    const { transactionHex, spentUtxos: finalSpentUtxos } = finalizeTransaction(
        transaction,
        spentUtxos,
        funderUtxos,
        funderInput,
        authkeyTokenAddress
    )

    return buildSignRequest(
        transaction,
        transactionHex,
        finalSpentUtxos,
        'Release Utxo From Authguard'
    )
}

/**
 * Sends an authhead UTXO to the burn address, discarding its token permanently.
 *
 * The authhead is unlocked with `keepGuarded = false`, and the output is directed to
 * the network's burn address. This destroys any fungible token amount and/or NFT
 * minting capability, and prevents further registry updates for this token category.
 *
 * @param params.authheadUtxo - The vault UTXO currently locked in the AuthGuard contract
 * @param params.authkeyUtxo - The controlling AuthKey UTXO (proves ownership)
 * @param params.funderUtxos - Non-token wallet UTXOs to fund BCH fees
 * @param params.burnAddress - The burn address to send the authhead token to
 * @param params.network - BCH network (defaults to VITE_BCH_NETWORK)
 * @returns A SignTransactionRequest for WalletConnect signing
 * @throws If the authhead UTXO has no token, authkey is invalid, or insufficient BCH
 */
export function burnAuthhead(params: BurnAuthheadParams): SignTransactionRequest {
    const {
        transaction,
        spentUtxos,
        funderUtxos,
        funderInput,
        authkeyTokenAddress
    } = buildAuthheadTransaction(params)

    transaction.addOutput({
        to: params.burnAddress,
        amount: params.authheadUtxo.satoshis,
        token: params.authheadUtxo.token
    })

    transaction.addOutput({
        to: authkeyTokenAddress,
        amount: params.authkeyUtxo.satoshis,
        token: params.authkeyUtxo.token
    })

    const { transactionHex, spentUtxos: finalSpentUtxos } = finalizeTransaction(
        transaction,
        spentUtxos,
        funderUtxos,
        funderInput,
        authkeyTokenAddress
    )

    return buildSignRequest(
        transaction,
        transactionHex,
        finalSpentUtxos,
        'Burn Token Identity'
    )
}
