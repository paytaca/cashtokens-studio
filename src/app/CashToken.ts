import { AuthChain, BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet } from "mainnet-js";
import { AuthKey, DEFAULT_TOKEN_VALUE } from '.'
import { GenesisOptions } from "./types";
import calcMinerFee from "./utils/calcMinerFee";
import requestPaytacaSignature from "./utils/requestPaytacaSignature";
import submitTransaction from "./utils/submitTransaction";
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin } from "@bitauth/libauth";
import { Artifact, scriptToBytecode } from "@cashscript/utils";
import { SignatureTemplate } from "cashscript";
import toCashScript from "./utils/toCashScript";
import { TokenCategory, URIs } from "./bcmr/bcmr-v2.schema";
import { PartialBcmr } from "./interfaces";

/**
 * TODO: Transfer token genesis functionality to GenesisInput, 
 * it makes more sense there.
 */
export class CashToken implements UtxoI, PartialBcmr {

  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  ownerWallet?: Wallet
  authKey?: AuthKey
  registry?: { uri: string|string[], contentHash: string }
  /**
   * TokenCategory is a portion of the BCMR schema, we attached it here 
   * since this serves as the token's profile and maybe frequently accessed
   * CAUTION: Do not include the `nfts` field 
   * it might have a lot of items, e.g. BITCATS might
   * have 10k items.
   */
  tokenCategory?: TokenCategory
  tokenUris?: URIs
  /**
   * If true, token will be locked on the AuthGuard contract during genesis. Default = true
   */
  useAuthGuard: boolean
  /**
   * If true, Create AuthKey genesis together with Token Genesis. Default = true
   * This can be turned of by passing {includeAuthKeyGenesis:false} in the createGenesis
   * method
   */
  includeAuthKeyGenesis: boolean
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
      ownerWallet?: Wallet
      authKey?: AuthKey,
      registry?: { uri: string, contentHash: string }
    }
  ){
    if (u) {
      this.vout = u.vout
      this.txid = u.txid
      this.satoshis = u.satoshis
      this.height = u.height
      this.coinbase = u.coinbase
      this.token = u.token
      this.ownerWallet = u.ownerWallet
      this.authKey = u.authKey
      this.registry = u.registry
    } else {
      this.vout = 0
      this.txid = ''
      this.satoshis = 0
    }
    this.includeAuthKeyGenesis = true
    this.useAuthGuard = true
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

  get processing():string|undefined {
    return this._processing
  }

  set processing(msg: string|undefined) {
    this._processing = msg
  }

  static get processing():string|undefined {
    return CashToken._processing
  }

  static set processing(msg: string|undefined) {
    CashToken._processing = msg
  }

  get genesisCost(): number {
    return (
      calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH:2 }) +
      /**
       * 2 = we'll just assume Token genesis and AuthKey genesis
       */
      (DEFAULT_TOKEN_VALUE * 2) + 400
    )
  }

  ensureTxid(){
    if (!this.txid) {
      throw new Error('Invalid token txid')
    }
  }

  ensureOwnerWallet() {
    if (!this.ownerWallet) {
      throw new Error('Missing owner wallet')
    }
  }

  ensureAuthKey(){
    if (!this.authKey) {
      throw new Error('AuthKey required')
    }
  }

  protected prepareGenesisAuthchainIdentityReq(args: { recipient: string, token: TokenI}): TokenSendRequest {
    const reqParam = {
      cashaddr: args.recipient,
      value: DEFAULT_TOKEN_VALUE,
      tokenId: args.token.tokenId,
      amount: args.token.amount,
      capability: args.token.capability,
      commitment: args.token.commitment
    }
    return new TokenSendRequest(reqParam)
  }

  /**
   * Prepare AuthKey request
   */
  protected prepareGenesisAuthKeyReq(): TokenSendRequest {
    return new TokenSendRequest({
      cashaddr: this.ownerWallet!.getTokenDepositAddress(),
      value: DEFAULT_TOKEN_VALUE,
      tokenId: this.authKey!.txid,
      amount: 0,
      capability: this.authKey?.token?.capability || NFTCapability.none,
      commitment: '00'
    })
  }

  protected prepareGenesisRegistryPublicationReq(): OpReturnData[] {
    if (this.registry) { // if registry is set, assumes publishing
      if (!this.registry?.uri || !this.registry?.contentHash) {
        delete this._processing
        throw new Error("Invalid registry publication url or content hash")
      }

      if (typeof(this.registry?.uri) === 'string') {
        return [OpReturnData.fromArray(['BCMR', this.registry.contentHash, this.registry.uri.replace(/https:\/\/|ipfs:\/\//, '')])]
      } else if (this.registry?.uri instanceof Array){
        return [OpReturnData.fromArray(['BCMR', this.registry.contentHash, ...this.registry.uri.map((u) => u.replace(/https:\/\/|ipfs:\/\//, ''))])]
      }

    }
    return []
  }

  /**
   * Build unsigned transaction
   */
  protected async buildTokenGenesisTransaction(genesisRequests:(TokenSendRequest|OpReturnData|SendRequest)[], includeAuthKeyGenesis?: boolean): Promise<{encodedTransaction:any, sourceOutputs:any}>{
    // TODO: REFACTOR, allow user to use multiple low denomination utxos as funder
    const funderUtxo = (await this.ownerWallet!.getAddressUtxos()).filter((u:UtxoI)=> {
      return Boolean(!u.token) &&
        (u.txid !== this.txid || u.txid !== this.authKey!.txid) && // Exclude the utxo that we're using as genesis inputs
          u.satoshis > this.genesisCost
    })[0]

    if (!funderUtxo) {
      throw new Error('Insufficient balance to fund the transaction')
    }

    // const useThisUtxos = this.authKey? [this.utxo, this.authKey!.utxo!, funderUtxo]: [this.utxo, funderUtxo]
    const utxoExpenses = [this.utxo]
    // Be careful with this, improper condition could spend the authKey
    if (this.authKey && includeAuthKeyGenesis) {
      utxoExpenses.push(this.authKey!.utxo!)
    }
    utxoExpenses.push(funderUtxo)

    const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
      genesisRequests,
      false,
      {
        tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: utxoExpenses,
        ensureUtxos: utxoExpenses
      }
    )
    return {encodedTransaction, sourceOutputs}
  }

  async createGenesis(opt: GenesisOptions): Promise<string|undefined> {
    this.ensureTxid()
    this.ensureOwnerWallet()
    this._processing = 'Processing'
    opt = { useAuthGuard: this.useAuthGuard, includeAuthKeyGenesis: this.includeAuthKeyGenesis, ...opt}
    const requests = []
    let tokenRecipient = this.ownerWallet!.getTokenDepositAddress()
    if (opt.useAuthGuard) { // Use authguard by default
      if (!this.authKey?.txid && !this.authKey?.token?.tokenId) {
        throw new Error('Invalid authkey')
      }
      this.authKey.ownerWallet = this.ownerWallet
      tokenRecipient = this.authKey?.authGuard.contract!.getTokenDepositAddress()
    }
    requests.push(this.prepareGenesisAuthchainIdentityReq({
      recipient: tokenRecipient,
      token: {
        tokenId: this.txid,
        amount: Number(opt.amount || 0),
        // Following BCMR standard, FT reserved supply handling suggestion
        // i.e. For fungible tokens continued issuance, store the reserve supply/genesis supply
        // ...  in the identity output and set capability to 'mutable'
        capability: opt.amount && BigInt(opt.amount) > 0 && !opt.capability ? NFTCapability.mutable: opt.capability,
        commitment: opt.commitment
      }
    }))

    // if true, create 2 genesis, 1 for Token 1 for AuthKey
    if (opt.includeAuthKeyGenesis) {
      requests.push(this.prepareGenesisAuthKeyReq())
    }
    requests.push(...this.prepareGenesisRegistryPublicationReq())
    const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests, opt.includeAuthKeyGenesis)
    this._processing = 'Waiting for signature'
    const signResult = await requestPaytacaSignature(encodedTransaction, sourceOutputs)
    if (!signResult || !signResult.signedTransaction) {
      delete this._processing
      return
    }
    this._processing = 'Creating Token'
    try {
      const tx = await submitTransaction(signResult, this.ownerWallet!)
      return tx
    } catch (error) {
      console.log(error)
    } finally {
      delete this._processing
    }
  }

  /**
   * Call this immediately AFTER a successful genesis transaction (after createGenesis).
   *
   */
  async buildAuthChainInChainGraph(): Promise<AuthChain> {
    this._processing = 'Building authchain in chaingraph'
    // Note: If this uses this.utxo.txid it means this was called after genesis
    //       this.token?.tokenId option made available so that authchain can still
    //       be built after genesis
    const authChain = await BCMR.buildAuthChain({ transactionHash: this.token?.tokenId || this.utxo.txid, network: this.ownerWallet!.network })
    console.log('AUTHCHAIN', authChain)
    delete this._processing 
    return authChain
    
  } 

  static async send(arg:{tokenId: string, amount: bigint, to: string, capabality?:NFTCapability, commitment?:string, ownerWallet: Wallet}):Promise<string|undefined> {
    CashToken._processing = 'Processing'
    
    const requests = [
      new TokenSendRequest({
        cashaddr: arg.to,
        value: DEFAULT_TOKEN_VALUE,
        amount: Number(arg.amount), // !change to bigint once mainnet-js supports it
        tokenId: arg.tokenId,
        capability: arg.capabality,
        commitment: arg.commitment
      })
    ]
    // TODO: CALCULATE IF SOURCE HAS ENOUGH TO FUND, ADD FUNDER INPUT IF NEEDED
    const { encodedTransaction, sourceOutputs } = await arg.ownerWallet!.encodeTransaction(
      requests,
      false,
      {
        tokenOperation: 'send',
        checkTokenQuantities: true,
        buildUnsigned: true,
        // utxoIds: arg.sourceUtxos,
        // ensureUtxos: arg.sourceUtxos
      }
    )

    CashToken._processing = 'Waiting for signature'
    let signResult
    try {
      signResult = await requestPaytacaSignature(encodedTransaction, sourceOutputs, 'Send Tokens')
    } catch (error) {
      console.log(error)
      throw error
    }
    CashToken._processing = `Sending ${arg.amount} tokens`
    try {
      return await submitTransaction(signResult, arg.ownerWallet)
    } catch (error) {
      console.log(error)

      throw error
    } finally {
      delete CashToken._processing
    }

  }

  async mintChild(arg:{ capability: NFTCapability, commitment: string, recipient: string }): Promise<string|undefined>{
    
    if (this.token?.capability !== NFTCapability.minting) {
      throw new Error('No capability to mint')
    }

    if (!arg.recipient) {
      throw new Error('Missing recipient')
    }

    this.ensureOwnerWallet()
    this.ensureAuthKey()
    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:1, P2PKH: 3})
    const mintCost = minerFee + DEFAULT_TOKEN_VALUE
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > mintCost).map(toCashScript)[0]

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
          .fromP2PKH([authKeyInput], sig) // AuthNFT/minting baton, funder
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
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token
          }])
          .to([{
            // The NFT to mint
            to: arg.recipient, // token address
            amount: BigInt(DEFAULT_TOKEN_VALUE),
            token: {
              amount: BigInt(0),
              category: authchainIdentityOutput.token!.category,
              nft: {
                commitment: arg.commitment,
                capability: arg.capability
              }
            }
          }])
          .to(funderInput.satoshis - BigInt(mintCost) > 546 ?[{
            // change
            to: tokenOwner,
            amount: funderInput.satoshis - BigInt(mintCost)
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
        userPrompt: 'Mint NFT'
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

    this._processing = 'Minting'
    try {
      const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      if (tx) {
        this._processing = 'Minted'
        setTimeout(()=> {
          delete this._processing
        }, 2000)
      }
      return tx
    } catch (error) {
      console.log('Error:CashToken@mintChild', error)
    } finally {
      delete this._processing
    }

  }

  async resolveTokenCategory(){
    if (!this.token?.tokenId) return
    try {
      this._processing = 'Checking token registry'
      const r = await fetch(`${process.env.BCMR_API}bcmr/${this.token!.tokenId}/token`)  
      this.tokenCategory = await r.json()
    } catch (error) {
      console.log(`Error fetching ${this.token!.tokenId} from indexer`, error)
    } finally {
      delete this._processing
    }
  }
  
  async resolveTokenUris(){
    if (!this.token?.tokenId) return
    try {
      this._processing = 'Checking token registry'
      const r = await fetch(`${process.env.BCMR_API}bcmr/${this.token!.tokenId}/uris`)  
      this.tokenUris = await r.json()
    } catch (error) {
      console.log(`Error fetching ${this.token!.tokenId} from indexer`, error)
    } finally {
      delete this._processing
    }
  }

  static async scanWalletForTokens(tokenType: 'ft'|'nft'|'all', ownerWallet: Wallet): Promise<UtxoI[]> {
    if(tokenType === 'ft') {
      return (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => u.token && u.token?.amount > 0 && !u.token?.capability) || []
    } else if (tokenType === 'nft') {
      return (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => u.token && u.token?.capability) || []
    }
    return (await ownerWallet.getAddressUtxos()).filter((u: UtxoI) => u.token) || []
  }

}
