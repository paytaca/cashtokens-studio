

import {  Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "src/core/types"
import { createAuthguardContract } from "src/core/authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "src/core/constants"
import { encodeCashAddress, getMinimumFee, hexToBin, decodeCashAddress, CashAddressType} from "bitauth-libauth-v3"
import { jsonReplacer } from "src/core/transaction"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { binToHex } from "bitauth-libauth-v3"
import { CustomElectrumNetworkProvider } from "src/services/electrum"
import { createPoolManagerContract } from "./create-pool-manager-contract"

export type CreatePoolFromFungibleReservesParams = {
    fungibleReserveUtxo: UtxoWithPath,
    poolSatoshiValue: bigint,
    poolTokenValue: bigint,
    poolOwnerAddress: string,
    poolOwnerBchUtxos: UtxoWithPath[],
    authkeyUtxo: UtxoWithPath,
    funderUtxos: UtxoWithPath[],
    authKeyRecipientAddress?: string,
    network?: Network,
    feeRateSatsPerKb?: bigint
    userPrompt?: string
}

export function createPoolFromFungibleReserves(params: CreatePoolFromFungibleReservesParams): SignTransactionRequest {

    console.log('@CustomElectrumNetworkProvider', CustomElectrumNetworkProvider)
    const feeRateSatsPerKb = params.feeRateSatsPerKb || DEFAULT_FEE_RATE_SATS_PER_KB
    if (!params.fungibleReserveUtxo?.token) throw new Error(`Transferring tokens requires a token of the same category.`)
    if (params.authkeyUtxo?.token?.nft?.commitment !== '00') throw new Error(`Invalid AuthKey.`)
    if (!params.poolSatoshiValue || !params.poolTokenValue) throw new Error(`Invalid Amounts.`)
    
    const poolOwnerDecodedAddress = decodeCashAddress(params.poolOwnerAddress)
    if (typeof(poolOwnerDecodedAddress) === 'string') throw new Error(`Error decoding pool owner's address.`)
    const { payload } = poolOwnerDecodedAddress
    const poolOwnerPkh = binToHex(payload)
    const poolManagerContract = createPoolManagerContract({ poolOwnerPkh, network: params.network })

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
        params.fungibleReserveUtxo,
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

    transaction.addInput(params.fungibleReserveUtxo, authguardContract.unlock.unlockWithNft(true) as any)
    transaction.addInput(params.authkeyUtxo, placeholderP2PKHUnlocker(params.authkeyUtxo.address))
    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))

    const tokenChange = params.fungibleReserveUtxo.token.amount - params.poolTokenValue
    if (tokenChange < 0n) {
        throw new Error('Insufficient token balance')
    }
    transaction.addOutput({
        to: authguardContract.tokenAddress,
        amount: params.fungibleReserveUtxo.satoshis,
        token: {
            ...params.fungibleReserveUtxo.token,
            amount: tokenChange
        }
    })
    transaction.addOutput({
        to: authkeyRecipientTokenAddress,
        amount: params.authkeyUtxo.satoshis,
        token: params.authkeyUtxo.token
    })

    const pool = {
      to: poolManagerContract.tokenAddress,
      amount: params.poolSatoshiValue,
      token: {
        category: params.fungibleReserveUtxo.token.category,
        amount: params.poolTokenValue
      }
    }

    transaction.addOutput(pool)
    transaction.addOpReturnOutput(['SUMMON', '0x' + poolOwnerPkh])
    
    let transactionHex = transaction.build()
    // const fixedCost = DEFAULT_TOKEN_VALUE * 3n
    const fixedCost = 0n
    let unlockingBytecodesBytesize = P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + unlockingBytecodesBytesize + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE), 
        feeRateSatsPerKb
    )
    // The pool output is funded from the same wallet inputs as the fee, so both must be reserved
    // before change is returned.
    const estimatedCost = params.poolSatoshiValue + fixedCost + minimumFee
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
        const newEstimatedCost = params.poolSatoshiValue + fixedCost + newMinimumFee
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
    // const sourceOutputs = buildWcSourceOutputs(transactionHex, spentUtxos)

    // const issuerTokenSourceOutputIndex = sourceOutputs.findIndex(s => {
    //     return `${binToHex(s.outpointTransactionHash)}:${s.outpointIndex}` === `${params.fungibleReserveUtxo.txid}:${params.fungibleReserveUtxo.vout}`
    // })

    // if (issuerTokenSourceOutputIndex === -1) throw new Error('Unexpected state, token issuer utxo not found on source output list')

    const wcPayload = transaction.generateWcTransactionObject()

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transaction.build(),
            sourceOutputs: JSON.parse(JSON.stringify(wcPayload.sourceOutputs, jsonReplacer)),
            userPrompt: params.userPrompt || 'Create Pool From Fungible Reserves',
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