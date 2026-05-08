import { ElectrumNetworkProvider, Network, placeholderP2PKHUnlocker, TokenDetails, TransactionBuilder } from "cashscript"
import { UtxoWithPath } from "../types"
import { createAuthguardContract } from "../authguard"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE } from "../constants"
import { getMinimumFee, hexToBin } from "@bitauth/libauth"

export type CreateTokenParams = {
    tokenSpec: Omit<TokenDetails, 'category'>,                   // The new spec of the new token to be created
    genesisInputUtxoId: `${string}:${number}`, // txid:vout
    authKeyUtxoId: `${string}:${number}`,
    authKeyRecipientAddress: string,           // token address
    changeRecipientAddress?: string,           
    sourceOutputs: UtxoWithPath[],
    network?: Network,
    registryPublicationData: {
        contentHash: string,
        uris: string[]
    }
}

export function createToken(params: CreateTokenParams): string {

    const genesisInput = params.sourceOutputs.find(u => {
        return (
            params.genesisInputUtxoId === `${u.txid}:${u.vout}`
        )
    })

    if (!genesisInput) throw new Error('Genesis input not found from source utxos')

    const authKeyInput = params.sourceOutputs.find(u => {
        return (
            params.authKeyUtxoId === `${u.txid}:${u.vout}`
        )
    })

    if (!authKeyInput) throw new Error('AuthKey not found from source utxos')
    
    const createNewAuthKey = !authKeyInput.token

    if (createNewAuthKey && authKeyInput.vout !== 0) throw new Error('AuthKey utxo should be a valid genesis input if creating an AuthKey genesis.')

    if (!createNewAuthKey && authKeyInput?.token?.nft?.commitment !== '00') throw new Error('Invalid AuthKey commitment format') 
    
    const newToken = {
        ...params.tokenSpec,
        category: genesisInput.txid
    }

    let authKeyToken = authKeyInput.token
    
    if (createNewAuthKey) {
        // Authkey Genesis
        authKeyToken = {
            category: authKeyInput.txid,
            amount: 0n,
            nft: {
                capability: 'none',
                commitment: '00'
            }
        }
    }   

    const authguardContract = createAuthguardContract({
        authKeyTokenId: authKeyToken!.category,
        network: params.network
    })


    const transaction = new TransactionBuilder({
        provider: new ElectrumNetworkProvider(params.network)
    })

    let funds = [genesisInput, authKeyInput].reduce((acc, nextInput) => {
        acc = acc + nextInput.satoshis
        return acc
    }, 0n)

    transaction.addInput(genesisInput, placeholderP2PKHUnlocker(genesisInput.address))
    transaction.addInput(authKeyInput, placeholderP2PKHUnlocker(authKeyInput.address))
    transaction.addOutput({
        to: authguardContract.tokenAddress,
        amount: DEFAULT_TOKEN_VALUE,
        token: newToken
    })
    transaction.addOutput({
        to: params.authKeyRecipientAddress,
        amount: authKeyInput.satoshis || DEFAULT_TOKEN_VALUE,
        token: authKeyToken
    })
    
    transaction.addOpReturnOutput([
        'BCMR', 
        `0x${params.registryPublicationData.contentHash}`,
        ...params.registryPublicationData.uris
    ])

    let build = transaction.build()
    
    const minCost = DEFAULT_TOKEN_VALUE * 2n
    const minimumFee = getMinimumFee(BigInt(hexToBin(build).length), DEFAULT_FEE_RATE_SATS_PER_KB)
    const estimatedCost = minCost + minimumFee
    
    if (funds < estimatedCost) {
        throw new Error('The genesis input have insufficient BCH balance. Try consolidating your BCH.')
    }

    const change = estimatedCost - funds
    if (change > 546n) {
        transaction.addOutput({
            to: params.changeRecipientAddress || params.authKeyRecipientAddress,
            amount: change
        })
        build = transaction.build()  // Rebuild with change
    }

    console.log('Build', build)
    return build
}