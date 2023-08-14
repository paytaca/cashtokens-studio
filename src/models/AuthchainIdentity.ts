import { UtxoI, Wallet } from 'mainnet-js'
import { scriptToBytecode } from '@cashscript/utils'
import { Artifact, SignatureTemplate } from 'cashscript'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin } from '@bitauth/libauth'

import AuthNFT from './AuthNFT'
import CashStudioToken from "./CashStudioToken"
import calcMinerFee from 'src/utils/calcMinerFee'
import toCashScript from 'src/utils/toCashScript'
import { Authchain, Messaging, Processing } from "./interfaces"
import shortenAddress from 'src/utils/shortenAddress'
import shortenTokenId from 'src/utils/shortenTokenId'

/**
 * In an AuthGuard context an AuthchainIdentity are the tokens that are on an AuthGuard address
 * Without AuthGuard it could be any Utxo where vout=0 of the owner's address
 * TODO.: Also include plain utxo @ vout0?
 * TODO..: To get the token category managed by this utxo, the utxo's txid is
 * TODO...: = the txid of the tokens authhead in chaingraph or paytaca's bcmr
 * TODO....: we can get the authhead using that to instantiate an AuthchainIdentity
 *
 */
export default class AuthchainIdentity extends CashStudioToken implements Authchain, Processing, Messaging {

  private static _processing?:string

