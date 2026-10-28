import {  Network, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { addAuthheadSpendInputs, buildSignRequest } from "./utils"
import { DEFAULT_FEE_RATE_SATS_PER_KB, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { SignTransactionRequest } from "@wizardconnect/core"
import { CustomElectrumNetworkProvider } from "src/services/electrum"

/** Flat fee for a burn: the point is to write the identity off, so the relay minimum is not the goal. */
export const BURN_FEE_SATS = 1000n

/** At or above this, the authhead pays the burn fee and the remainder returns as change. */
export const BURN_CHANGE_THRESHOLD_SATS = 2000n

export type BurnAuthheadParams = {
    authheadUtxo: UtxoWithPath
    authkeyUtxo: UtxoWithPath
    /**
     * The final registry publication. Its data-carrier output is the transaction's identity output
     * (index 0) — CHIP-BCMR's "burned" marker — so the transaction both publishes the last revision
     * and permanently terminates the authchain.
     */
    registryPublicationData: {
        contentHash: string
        uris: string[]
    }
    /** Where leftover value returns; e.g. `wallet.getTokenDepositAddress(0)`. */
    changeAddress: string
    network?: Network
    /** Wallet prompt; pass an i18n string from the caller. */
    userPrompt?: string
}

/**
 * Burns an identity by spending its vaulted identity output with the AuthKey and writing the final
 * metadata registry publication as that identity output.
 *
 * CashTokens allows tokens to be implicitly destroyed by omission from a transaction's outputs, so
 * the identity's tokens are destroyed with the output that held them; there is no burn address
 * involved. Once the identity output is a data carrier, CHIP-BCMR considers the identity burned and
 * the authchain terminated.
 *
 * The AuthKey is returned to the owner instead of being destroyed: a single AuthKey unlocks every
 * vault output at its AuthGuard contract, so burning the key would strand any sibling vault output —
 * including the funds the registry spec tells clients to reclaim. It is recreated after the identity
 * output, so a later output cannot continue the authchain and the burn marking is unaffected.
 *
 * The authhead's own value pays the fee: at or above {@link BURN_CHANGE_THRESHOLD_SATS} the fee is
 * {@link BURN_FEE_SATS} and the rest comes back as change, below that the value only has to cover
 * the relay minimum and everything else is burned with the tokens.
 */
export function burnAuthhead(params: BurnAuthheadParams): SignTransactionRequest {
    const transaction = new TransactionBuilder({
        provider: new CustomElectrumNetworkProvider(params.network),
        allowImplicitFungibleTokenBurn: true
    })

    const { authkeyTokenAddress } = addAuthheadSpendInputs({
        transaction,
        authheadUtxo: params.authheadUtxo,
        authkeyUtxo: params.authkeyUtxo,
        network: params.network
    })

    const spentUtxos: UtxoWithPath[] = [params.authheadUtxo, params.authkeyUtxo]

    // Output 0 is always the identity output, so the publication has to be created first.
    transaction.addOpReturnOutput([
        'BCMR',
        `0x${params.registryPublicationData.contentHash}`,
        ...params.registryPublicationData.uris
    ])

    // The AuthKey comes home: it carries its own value back, so keeping it costs nothing.
    transaction.addOutput({
        to: authkeyTokenAddress,
        amount: params.authkeyUtxo.satoshis,
        token: params.authkeyUtxo.token
    })

    if (params.authheadUtxo.satoshis >= BURN_CHANGE_THRESHOLD_SATS) {
        const change = params.authheadUtxo.satoshis - BURN_FEE_SATS
        if (change > 546n) {
            transaction.addOutput({
                to: params.changeAddress,
                amount: change
            })
        }
    }

    const transactionHex = transaction.build()
    const outputValue = transaction.outputs.reduce((sum, output) => sum + output.amount, 0n)
    const availableValue = spentUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0n)
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        DEFAULT_FEE_RATE_SATS_PER_KB
    )

    // Whatever is not recreated in an output is the fee, so a burn never under-pays the relay minimum.
    if (availableValue - outputValue < minimumFee) {
        throw new Error('The burned UTXOs do not cover the network fee.')
    }

    return buildSignRequest(
        transaction,
        transactionHex,
        spentUtxos,
        params.userPrompt || 'Burn Token Identity'
    )
}
