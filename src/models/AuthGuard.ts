import { UtxoI, Wallet } from 'mainnet-js'
import { Contract } from "@mainnet-cash/contract"

import {
  AuthNFT,
  AuthGuard as AuthGuardI,
  Message,
  Messaging,
  Processing,
  } from "./interfaces"
import getWalletClass from 'src/utils/getWalletClass'


export default class AuthGuard implements AuthGuardI, Processing, Messaging{
  tokenId?: string
  authNFT?: AuthNFT
  protected _processing?: string
  protected _message?: Message
  private _contract?: Contract
  constructor(p: {authNFT?: AuthNFT, ownerWallet: Wallet}) {
    this.authNFT = p.authNFT
    if (this.authNFT?.token?.tokenId) {
      this.tokenId = this.authNFT.token.tokenId
      // Existing contract
    } else if(this.authNFT?.txid) {
      this.tokenId = this.authNFT.txid
      // New contract
    } else {
      throw new Error('Unable to determine which what tokenId to use to instantiate the contract. AuthNFT have no txid nor tokenId')
    }

    this._contract = new Contract(
      this.contractScript,
      [`0x${this.tokenId!.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
      p.ownerWallet!.network
    )

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

    contract AuthGuard(bytes tokenId) {
      function unlockWithNft(bool keepGuarded) {
        // Check that the first input holds the minting baton
        require(tx.inputs[1].tokenCategory == tokenId);
        require(tx.inputs[1].tokenAmount == 0);
        if(keepGuarded){
          // Self preservation of the minting covenant as the first output
          require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
        }
      }
    }`
  }


}
