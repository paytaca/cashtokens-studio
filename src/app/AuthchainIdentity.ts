import { TokenI, UtxoI, Wallet } from "mainnet-js";
import { AuthKey, DEFAULT_TOKEN_VALUE } from ".";
import calcMinerFee from "./utils/calcMinerFee";
import toCashScript from "./utils/toCashScript";
import { SignatureTemplate} from "cashscript";
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin } from "@bitauth/libauth";
import { Artifact, scriptToBytecode } from "@cashscript/utils";
import shortenTokenId from "./utils/shortenTokenId";

export class AuthchainIdentity implements UtxoI {
  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  authKey?: AuthKey
  ownerWallet?: Wallet
  useAuthGuard?: true   // default
  private _processing?: string
  private static _processing?: string

  constructor(
    u?: {
      txid: string;
      vout: number;
      satoshis: number;
      height?: number | undefined;
      coinbase?: boolean | undefined;
      token?: TokenI | undefined;
      authKey: AuthKey
      ownerWallet?: Wallet
    }
  ){
    if (u) {
      this.vout = u.vout
      this.txid = u.txid
      this.satoshis = u.satoshis
      this.height = u.height
      this.coinbase = u.coinbase
      this.token = u.token
      this.authKey = u.authKey
      this.ownerWallet = u.ownerWallet
    } else {
      this.vout = 0
      this.txid = ''
      this.satoshis = 0
    }
  }

  get utxo():UtxoI {
    return {
      vout: this.vout,
      txid: this.txid,
      satoshis: this.satoshis,
      height: this.height,
      coinbase: this.coinbase,
      token: this.token,
    }
  }

  set utxo(u:UtxoI) {
    this.vout = u.vout
    this.txid = u.txid
    this.satoshis = u.satoshis
    this.height = u.height
    this.coinbase = u.coinbase
    this.token = u.token
  }

  get processing(): string|undefined {
    return this._processing
  }

  static get processing():string|undefined {
    return AuthchainIdentity._processing
  }

  get burningCost(): number {
    return calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2PKH: 2})
  }

  ensureOwnerWallet() {
    if (!this.ownerWallet) {
      throw new Error('Missing owner wallet')
    }
  }

  ensureAuthKey(){
    if(!this.authKey) {
      throw new Error('Missing AuthKey')
    }
  }

  // methods

  /**
   * Burn the authchain identity output
   */
  async burn(): Promise<string | undefined> {
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > this.burningCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authKeyInput] = [this.utxo, this.authKey!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authKey!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress()
    const depositAddress = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(false)
          .from(authchainIdentityOutput)
          .fromP2PKH([authKeyInput], sig)
          .fromP2PKH([funderInput], sig)
          .withOpReturn([
            'BURN',
            `0x${authchainIdentityOutput.txid.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`
          ])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token
          }])
            // authchainIdentityOutput's value transferred to funder
          .to((funderInput.satoshis + authchainIdentityOutput.satoshis) - BigInt(this.burningCost) > 546 ?[{
            // change
            to: depositAddress,
            amount: (funderInput.satoshis + authchainIdentityOutput.satoshis) - BigInt(this.burningCost)
          }]:[])
          .withoutChange()
          .withoutTokenChange()
          .withHardcodedFee(BigInt(this.burningCost)) // burning cost is just the miner fee in this case

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
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
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
   * Use this identity to publish registry
   */
  async publish(opt:{url: string, contentHash: string}):Promise<any> {
    this.ensureOwnerWallet()
    this.ensureAuthKey()
    this._processing = 'Processing'
    const issuanceCost = calcMinerFee({'P2SH-P2WPKH':1}, {P2SH:1, P2PKH: 2})
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }
    const [authchainIdentityOutput, authKeyInput] = [this.utxo, this.authKey!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authKey!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress()
    const tokenOwner = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(true)
          .from(authchainIdentityOutput) // contract
          .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
          .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
          .to([{
            // return authchain identity output to contract
            to: contractAddress,
            amount: authchainIdentityOutput.satoshis,
            token: authchainIdentityOutput.token
          }])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token
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
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
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
    if (this.useAuthGuard) {
      this.ensureAuthKey()
    }

    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:2, P2PKH: 2})
    const issuanceCost = minerFee + DEFAULT_TOKEN_VALUE // Token value of the issued tokens utxo

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authKeyInput] = [this.utxo, this.authKey!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authKey!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress()
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
          .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
          .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
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
            amount: BigInt(authKeyInput.satoshis),
            token: authKeyInput.token
          }])
          .to([{
            // Issue tokens
            to: arg.to,
            amount: BigInt(DEFAULT_TOKEN_VALUE),
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
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
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
    this.ensureAuthKey()

    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2PKH: 2})
    const unguardingCost = minerFee

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > unguardingCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }

    const [authchainIdentityOutput, authKeyInput] = [this.utxo, this.authKey!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authKey!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress()
    const depositAddress = this.ownerWallet!.getDepositAddress()
    let transaction
    let decoded
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(false)
          .from(authchainIdentityOutput) // contract
          .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
          .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
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
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token
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
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
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


  // statics

  static async scanWalletForAuthchainIdentities(ownerWallet:Wallet): Promise<AuthchainIdentity[]> {
    AuthchainIdentity._processing = 'Scanning wallet for authchain identities'
    const identities:any[] = []
    const batonLikeUtxos = (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => {
      // get AuthNFT/batons
      return u.token && u.token.tokenId && u.token.commitment === '00'
    })
    // const identityUtxos = []
    for(let i=0; i < batonLikeUtxos.length; i++) {
      const key = new AuthKey({...batonLikeUtxos[i], ownerWallet:ownerWallet})
      const identityUtxos = (await key.authGuard.getLockedTokenIdentities())
      for(let i=0; i < identityUtxos.length; i++) {
        identities.push(new AuthchainIdentity({...identityUtxos[i], authKey:key, ownerWallet:ownerWallet}))
      }
    }

    delete  AuthchainIdentity._processing
    return identities
  }
}
