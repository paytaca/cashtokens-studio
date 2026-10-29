import {  Network, placeholderP2PKHUnlocker, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "../constants"
import { getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { buildWcSourceOutputs, jsonReplacer } from "../transaction/utils"
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { decodeTransactionCommon, TransactionCommon } from "bitauth-libauth-v3"
import { CustomElectrumNetworkProvider } from "src/services/electrum"
import { createAirdropBeaconContract } from "./create-airdrop-beacon-contract"

export type optIntParams = {
    airdropBeaconTokenCategory: string,
    airdropBeaconAdminId: string,
    recipientAddress: string,
    walletUtxos: UtxoWithPath[],
    network?: Network,
}

export async function optInToAirdrops(params: optIntParams): Promise<SignTransactionRequest> {

    const funderUtxos = params.walletUtxos
        .filter(u => !u.token)
        .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))

    const funderInput = funderUtxos.shift()

    if (!funderInput) throw new Error('Insufficient BCH balance to fund the transaction')

    const transaction = new TransactionBuilder({
        provider: new CustomElectrumNetworkProvider(params.network)
    })


    const airdropBeaconContract = createAirdropBeaconContract({
        beaconTokenCategory: params.airdropBeaconTokenCategory,
        beaconAdminId: params.airdropBeaconAdminId,
        network: params.network
    })
    
    if (airdropBeaconContract.unlock?.optIn === undefined) throw new Error('Error creating Airdrop contract.')
    const airdropBeaconAdminNfts = 
        (await airdropBeaconContract.getUtxos())?.filter((u) => u.token?.category === params.airdropBeaconTokenCategory && u.token?.nft?.capability === 'minting')

    const airdropBeaconAdminNft = airdropBeaconAdminNfts[Math.floor(Math.random() * airdropBeaconAdminNfts.length)];
    if (!airdropBeaconAdminNft) throw new Error('Error, no available Airdrop beacon admin NFT.')

    const spentUtxos = [airdropBeaconAdminNft, funderInput] as UtxoWithPath[]

    transaction.addInput(airdropBeaconAdminNft!, airdropBeaconContract.unlock.optIn())
    transaction.addInput(funderInput, placeholderP2PKHUnlocker(funderInput.address))

    transaction.addOutput({
        to: airdropBeaconContract.tokenAddress,
        amount: airdropBeaconAdminNft.satoshis,
        token: {
            category: airdropBeaconAdminNft.token!.category,
            amount: airdropBeaconAdminNft.token!.amount
        }
    })

    transaction.addOutput({
        to: params.recipientAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: {
            category: airdropBeaconAdminNft.token!.category,
            amount: 0n,
            nft: {
                capability: 'none',
                commitment: '01'
            }
        }
    })

    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE),
        DEFAULT_FEE_RATE_SATS_PER_KB
    )
    const estimatedCost = fixedCost + minimumFee
    let totalSatoshiFunds = BigInt(funderInput.satoshis)
    let enoughFunds = totalSatoshiFunds > estimatedCost
    const change = totalSatoshiFunds - estimatedCost
    let changeOutputIndex = -1
    if (change > 546n) {
        transaction.addOutput({
            to: params.recipientAddress,
            amount: change
        })
        changeOutputIndex = transaction.outputs.length - 1
        transactionHex = transaction.build()
    }

    while (funderUtxos.length > 0 && !enoughFunds) {
        const additionalFunderInput = funderUtxos.shift() as UtxoWithPath
        transaction.addInput(
            additionalFunderInput,
            placeholderP2PKHUnlocker(additionalFunderInput.address)
        )
        spentUtxos.push(additionalFunderInput)
        totalSatoshiFunds += BigInt(additionalFunderInput.satoshis)
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
                    to: params.recipientAddress,
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

    const userPrompt = 'Receive Airdrop Beacon NFT'

    const wcPayload = transaction.generateWcTransactionObject()

    return {
        action: RelayMsgAction.SignTransactionRequest,
        transaction: {
            transaction: transaction.build(),
            sourceOutputs: JSON.parse(JSON.stringify(wcPayload.sourceOutputs, jsonReplacer)),
            userPrompt: userPrompt,
            broadcast: false
        },
        inputPaths: spentUtxos.map((utxo, inputIndex) => {
            if (!utxo.pathName) return []
            return [inputIndex, utxo.pathName, utxo.addressIndex]
        }).filter(p => p.length === 3) as [number, string, number][]
    } as SignTransactionRequest
}
