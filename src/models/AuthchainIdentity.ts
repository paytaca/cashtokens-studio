import { BCMR, Mainnet, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { cashAddressToLockingBytecode, decodeTransaction, encodeTransaction, hexToBin, sha256 } from '@bitauth/libauth'
import CashStudioToken from "./CashStudioToken"
import { AuthChainGuard, AuthNFT as AuthNFTI, Authchain, CashStudioTokenI, Message, Messaging, Processing, Registry, RegistryPublicationInput } from "./interfaces"
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/utils/getWalletClass'
import constants from 'src/constants'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, HashType, SignatureTemplate, Utxo } from 'cashscript'
import { scriptToBytecode } from '@cashscript/utils'
import getByteCount from 'src/utils/getByteCount'
import AuthNFT from './AuthNFT'
import { toValue } from 'vue'
import calcMinerFee from 'src/utils/calcMinerFee'
import AuthGuard from './AuthGuard'

/**
 * In an AuthGuard context an AuthchainIdentity are the tokens that are on an AuthGuard address
 * Without AuthGuard it could be any Utxo vout=0 of the owner's address
 * TODO.: Also include plain utxo @ vout0?
 * TODO..: To get the token category managed by this utxo, the utxo's txid is
 * TODO...: = the txid of the tokens authhead in chaingraph or paytaca's bcmr
 * TODO....: we can get the authhead using that instantiate an AuthchainIdentity
 *
 */
export default class AuthchainIdentity extends CashStudioToken implements Authchain, Processing, Messaging {

  private static _processing?:string

  async publish(opt:{url: string, contentHash: string}):Promise<any> {
    this._processing = 'Processing'
    const publicationCost = calcMinerFee({'P2SH-P2WPKH':1}, {P2SH:1, P2PKH: 1})
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > publicationCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authNFTInput] = [this.utxo, this.authNFT!.utxo!].map(toCashScript)
    console.log('0', authchainIdentityOutput)
    console.log('1', authNFTInput)
    console.log(this.authNFT!.authGuard!.contract!.getTokenDepositAddress())

