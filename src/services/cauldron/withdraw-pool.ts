

import { Network, TransactionBuilder, placeholderPublicKey, placeholderSignature } from "cashscript"
import { DEFAULT_FEE_RATE_SATS_PER_KB, DEFAULT_TOKEN_VALUE, P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE, P2PKH_UNLOCKING_BYTECODE_BYTESIZE } from "../../core/constants"
import { getMinimumFee, hexToBin } from "bitauth-libauth-v3"
import { lockingBytecodeToCashAddress, encodeLockingBytecodeP2pkh } from "bitauth-libauth-v3"
import { CustomElectrumNetworkProvider } from "../electrum"
import { createPoolManagerContract } from "./create-pool-manager-contract"
import type { CauldronActivePool } from "./get-token-liquidity-pool"
import poolManagerArtifact from './artifacts/PoolManager.json' with { type: 'json'}
import { RelayMsgAction, SignTransactionRequest } from "@wizardconnect/core"
import { jsonReplacer } from "../../core/transaction/utils"
export type WithdrawPoolsParams = {
    pool: CauldronActivePool,
    poolOwnerPkh: string, // Public Key Hash Hex 
    network?: Network,
    userPrompt?: string
}

// TODO: Option to return supply to reserves
export function withdrawPool(params: WithdrawPoolsParams): SignTransactionRequest {
    const feeRateSatsPerKb = DEFAULT_FEE_RATE_SATS_PER_KB
    const poolOwnerP2pkhLockingBytecode = encodeLockingBytecodeP2pkh(hexToBin(params.poolOwnerPkh))
    const poolOwnerAddressPrefix = params.network === 'chipnet' ? 'bchtest': 'bitcoincash' 
    const poolOwnerAddress = lockingBytecodeToCashAddress({ 
        bytecode: poolOwnerP2pkhLockingBytecode,
        prefix: poolOwnerAddressPrefix,
        tokenSupport: true
    })
    
    const artifact = structuredClone(poolManagerArtifact)
    const poolOwnerPkhInitializedBytecode = artifact.bytecode.replace('<withdraw_pkh>', params.poolOwnerPkh)
    artifact.bytecode = poolOwnerPkhInitializedBytecode
    const poolManagerContract = createPoolManagerContract({ poolOwnerPkh: params.poolOwnerPkh, network: params.network })
    const poolUtxo = {
        txid: params.pool.txid,
        vout: params.pool.tx_pos,
        satoshis: BigInt(params.pool.sats),
        token: {
          category: params.pool.token_id,
          amount: BigInt(params.pool.tokens)
        }
      }

    const transaction = new TransactionBuilder({
        provider: new CustomElectrumNetworkProvider(params.network)})
    
    const spentUtxos = [
        poolUtxo
    ] as any[]

    if (poolManagerContract.unlock?.managePool === undefined) throw new Error('Error creating Authguard contract.')
    
    transaction.addInput(poolUtxo, poolManagerContract.unlock.managePool(placeholderPublicKey(), placeholderSignature()) as any)
    transaction.addOutput({ // split sats and token
        to: (poolOwnerAddress as any).address,
        amount: poolUtxo.satoshis
    })
    transaction.addOutput({ 
        to: (poolOwnerAddress as any).address,
        amount: 1000n,
        token: poolUtxo.token
    })

    
    let transactionHex = transaction.build()
    const fixedCost = DEFAULT_TOKEN_VALUE * 1n
    const unlockingBytecodesBytesize = P2PKH_UNLOCKING_BYTECODE_BYTESIZE * transaction.inputs.length
    const minimumFee = getMinimumFee(
        BigInt(hexToBin(transactionHex).length + unlockingBytecodesBytesize + P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE), 
        feeRateSatsPerKb
    )
    const estimatedCost = fixedCost + minimumFee
    if (estimatedCost > 2000n) throw new Error('Suspiciously high network fee. Contact admin!')
    transaction.outputs[0]!.amount = transaction.outputs[0]!.amount - estimatedCost
    transactionHex = transaction.build() // Rebuilding with real cost
    
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
