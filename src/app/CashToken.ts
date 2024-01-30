import { AuthChain, BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet } from "mainnet-js";
import { AuthKey, CTS_MINTING_TOKEN_DEFAULT_DUMMY_COMMITMENT, DEFAULT_TOKEN_VALUE, Watchtower } from '.'
import { GenesisOptions, NftCollectionType, TransactionSigner } from "./types";
import calcMinerFee from "./utils/calcMinerFee";
import requestPaytacaSignature from "./utils/requestPaytacaSignature";
import submitTransaction from "./utils/submitTransaction";
import { binToHex, binToNumberUint16LE, cashAddressToLockingBytecode, decodeTransaction, hexToBin, utf8ToBin } from "@bitauth/libauth";
import { Artifact, scriptToBytecode } from "@cashscript/utils";
import { SignatureTemplate } from "cashscript";
import toCashScript from "./utils/toCashScript";
import { TokenCategory, URIs } from "./bcmr/bcmr-v2.schema";
import { PartialBcmr } from "./interfaces";
import convertBigIntToHexLE from "./utils/convertBigIntToHexLE";
import { ProcessingMessage } from "."
import requestWalletConnectSignature from "./utils/requestWalletConnectSignature";

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
  defaultNftCollectionType: NftCollectionType
  transactionSigner?: TransactionSigner
  utxoSpent?: boolean
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
    },
    transactionSigner?: TransactionSigner
  ){
    this.defaultNftCollectionType = 'SequentialNftCollection'
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
    this.transactionSigner = transactionSigner
    delete this._processing
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
    this.utxoSpent = false
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
        return [OpReturnData.fromArray(['BCMR', hexToBin(this.registry.contentHash), this.registry.uri.replace(/https:\/\/|ipfs:\/\//, '')])]
      } else if (this.registry?.uri instanceof Array){
        return [OpReturnData.fromArray(['BCMR', hexToBin(this.registry.contentHash), ...this.registry.uri.map((u) => u.replace(/https:\/\/|ipfs:\/\//, ''))])]
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
    opt = {
      useAuthGuard: this.useAuthGuard,
      includeAuthKeyGenesis: this.includeAuthKeyGenesis,
      nftCollectionType: this.defaultNftCollectionType,
      ...opt
    }
    const requests = []
    let tokenRecipient = this.ownerWallet!.getTokenDepositAddress()
    if (opt.useAuthGuard) { // Use authguard by default
      if (!this.authKey?.txid && !this.authKey?.token?.tokenId) {
        throw new Error('Invalid authkey')
      }
      this.authKey.ownerWallet = this.ownerWallet
      tokenRecipient = this.authKey?.authGuard.contract!.getTokenDepositAddress()
    }

    let commitment = opt.commitment

    if (commitment && opt.commitmentFormat === 'decimal') {
      commitment = convertBigIntToHexLE(BigInt(commitment))
    }

    if (commitment && opt.commitmentFormat === 'hex') {
      if (opt.nftCollectionType === 'SequentialNftCollection') {
        // if (commitment === CTS_MINTING_TOKEN_DEFAULT_DUMMY_COMMITMENT) {
        //   commitment = 'feed'
        // } else {
        //   // this means commitment is a BE number, convert to LE
        //   commitment = parseInt(commitment, 16).toString()
        //   commitment = convertBigIntToHexLE(BigInt(commitment))
        // }
        commitment = parseInt(commitment, 16).toString()
        commitment = convertBigIntToHexLE(BigInt(commitment))
      }
    } /*else commitment is raw hex provided by user*/
    console.log('AMOUNT', opt.amount)
    requests.push(this.prepareGenesisAuthchainIdentityReq({
      recipient: tokenRecipient,
      token: {
        tokenId: this.txid,
        amount: opt.amount || BigInt(0),
        // Following BCMR standard, FT reserved supply handling suggestion
        // i.e. For fungible tokens continued issuance, store the reserve supply/genesis supply
        // ...  in the identity output and set capability to 'mutable'
        capability: opt.amount && BigInt(opt.amount) > 0 && !opt.capability ? NFTCapability.mutable: opt.capability,
        commitment: commitment
      }
    }))

    // if true, create 2 genesis, 1 for Token 1 for AuthKey
    if (opt.includeAuthKeyGenesis) {
      requests.push(this.prepareGenesisAuthKeyReq())
    }
    requests.push(...this.prepareGenesisRegistryPublicationReq())
    const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests, opt.includeAuthKeyGenesis)
    this._processing = 'Waiting for signature'
    let signResult: any
    const decoded = decodeTransaction(encodedTransaction)
    if (typeof decoded === 'string') {
      throw new Error('Error decoding transaction')
    }

    try {
      signResult = await this.transactionSigner?.signTransaction(decoded, sourceOutputs, false, 'Create Token')
    } catch (error:any) {
      console.log(error)
      delete this._processing
      throw error
    } finally {
      delete this._processing
    }

    this._processing = 'Creating Token'
    try {
      return await submitTransaction(signResult, this.ownerWallet!)
    } catch (error:any) {
      console.log(error)
      delete this._processing
      throw new Error(error.message)
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
    delete this._processing
    return authChain

  }

  static async send(arg:{tokenId: string, amount: bigint, to: string, capabality?:NFTCapability, commitment?:string, ownerWallet: Wallet, processingMessage?: ProcessingMessage, transactionSigner?: TransactionSigner}):Promise<string|undefined> {
    CashToken._processing = 'Processing'
    arg?.processingMessage?.setProcessing('Processing')

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
    arg?.processingMessage?.setProcessing('Waiting for signature')
    let signResult

    try {

      this._processing = 'Waiting for signature'
      signResult = await arg.transactionSigner?.signTransaction(decodeTransaction(encodedTransaction), sourceOutputs, false, 'Send Tokens')
    } catch (error) {
      console.log(error)
      throw error
    } finally {
      delete this._processing
    }

    CashToken._processing = `Sending tokens`
    arg?.processingMessage?.setProcessing(`Sending tokens`)
    try {
      return await submitTransaction(signResult, arg.ownerWallet)
    } catch (error) {
      console.log(error)

      throw error
    } finally {
      delete CashToken._processing
      arg?.processingMessage?.deleteProcessing()
    }

  }

  /**
   * @param {boolean} arg.excludeFromSequentialNftCollection - If true, the commitment of the SequentialNftCollection's minter won't change, the last sequence number is retained.
   *  This is so the issuer can create another minter, or mutable NFT of the same category with an option to not add it as part of the collection. If the value is undefined or false
   *  the child NFT will be part of the collection and so the minter's commitment will increment.
   */
  async mintChild(arg:{ capability: NFTCapability, commitment: string, commitmentFormat: 'decimal'|'hex', nftCollectionType?: NftCollectionType, recipient: string, excludeFromSequentialNftCollection?: boolean}): Promise<string|undefined>{

    if (this.token?.capability !== NFTCapability.minting) {
      throw new Error('No capability to mint')
    }

    if (!arg.recipient) {
      throw new Error('Missing recipient')
    }

    if (!arg.nftCollectionType) {
      arg.nftCollectionType = this.defaultNftCollectionType
    }

    this.ensureOwnerWallet()
    this.ensureAuthKey()
    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:1, P2PKH: 3})
    const mintCost = minerFee + DEFAULT_TOKEN_VALUE
    // TODO: use watchtower
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

    let commitment = arg.commitment
    if (commitment && arg.commitmentFormat === 'decimal') {
      commitment = convertBigIntToHexLE(BigInt(commitment))
    }

    if (commitment && arg.commitmentFormat === 'hex') {
      if (arg.nftCollectionType === 'SequentialNftCollection') {
        commitment = parseInt(commitment, 16).toString()
        commitment = convertBigIntToHexLE(BigInt(commitment))
      }
    } /*else commitment is raw hex provided by user*/

    let transaction
    let decoded
    // track the commitment of last minted child NFT
    // by storing the commitment in parent usually CashToken with minting capability
    // TODO: test using mutable token as parent
    if (arg.excludeFromSequentialNftCollection !== true) {
      authchainIdentityOutput.token!.nft!.commitment = commitment
    }
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
                commitment: commitment,
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
      const sourceOutputs = [
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
      ]
      signingResult = await this.transactionSigner?.signTransaction(decoded, sourceOutputs, false, 'Mint Child NFT')
    } catch (error) {
      console.log(error)
      delete this._processing
      throw new Error('Error signing transaction')
    }

    if (!signingResult) {
      delete this._processing
      return
    }

    signingResult.signedTransaction
    this._processing = 'Minting'
    let tx
    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      tx = await submitTransaction(signingResult, this.ownerWallet as Wallet)
      if (tx) {
        this._processing = 'Minted'
        setTimeout(()=> {
          delete this._processing
        }, 2000)
      }
      return tx
    } catch (error: any) {
      throw new Error(error.message)
    } finally {
      delete this._processing
    }


  }

  /**
   * @param {boolean} arg.excludeFromSequentialNftCollection - If true, the commitment of the SequentialNftCollection's minter won't change, the last sequence number is retained.
   *  This is so the issuer can create another minter, or mutable NFT of the same category with an option to not add it as part of the collection. If the value is undefined or false
   *  the child NFT will be part of the collection and so the minter's commitment will increment.
   */
  async mintChildren(arg:{ capability: NFTCapability, commitment: string, commitmentFormat: 'decimal'|'hex', nftCollectionType?: NftCollectionType, recipient: string, excludeFromSequentialNftCollection?: boolean, quantity: number}): Promise<string|undefined>{

    if (this.token?.capability !== NFTCapability.minting) {
      throw new Error('No capability to mint')
    }

    if (!arg.recipient) {
      throw new Error('Missing recipient')
    }

    if (!arg.nftCollectionType) {
      arg.nftCollectionType = this.defaultNftCollectionType
    }

    this.ensureOwnerWallet()
    this.ensureAuthKey()
    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:1, P2PKH: 3 + arg.quantity})
    const mintCost = minerFee + (DEFAULT_TOKEN_VALUE * arg.quantity)
    // TODO: use watchtower
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

    let commitment = arg.commitment
    if (commitment && arg.commitmentFormat === 'decimal') {
      commitment = convertBigIntToHexLE(BigInt(commitment))
    }

    if (commitment && arg.commitmentFormat === 'hex') {
      if (arg.nftCollectionType === 'SequentialNftCollection') {
        commitment = parseInt(commitment, 16).toString()
        commitment = convertBigIntToHexLE(BigInt(commitment))
      }
    } /*else commitment is raw hex provided by user*/

    let transaction
    let decoded
    // track the commitment of last minted child NFT
    // by storing the commitment in parent usually CashToken with minting capability
    // TODO: test using mutable token as parent
    if (arg.excludeFromSequentialNftCollection !== true) {
      authchainIdentityOutput.token!.nft!.commitment = commitment
    }

    const mintOutputs = new Array(Number(arg.quantity || 1)).fill({
          to: arg.recipient, // token address
          amount: BigInt(DEFAULT_TOKEN_VALUE),
          token: {
            amount: BigInt(0),
            category: authchainIdentityOutput.token!.category,
            nft: {
              commitment: commitment,
              capability: arg.capability
            }
          }
      })

    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(true)
          .from(authchainIdentityOutput) // contract
          .fromP2PKH([authKeyInput], sig) // AuthNFT/minting baton
          .fromP2PKH([funderInput], sig) //  Funder
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
          .to(mintOutputs)
          .to(funderInput.satoshis - BigInt(mintCost) > 546 ?[{
            // change
            to: tokenOwner,
            amount: funderInput.satoshis - BigInt(mintCost)
          }]:[])
        .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

      decoded = decodeTransaction(hexToBin(await transaction.build()));
      if (typeof decoded === 'string') {
        delete this._processing
        throw new Error('Failed to decode transaction')
      }
    } catch (error) {
      console.log(error)
      delete this._processing
      throw error
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
      const sourceOutputs = [
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
      ]
      signingResult = await this.transactionSigner?.signTransaction(decoded, sourceOutputs, false, 'Mint Child NFT')
    } catch (error) {
      console.log(error)
      delete this._processing
      throw error
    }

    if (!signingResult) {
      delete this._processing
      return
    }

    signingResult.signedTransaction
    this._processing = 'Minting'
    let tx
    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      tx = await submitTransaction(signingResult, this.ownerWallet as Wallet)
      if (tx) {
        this._processing = 'Minted'
        setTimeout(()=> {
          delete this._processing
        }, 2000)
      }
      return tx
    } catch (error: any) {
      throw new Error(error.message)
    } finally {
      delete this._processing
    }


  }

  /**
   * Note: TokenI.commitment is used as is, no modification or formatting being done. Make sure to pass
   * the VM number if it's a SequentialNftCollection
   * @param {boolean} arg.newMinterCommitment - If present the minter's commitment will be updated using this value
   */
  async mintChildrenExt(arg: {tokens: [TokenI], recipient: string, newMinterCommitment?: string}){

    if (!arg.tokens) return
    this.ensureOwnerWallet()
    this.ensureAuthKey()
    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:1, P2PKH: 3 + arg.tokens.length})
    const mintCost = minerFee + (DEFAULT_TOKEN_VALUE * arg.tokens.length)
    // TODO: use watchtower
    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > mintCost).map(toCashScript)[0]
    if (!funderInput) {
      delete this._processing
      throw new Error('Insufficient balance to fund the txn')
    }
    const [minter, authKeyInput] = [this.utxo, this.authKey!.utxo!].map(toCashScript)
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)))
    const contract = this.authKey!.authGuard!.contract!
    const contractAddress = contract.getTokenDepositAddress()
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress()
    const tokenOwner = this.ownerWallet!.getDepositAddress()

    let transaction
    let decoded
    // track the commitment of last minted child NFT
    // by storing the commitment in parent usually CashToken with minting capability
    // TODO: test using mutable token as parent
    if (arg.newMinterCommitment) {
      minter.token!.nft!.commitment = arg.newMinterCommitment || minter.token!.nft!.commitment
    }
    const mintOutputs:any = arg.tokens.map((token:TokenI) => {
      return {
        to: arg.recipient, // token address
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
    })
    try {
      transaction =
        contract.getContractFunction('unlockWithNft')(true)
          .from(minter) // contract
          .fromP2PKH([authKeyInput], sig) // AuthNFT/minting baton
          .fromP2PKH([funderInput], sig) //  Funder
          .to([{
            // return authchain identity output to contract
            to: contractAddress,
            amount: minter.satoshis,
            token: minter.token
          }])
          .to([{
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token
          }])
          .to(mintOutputs)
          .to(funderInput.satoshis - BigInt(mintCost) > 546 ?[{
            // change
            to: tokenOwner,
            amount: funderInput.satoshis - BigInt(mintCost)
          }]:[])
        .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

      decoded = decodeTransaction(hexToBin(await transaction.build()));
      if (typeof decoded === 'string') {
        delete this._processing
        throw new Error('Failed to decode transaction')
      }
    } catch (error) {
      console.log(error)
      delete this._processing
      throw error
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
      const sourceOutputs = [
        {
          ...decoded.inputs[0],
          lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any).bytecode,
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
      ]
      signingResult = await this.transactionSigner?.signTransaction(decoded, sourceOutputs, false, 'Mint Child NFT')
    } catch (error) {
      console.log(error)
      delete this._processing
      throw error
    }

    if (!signingResult) {
      delete this._processing
      return
    }

    signingResult.signedTransaction
    this._processing = 'Minting'
    let tx
    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      tx = await submitTransaction(signingResult, this.ownerWallet as Wallet)
      if (tx) {
        this._processing = 'Minted'
        setTimeout(()=> {
          delete this._processing
        }, 2000)
      }
      this.utxoSpent = true
      return tx
    } catch (error: any) {
      throw error
    } finally {
      delete this._processing
    }
  }

  async resolveTokenCategory(quite?:boolean){
    if (!this.token?.tokenId) return
    try {
      if (quite !== true) {
        this._processing = 'Checking token registry'
      }
      const r = await fetch(`${process.env.BCMR_API}bcmr/${this.token!.tokenId}/token`)
      const rj = await r.json()
      if (!rj.error) {
        this.tokenCategory = rj
      }
      delete rj.nfts // exclude nfts, because it's uncapped
      delete this._processing
    } catch (error) {
      console.log(`Error fetching ${this.token!.tokenId} from indexer`, error)
    } finally {
      delete this._processing
    }
  }

  async resolveTokenUris(quite?:boolean){
    if (!this.token?.tokenId) return
    try {
      if (quite !== true) {
        this._processing = 'Checking token registry'
      }

      const r = await fetch(`${process.env.BCMR_API}bcmr/${this.token!.tokenId}/uris`)
      const rj = await r.json()
      if (!rj.error) {
        this.tokenUris = rj
      }
    } catch (error) {
      // console.log(`Error fetching ${this.token!.tokenId} from indexer`, error)
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

  async transferNFT(arg:{newOwner: string}){
    this._processing = 'Processing'

    if (!arg.newOwner) {
      throw new Error('Missing address of recipient!')
    }
    if (!this.token?.capability) {
      throw new Error('Token is not an NFT')
    }

    const requests = [
      new TokenSendRequest({
        cashaddr: arg.newOwner,
        value: DEFAULT_TOKEN_VALUE,
        amount: Number(this.token?.amount) || 0, // !change to bigint once mainnet-js supports it
        tokenId: this.token!.tokenId,
        capability: this.token?.capability,
        commitment: this.token?.commitment || ''
      })
    ]

    let signResult
    try {
      const { encodedTransaction, sourceOutputs } = await this.ownerWallet!.encodeTransaction(
        requests,
        false,
        {
          tokenOperation: 'send',
          checkTokenQuantities: false,
          buildUnsigned: true
        }
      )
      this._processing = 'Waiting for signature'
      // signResult = await requestPaytacaSignature(encodedTransaction, sourceOutputs, 'Transfer NFT')
      signResult = await this.transactionSigner?.signTransaction(decodeTransaction(encodedTransaction), sourceOutputs, false, 'Transfer NFT')
    } catch (error) {
      throw error
    } finally {
      delete this._processing
    }

    this._processing = 'Transferring'
    try {
      return await submitTransaction(signResult, this.ownerWallet as Wallet)
    } catch (error) {
      this._processing = ''
      throw error
    } finally {
      delete this._processing
    }
  }

  /**
   * Invoke after spending this utxo. When watching wallet address
   */
  async updateUtxo(){
    this.ensureOwnerWallet()
    this.processing = 'Updating minter'
    try {
      if (this.authKey) {
        let updatedMinterUtxo = await this.authKey?.authGuard.getLockedTokenIdentities()
        console.log(updatedMinterUtxo)
        updatedMinterUtxo = updatedMinterUtxo?.filter(u => (
          u.vout == this.utxo.vout &&
          u.token?.tokenId == this.utxo.token?.tokenId &&
          u.token?.capability == NFTCapability.minting
        ))
        if (updatedMinterUtxo) {
          this.utxo = updatedMinterUtxo[0]
        }
      }
    } catch (error) {
      throw error
    } finally {
      this.processing = ''
    }
  }

  /**
   * Invoke after spending the AuthKey, e.g. after minting. 
   */
  async updateAuthKeyUtxo(){
    try {
      this.ensureOwnerWallet()
      this.processing = 'Updating AuthKey'
      if (this.authKey) {
        const updatedAuthKeyUtxo = (await this.ownerWallet!.getAddressUtxos()).filter(u=>(
          u.vout == this.authKey?.utxo.vout &&
          u.token?.tokenId == this.authKey?.utxo.token?.tokenId &&
          u.token?.capability == this.authKey?.utxo.token?.capability
        ))
        if (updatedAuthKeyUtxo) {
          this.authKey.utxo = updatedAuthKeyUtxo[0]
        }
      }
    } catch (error) {
      throw error
    } finally {
      this.processing = ''
    }
    
  }

}
