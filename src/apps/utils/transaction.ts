import {
    hexToBin,
    importWalletTemplate,
    Scenario,
    walletTemplateP2pkh,
    walletTemplateToCompilerBch,
    type WalletTemplate,
    type Input,
    type Output,
    generateTransaction,
    encodeTransactionCommon,
    getMinimumFee,
} from "bitauth-libauth-v3"
import { Utxo } from "cashscript"

export type FeeEstimationOptions = {
    template: WalletTemplate,
    inputs: Input[],
    outputs: Output[],
    dustRelayFeeSatPerKb?: bigint
}


export const cashscriptUtxoToLibauthInput = (utxo: Utxo, unlockingBytecode: string|Uint8Array, sequenceNumber = 0): Input => {
  let unlockingBytecodeByte: Uint8Array = Uint8Array.from([])
  if (typeof(unlockingBytecode) === 'string') {
    unlockingBytecodeByte = hexToBin(unlockingBytecode)
  } 
  return {
    outpointIndex: Number(utxo.vout),
    outpointTransactionHash: hexToBin(utxo.txid),
    sequenceNumber,
    unlockingBytecode: unlockingBytecodeByte
  }
}

export const cashscriptUtxoToLibauthOutput = (utxo: Utxo, lockingBytecode: string | Uint8Array) => {
  const output: Output = {
    valueSatoshis: BigInt(utxo.satoshis),
    lockingBytecode: Uint8Array.from([])
  }

  if (typeof (lockingBytecode) === 'string') {
    output.lockingBytecode = hexToBin(lockingBytecode)
  }

  if (utxo.token) {
    output.token = {
        amount: BigInt(utxo.token.amount),
        category: hexToBin(utxo.token.category)
    }
    if (utxo.token.nft) {
        output.token.nft = {
            capability: utxo.token.nft.capability,
            commitment: hexToBin(utxo.token.nft.commitment)
        }
    }
  }
  return output
}

export const estimateFee = ({ template, inputs, outputs, dustRelayFeeSatPerKb = 1100n }: FeeEstimationOptions) => {
    let walletTemplate = template
    if(!template) {
        walletTemplate = walletTemplateP2pkh
    }
    const parsedTemplate = importWalletTemplate(template)
    if (typeof parsedTemplate === 'string') {
        throw new Error('Failed creating multisig wallet template.')
    }
    const compiler = walletTemplateToCompilerBch(parsedTemplate)

    // Estimate fee
    const sampleEntityId = Object.keys(template.entities)[0]
    const sampleScriptId = template.entities[sampleEntityId].scripts!.find((scriptId) => scriptId !== 'lock')
    const scenario = compiler.generateScenario({
        unlockingScriptId: sampleScriptId
    }) as Scenario

    scenario.program.transaction.inputs = inputs
    scenario.program.transaction.outputs = outputs

    const transactionForFeeEstimation = generateTransaction(scenario.program.transaction) as any
    const estimatedTransactionSize = encodeTransactionCommon(transactionForFeeEstimation.transaction).length
    
    const minimumFee = getMinimumFee(BigInt(estimatedTransactionSize), dustRelayFeeSatPerKb)
    return {
    estimatedTransactionSize,
    minimumFee
    }
}