  transfer(newOwnerAddress: string): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }


  async publish(opt:{url: string, contentHash: string}):Promise<any> {
    this.ensureOwnerWallet()
    this.ensureAuthNFT()
    this._processing = 'Processing'
    const issuanceCost = calcMinerFee({'P2SH-P2WPKH':1}, {P2SH:1, P2PKH: 2})
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }
    const [authchainIdentityOutput, authNFTInput] = [this.utxo, this.authNFT!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authNFT!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authNFT!.ownerWallet!.getTokenDepositAddress()
    const tokenOwner = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(true)
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
          .withOpReturn([
            'BCMR',
            opt.contentHash, // sha256 of the contents from the uri below
            opt.url.replace('https://', '')
          ])
          .to(funderInput.satoshis - BigInt(issuanceCost) > 546 ?[{
            // change
            to: tokenOwner,
            amount: funderInput.satoshis - BigInt(issuanceCost)
          }]:[])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(issuanceCost))

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

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any).bytecode,
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
          valueSatoshis: BigInt(funderInput.satoshis)
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

    if (!signingResult) {
      console.log('signed', signingResult)
      delete this._processing
      return
    }

    console.log('SIGNED TX', signingResult!.signedTransaction)
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      if (tx) {
        this._processing = 'Published'
        setTimeout(()=> {
          delete this._processing
        }, 2000)
      }
      return tx
    } catch (error) {
      console.log('Error:AuthChainGuard@publish', error)
    } finally {
      delete this._processing
    }

  }

  /**
   *  Token issuance from reserves
   */
  async releaseTokensFromReserveSupply(arg:{to: string, amount: string}): Promise<string | void> {
    this.ensureOwnerWallet()
    this.ensureTokenId()
    if (this.useAuthGuard) {
      this.ensureAuthNFT()
    }

    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:2, P2PKH: 2})
    const issuanceCost = minerFee + CashStudioToken.DEFAULT_TOKEN_VALUE // Token value of the issued tokens utxo

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authNFTInput] = [this.utxo, this.authNFT!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authNFT!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authNFT!.ownerWallet!.getTokenDepositAddress()
    const tokenOwner = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    console.log('INPUT', authchainIdentityOutput.satoshis)
    console.log('INPUT AMOUNT', BigInt(authchainIdentityOutput.token!.amount))
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(true)
          .from(authchainIdentityOutput) // contract
          // TODO: MAKE USE OF AUTHNFT OPTIONAL ONLY WHEN USING AUTHGUARD
          .fromP2PKH([authNFTInput], sig) // AuthNFT/minting baton, funder
          .fromP2PKH([funderInput], sig) // AuthNFT/minting baton, funder
          .to([{
            // return authchain identity output to contract
            to: contractAddress,
            amount: authchainIdentityOutput.satoshis,
            token: {
              category: authchainIdentityOutput.token!.category,
              amount: BigInt(authchainIdentityOutput.token!.amount) - BigInt(arg.amount), // deduct
              nft: authchainIdentityOutput.token!.nft
            }
          }])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(authNFTInput.satoshis),
            token: authNFTInput.token
          }])
          .to([{
            // Issue tokens
            to: arg.to,
            amount: BigInt(CashStudioToken.DEFAULT_TOKEN_VALUE),
            token: {
              category: authchainIdentityOutput.token!.category,
              amount: BigInt(arg.amount), // issued amount
              // nft: authchainIdentityOutput.token!.nft
            }
          }])
          .to(funderInput.satoshis - BigInt(issuanceCost) > 546 ?[{
            // change
            to: tokenOwner,
            amount: funderInput.satoshis - BigInt(issuanceCost)
          }]:[])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

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

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any).bytecode,
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
          valueSatoshis: BigInt(funderInput.satoshis)
        }
      ],
        broadcast: false,
        userPrompt: 'Issue/Release Tokens'
      });

    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error signing transaction')
    }

    if (!signingResult) {
      console.log('signed', signingResult)
      delete this._processing
      return
    }

    this._processing = 'Submitting Transaction'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      return tx
    } catch (error) {
      console.log('Error:AuthchainIdentity@releaseTokensFromReserveSupply', error)
    } finally {
      delete this._processing
    }
  }

  /**
   *
   *  Unguard or release this authchain identity output from the AuthGuard covenant.
   */
  async unguard(): Promise<string | void> {
    this.ensureOwnerWallet()
    this.ensureTokenId()
    if (this.useAuthGuard) {
      this.ensureAuthNFT()
    }

    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2PKH: 2})
    const unguardingCost = minerFee

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > unguardingCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authNFTInput] = [this.utxo, this.authNFT!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authNFT!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authNFT!.ownerWallet!.getTokenDepositAddress()
    const depositAddress = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(false)
          .from(authchainIdentityOutput) // contract
          .fromP2PKH([authNFTInput], sig) // AuthNFT/minting baton, funder
          .fromP2PKH([funderInput], sig) // AuthNFT/minting baton, funder
          .to([{
            // transfer identity output to owner's p2pkh address
            to: this.ownerWallet!.getTokenDepositAddress(),
            amount: authchainIdentityOutput.satoshis,
            token: {
              category: authchainIdentityOutput.token!.category,
              amount: authchainIdentityOutput.token!.amount,
              nft: authchainIdentityOutput.token!.nft
            }
          }])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authNFT!.satoshis),
            token: authNFTInput.token
          }])
            // emptied authkey's value transferred to owner
          .to(funderInput.satoshis - BigInt(unguardingCost) > 546 ?[{
            // change
            to: depositAddress,
            amount: funderInput.satoshis - BigInt(unguardingCost)
          }]:[])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

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

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any).bytecode,
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
          lockingBytecode: (cashAddressToLockingBytecode(depositAddress) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis)
        }
      ],
        broadcast: false,
        userPrompt: 'Unguard Token: ' + shortenTokenId(this.token!.tokenId)
      });

    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error signing transaction')
    }

    if (!signingResult) {
      console.log('signed', signingResult)
      delete this._processing
      return
    }

    this._processing = 'Submitting Transaction'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      return tx
    } catch (error) {
      console.log('Error:AuthchainIdentity@releaseTokensFromReserveSupply', error)
    } finally {
      delete this._processing
    }
  }


  /**
   * Burn the authchain identity output
   */
  async burn(): Promise<string | undefined> {
    this.ensureOwnerWallet()
    this.ensureTokenId()
    if (this.useAuthGuard) {
      this.ensureAuthNFT()
    }

    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2PKH: 2})
    const burningCost = minerFee

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > burningCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authNFTInput] = [this.utxo, this.authNFT!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authNFT!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authNFT!.ownerWallet!.getTokenDepositAddress()
    const depositAddress = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(false)
          .from(authchainIdentityOutput)
          .fromP2PKH([authNFTInput], sig)
          .fromP2PKH([funderInput], sig)
          .withOpReturn([
            'BURN',
            `0x${authchainIdentityOutput.txid.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`
          ])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authNFT!.satoshis),
            token: authNFTInput.token
          }])
            // authchainIdentityOutput's value transferred to funder
          .to((funderInput.satoshis + authchainIdentityOutput.satoshis) - BigInt(burningCost) > 546 ?[{
            // change
            to: depositAddress,
            amount: (funderInput.satoshis + authchainIdentityOutput.satoshis) - BigInt(burningCost)
          }]:[])
          .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

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

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      signingResult = await window.paytaca!.signTransaction({
        transaction: decoded,
        sourceOutputs: [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any).bytecode,
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
          lockingBytecode: (cashAddressToLockingBytecode(depositAddress) as any).bytecode,
          valueSatoshis: BigInt(funderInput.satoshis)
        }
      ],
        broadcast: false,
        userPrompt: 'Burn authchain of token: ' + shortenTokenId(this.token!.tokenId)
      });

    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error signing transaction')
    }

    if (!signingResult) {
      console.log('signed', signingResult)
      delete this._processing
      return
    }

    this._processing = 'Burning'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      return tx
    } catch (error) {
      console.log('Error:AuthchainIdentity@', error)
    } finally {
      delete this._processing
    }
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