    let transaction
    let decoded
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const sig2 = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authNFT!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authNFT!.ownerWallet!.getTokenDepositAddress()
    const tokenOwner = this.ownerWallet!.getDepositAddress()
    const w = await (getWalletClass()).watchOnly(contractAddress)
    const utxos = (await w.getAddressUtxos()).map(toCashScript)
    console.log('RAW UTXOS', utxos)
    console.log('IDENTITY OUTPUT UTXOS', authchainIdentityOutput)
    console.log('CONTRACT', contract)
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')()
          .from(authchainIdentityOutput) // contract
          .fromP2PKH([authNFTInput], sig) // AuthNFT/minting baton, funder
          .fromP2PKH([funderInput], sig) // AuthNFT/minting baton, funder
          .to([{
            // return authchain identity output to contract
            to: contractAddress,
            amount: authchainIdentityOutput.satoshis,
            token: authchainIdentityOutput.token
          }])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authNFT!.satoshis),
            token: authNFTInput.token
          }])
          // .withOpReturn([
          //   'BCMR',
          //   opt.contentHash, // sha256 of the contents from the uri below
          //   opt.url.replace('https://', '')
          // ])
          // .to([{
          //   // change
          //   to: tokenOwner,
          //   amount: funderInput.satoshis - BigInt(publicationCost)
          // }])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(publicationCost))

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        console.log('decoded:', decoded)
        delete this._processing
        throw new Error('Failed to decode transaction')
      }
    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error building transaction')
    }
    this._processing = 'Waiting for signature'
    let signingResult
    try {

      const bytecode = (transaction as any).redeemScript;
      const artifact = {...contract.artifact} as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      // decoded.inputs[0].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contract.getTokenDepositAddress()) as any).bytecode,
          valueSatoshis: BigInt(authchainIdentityOutput.satoshis),
          token: authchainIdentityOutput.token && {
            ...authchainIdentityOutput.token,
            category: hexToBin(authchainIdentityOutput.token!.category),
            nft: authchainIdentityOutput.token.nft && {
              ...authchainIdentityOutput.token.nft,
              commitment: hexToBin(authchainIdentityOutput.token.nft.commitment),
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
          lockingBytecode: (cashAddressToLockingBytecode(batonOwner) as any).bytecode,
          valueSatoshis: BigInt(authNFTInput.satoshis),
          token: authNFTInput.token && {
            ...authNFTInput.token,
            category: hexToBin(authNFTInput.token!.category),
            nft: authNFTInput.token.nft && {
              ...authNFTInput.token.nft,
              commitment: hexToBin(authNFTInput.token.nft.commitment),
            },
          }
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(tokenOwner) as any).bytecode,
          valueSatoshis: funderInput.satoshis - BigInt(publicationCost),
        }
      ],
        broadcast: false,
        userPrompt: 'Publish registry update'
      });

    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error signing transaction')
    }

    if (!signingResult?.signedTransaction) {
      delete this._processing
      return
    }

    const decodedSigned = decodeTransaction(hexToBin(signingResult.signedTransaction))
    console.log(
      binToHex((cashAddressToLockingBytecode(contractAddress) as any).bytecode)
        === binToHex(decodedSigned.outputs[0].lockingBytecode)
      )
    console.log('SIGNED TX', signingResult!.signedTransaction)
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      console.log('TX', tx)
      return tx
    } catch (error) {
      console.log('Error:AuthChainGuard@publish', error)
    } finally {
      delete this._processing
    }

  }

  transfer(newOwnerAddress: string): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }
  burn(): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }
  /**
   * If this is an Identity Output of an AuthGuard
   */
  ensureAuthGuard(){
    if(this.useAuthGuard && !this.authNFT) {
      throw new Error('AuthGuard enabled but authNFT not set')
    }
  }

  static get processing(): string|undefined {
    return AuthchainIdentity._processing
  }

  // private set processing(v:string) {
  //   AuthchainIdentity._processing = v
  // }

  /**
   * Scan wallet for any utxo with commitment = '00' (AuthNFT spec).
   * Check each AuthNFT's AuthGuard for utxos (those are the AuthNFT's/AuthGuard's managed token categories)
   * Each managed token category of each AuthGuard = AuthchainIdentity
   * @returns {AuthchainIdentity[]}
   */
  static async scanWalletForAuthchainIdentityUtxos(ownerWallet:Wallet): Promise<any[]> {
    AuthchainIdentity._processing = 'Scanning wallet for authchain identities'
    const identities:any[] = []
    const batonLikeUtxos = (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => {
      // get AuthNFT/batons
      return u.token && u.token.tokenId && u.token.commitment === '00'
    })
    // identities.push(...batonLikeUtxos)
    const identityUtxos = []
    for(let i=0; i < batonLikeUtxos.length; i++) {
      const key = new AuthNFT({...batonLikeUtxos[i], ownerWallet:ownerWallet})
      identityUtxos.push(...(await key.authGuard.getLockedTokenIdentities()))
    }
    identities.push(...identityUtxos)
    delete AuthchainIdentity._processing
    return identities
  }

  static async scanWalletForAuthchainIdentitiesO(ownerWallet:Wallet): Promise<AuthchainIdentity[]> {
    AuthchainIdentity._processing = 'Scanning wallet for authchain identities'
    const identities:any[] = []
    const batonLikeUtxos = (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => {
      // get AuthNFT/batons
      return u.token && u.token.tokenId && u.token.commitment === '00'
    })
    const identityUtxos = []
    for(let i=0; i < batonLikeUtxos.length; i++) {
      const key = new AuthNFT({...batonLikeUtxos[i], ownerWallet:ownerWallet})
      identityUtxos.push(...(await key.authGuard.getLockedTokenIdentities()))
    }
    for(let i=0; i < identityUtxos.length; i++) {
      const authNFT:AuthNFT = new AuthNFT({...identityUtxos[i], ownerWallet:ownerWallet})
      identities.push(new AuthchainIdentity({...identityUtxos[i], authNFT, ownerWallet:ownerWallet}))
    }
    delete  AuthchainIdentity._processing
    return identities
  }

  static async scanWalletForAuthchainIdentities(ownerWallet:Wallet): Promise<AuthchainIdentity[]> {
    AuthchainIdentity._processing = 'Scanning wallet for authchain identities'
    const identities:any[] = []
    const batonLikeUtxos = (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => {
      // get AuthNFT/batons
      return u.token && u.token.tokenId && u.token.commitment === '00'
    })
    // const identityUtxos = []
    for(let i=0; i < batonLikeUtxos.length; i++) {
      const key = new AuthNFT({...batonLikeUtxos[i], ownerWallet:ownerWallet})
      const identityUtxos = (await key.authGuard.getLockedTokenIdentities())
      for(let i=0; i < identityUtxos.length; i++) {
        identities.push(new AuthchainIdentity({...identityUtxos[i], authNFT:key, ownerWallet:ownerWallet}))
      }
    }

    delete  AuthchainIdentity._processing
    return identities
  }


}
