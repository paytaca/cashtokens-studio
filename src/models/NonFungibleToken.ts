import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import CashStudioToken from './CashStudioToken';
import MintingCovenant from 'src/contracts/MintingCovenant';
import AuthNFT from './AuthNFT';
import AuthGuard from './AuthGuard';
import calcMinerFee from 'src/utils/calcMinerFee';
import { Artifact, SignatureTemplate } from 'cashscript';
import { toCashScript } from '@mainnet-cash/contract';
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin } from '@bitauth/libauth';
import { scriptToBytecode } from '@cashscript/utils';

export default class NonFungibleToken extends CashStudioToken{

  /**
   * The token capability of the authchain identity output. This is
   * an arbitrary value, change if needed.
   */
  static DEFAULT_AUTHCHAIN_IDENTITY_CAPABILITY = NFTCapability.mutable
  /**
   * Output for the actual token category
   */
  prepareNonFungibleTokenReq(opt:{genesis:boolean, capability: NFTCapability, commitment?:string}):TokenSendRequest[] {
    this.ensureOwnerWallet()
    let tokenId = this.txid
    if (!opt?.genesis) {
      if (!this.token?.tokenId) {
        throw new Error('Invalid token id')
      }
      tokenId = this.token.tokenId
    }
    const requests = []
    requests.push(
      new TokenSendRequest({
        tokenId,
        value: CashStudioToken.DEFAULT_TOKEN_VALUE,
        cashaddr: this.ownerWallet!.getTokenDepositAddress(),
        capability: opt.capability,
        commitment: opt.commitment
      })
    )
    return requests
  }

  async createGenesis(opt:{capability:NFTCapability, commitment: string}): Promise<string | void> {
    this._processing = 'Processing transaction...'
    if (!this.utxo) { // utxo is genesis input during genesis
      delete this._processing
      throw new Error('No utxo to use for genesis')
    }
    if (!this.ownerWallet) {
      delete this._processing
      throw new Error('The ownerWallet is not set')
    }
    if (!opt.capability) {
      delete this._processing
      throw new Error('NFT requires capability')
    }
    const requests:(TokenSendRequest|OpReturnData|SendRequest)[] = []
    try {
      if (this.useAuthGuard) {
        requests.push(this.prepareAuthchainIdentityReq({genesis:true, capability: opt.capability, commitment: opt.commitment}))
        requests.push(this.prepareAuthNFTReq({genesis:true}))
      } else {

        requests.push(...this.prepareNonFungibleTokenReq({genesis:true, capability: opt.capability, commitment: opt.commitment}))
      }
      requests.push(...this.prepareRegistryPublicationReq())
      // requests.push(...this.prepareChangeReq(this.utxo)) // change was auto returned
      const {encodedTransaction, sourceOutputs} = await this.buildTokenGenesisTransaction(requests)
      const signResult = await this.requestPaytacaSignature(encodedTransaction, sourceOutputs)
      const tx = await this.submitTransaction(signResult)
      if(tx) {
        this._message = { type: 'success', text: `Success! Tx = ${tx}`}
        this._processing = 'Building authchain'
        await BCMR.buildAuthChain({ transactionHash: this.utxo.txid, network: this.ownerWallet!.network })
      }
      return tx
    } catch (error) {
      throw error
    } finally {
      delete this._processing
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
    this.ensureAuthNFT()
    this._processing = 'Processing'
    const minerFee = calcMinerFee({'P2SH-P2WPKH':1, P2PKH:2}, {P2SH:1, P2PKH: 3})
    const mintCost = minerFee + CashStudioToken.DEFAULT_TOKEN_VALUE
    const funderInputs = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token))
    console.log('FUNDER', funderInputs)

    const funderInput = (await this.ownerWallet!.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > mintCost).map(toCashScript)[0]

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

    console.log('Mint Cost', mintCost)
    console.log('authchain', authchainIdentityOutput)
    console.log('authNFTInput', authNFTInput)
    let transaction
    let decoded
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
          .to([{
            // The NFT to mint
            to: arg.recipient, // token address
            amount: BigInt(CashStudioToken.DEFAULT_TOKEN_VALUE),
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
      console.log('Error:AuthChainGuard@publish', error)
    } finally {
      delete this._processing
    }

  }
}
