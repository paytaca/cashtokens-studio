import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { addAuthheadSpendInputs, buildSignRequest, usableFunderUtxos } from "./utils"
import { SignTransactionRequest } from "@wizardconnect/core"

export type UnguardAuthheadParams = {
    authheadUtxo: UtxoWithPath
    authkeyUtxo: UtxoWithPath
    funderUtxos: UtxoWithPath[]
    recipientAddress: string
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
    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    const { authguardContract, authkeyTokenAddress } = addAuthheadSpendInputs({
        transaction,
        authheadUtxo: params.authheadUtxo,
        authkeyUtxo: params.authkeyUtxo,
        network: params.network
    })

    const funderUtxos = usableFunderUtxos(params.funderUtxos, params.authkeyUtxo)
    const funderInput = funderUtxos.shift()
    if (!funderInput) {
        throw new Error('Insufficient BCH balance to fund the transaction')
    }
    transaction.addInput(
        funderInput,
        placeholderP2PKHUnlocker(funderInput.address)
    )

    const spentUtxos = [
        params.authheadUtxo,
        params.authkeyUtxo,
        funderInput
    ]

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
        BigInt(hexToBin(transactionHex).length + P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
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
            BigInt(hexToBin(transactionHex).length + P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
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
 * @param params.recipientAddress - Example: Owner's token deposit address (e.g. wallet.getTokenDepositAddress(0))
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
        'Release Token Identity From Authguard Vault'
    )
}

