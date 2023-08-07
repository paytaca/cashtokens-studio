import { BCMR, NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin, sha256 } from '@bitauth/libauth'
import CashStudioToken from "./CashStudioToken"
import { AuthGuard as AuthGuardI, CashStudioTokenI, MBC, Message, Messaging, Processing, Registry, RegistryPublicationInput } from "./interfaces"
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/utils/getWalletClass'
import constants from 'src/constants'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, SignatureTemplate, Utxo } from 'cashscript'
import { scriptToBytecode } from '@cashscript/utils'
import getByteCount from 'src/utils/getByteCount'
import {AuthNFT} from './interfaces'
import calcMinerFee from 'src/utils/calcMinerFee'
import { toValue } from 'vue'


export default class AuthGuard implements AuthGuardI, Processing, Messaging{
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet
  authNFT?: AuthNFT
  protected _processing?: string
  protected _message?: Message
  private _contract?: Contract
  constructor(p: {authNFT?: AuthNFT, ownerWallet?: Wallet}) {
    this.authNFT = p.authNFT
    this.ownerWallet = p.ownerWallet
    if (this.authNFT?.token?.tokenId) {
      // Assumes we're trying to use an existing AuthNFT to create a contract
      this.createContract()
    } else {
      // We're trying to create an AuthNFT token
      this.createAuthNFTGenesisContract()
    }
  }
  transfer(newOwnerAddress: string): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }
  burn(): Promise<string | undefined> {
    throw new Error('Method not implemented.')
  }

  /**
   * Create an AuthGuard contract, using the AuthNFT tokenId as the baton / Token recipient
   */
  createContract() {
    this.ensureOwnerWallet()
    this.ensureTokenId()
    if (this.authNFT?.token?.tokenId) {
      this._contract = new Contract(
        this.contractScript,
        [`0x${this.authNFT.token.tokenId.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
        this.ownerWallet!.network
      )
    }
    return this
  }

  /**
   * Create genesis of AuthGuard/AuthNFT.
   */
  createAuthNFTGenesisContract() {
    this.ensureOwnerWallet()
    this.ensureAuthNFT()
    if (!this.authNFT!.txid) {
      throw new Error('Invalid authNFT input utxo')
    }
    this._contract = new Contract(
      this.contractScript,
      [`0x${this.authNFT!.txid.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
      this.ownerWallet!.network
    )
    return this
  }

  protected ensureTokenId() {
    if (!this.authNFT?.token?.tokenId) {
      throw new Error('Invalid token id')
    }
  }

  protected ensureContract(){
    if (!this.contract) {
      throw new Error('Contract not properly initialized, make sure the ownerWallet is set')
    }
  }

  protected ensureOwnerWallet(){
    if (!this.ownerWallet) {
      throw new Error('Owner wallet not set')
    }
  }

  protected ensureAuthNFT(){
    if (!this.authNFT) {
      throw new Error('Owner wallet not set')
    }
  }

  get processing(): string | undefined {
    return this._processing
  }
  get message(): Message | undefined {
    return this._message
  }

  get contract(): Contract | undefined {
    return this._contract
  }

  /**
   * Returns the AuthIdentities(Tokens) managed by this AuthGuard/AuthNFT.
   * @returns The list of AuthIdentities(utxos) managed by this AuthGuard
   */
  async getLockedTokenIdentities(): Promise<UtxoI[]> {
    this.ensureContract()
    const w = await (getWalletClass()).watchOnly(this._contract!.getTokenDepositAddress())
    return  (await w.getAddressUtxos()).filter((u:UtxoI)=> Boolean(u.token?.tokenId))// If support non-token Authchain IdentityOutput in the future remove the filter
  }

  /**
   * Convenience property only returns the mintingCovenant function
   */
  get unlockWithNft():any {
    if (!this._contract) {
      throw new Error('Contract not initialized')
    }
    return this._contract?.getContractFunction('unlockWithNft')
  }

  get contractScript(): string {
    return `
    pragma cashscript ^0.8.0;

    // covenant of the CCI token standard
    // Covenant unlocked by a specific NFT

    // Opcode count: 8 (max 201)
    // Bytesize: 46 (max 520)

    contract mintingCovenant(
        bytes tokenId
    ) {
        function unlockWithNft() {
            // Check that the first input holds the minting baton
            require(tx.inputs[1].tokenCategory == tokenId);
            require(tx.inputs[1].nftCommitment == 0x00);
            // Self preservation of the minting covenant as the first output
            require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
        }
    }`
  }


}
