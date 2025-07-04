import { TokenI, UtxoI, Wallet } from "mainnet-js"
import { Contract, toCashScript } from "@mainnet-cash/contract"
import { AUTHGUARD_CONTRACT_SCRIPT, DEFAULT_TOKEN_VALUE } from "../constants"
import { calcMinerFee } from "../utils"
import { Artifact, Recipient, SignatureTemplate } from "cashscript"
import { TransactionCommon, cashAddressToLockingBytecode, decodeTransaction, hexToBin } from "@bitauth/libauth"
import { scriptToBytecode } from "@cashscript/utils"
/**
 * Create a mint transaction.
 * 
 * @param { Wallet } args.funderWallet The wallet that will fund the transaction, and also the owner of the authkey
 * @param { UtxoI } args.minter The minting Utxo locked with an Authguard unlockable by the provided authkey.
 */
export default async (args: {minter: UtxoI, authkey: UtxoI, tokensToMint:TokenI[], recipient: string, minterCommitment?:string, funderWallet: Wallet}): Promise<{decoded: TransactionCommon, sourceOutputs: any}> => {
  if (!args.authkey?.token?.tokenId) {
    throw new Error('Invalid authkey')
  }
  const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:1, P2PKH: 3 + args.tokensToMint.length})
  const mintCost = minerFee + (DEFAULT_TOKEN_VALUE * args.tokensToMint.length)
  const funderInput = (await args.funderWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > mintCost).map(toCashScript)[0]
  if (!funderInput) {
    throw new Error('Insufficient balance to fund the txn')
  }

  const [minter, authkey] = [args.minter, args.authkey].map(toCashScript)
  const sig = new SignatureTemplate(Uint8Array.from(Array(32)))

  const contract = new Contract(
    AUTHGUARD_CONTRACT_SCRIPT,
    [`0x${args.authkey.token.tokenId!.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
    args.funderWallet.network
  )

  const mintOutputs:Recipient[] = args.tokensToMint.map((token:TokenI) => {
    return {
      to: args.recipient, // token address
      amount: BigInt(DEFAULT_TOKEN_VALUE),
      token: {
        amount: BigInt(0),
        category: minter.token!.category,
        nft: {
          commitment: token.commitment,
          capability: token.capability
        }
      }
    }
  }) as Recipient[]
  if (args.minterCommitment != undefined) {
    minter.token!.nft!.commitment = args.minterCommitment
  }
  let transaction
  try {
    transaction =
      contract.getContractFunction('unlockWithNft')(true)
        .from(minter) // contract
        .fromP2PKH([authkey], sig) // AuthNFT/minting baton
        .fromP2PKH([funderInput], sig) //  Funder
        .to([{
          // return authchain identity output to contract
          to: contract.getTokenDepositAddress(),
          amount: minter.satoshis,
          token: minter.token
        }])
        .to([{
          // Return minting AuthNFT / minting baton to owner
          to: args.funderWallet.getTokenDepositAddress(),
          amount: BigInt(args.authkey!.satoshis),
          token: authkey.token
        }])
        .to(mintOutputs)
        .to(funderInput.satoshis - BigInt(mintCost) > 546 ?[{
          // change
          to: args.funderWallet.getDepositAddress(),
          amount: funderInput.satoshis - BigInt(mintCost)
        }]:[])
      .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

    const decoded = decodeTransaction(hexToBin(await transaction.build()))
    
    if (typeof decoded === 'string') {
      throw new Error('Failed to decode transaction')
    }
    const bytecode = (transaction as any).redeemScript;
      const artifact = {...contract.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      const sourceOutputs = [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contract.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(minter.satoshis),
          token: minter.token && {
            ...minter.token,
            category: hexToBin(minter.token!.category),
            nft: minter.token.nft && {
              ...minter.token.nft,
              commitment: hexToBin(minter.token.nft.commitment),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          }
        },
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(args.funderWallet.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(authkey.satoshis),
          token: authkey.token && {
            ...authkey.token,
            category: hexToBin(authkey.token!.category),
            nft: authkey.token.nft && {
              ...authkey.token.nft,
              commitment: hexToBin(authkey.token.nft.commitment),
            },
          }
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(args.funderWallet.getDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis)
        }
      ]
    return { decoded, sourceOutputs }
  } catch (error) {
    throw error
  }
}