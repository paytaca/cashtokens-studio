import { UtxoI, Wallet, NetworkType } from 'mainnet-js'
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/app/utils/getWalletClass'

export class AuthGuard {
  tokenId: string
  network: NetworkType
  protected _processing?: string
  private _contract?: Contract
  constructor(tokenId:string, network: NetworkType) {
    this.tokenId = tokenId
    this.network = network
    this._contract = new Contract(
      this.contractScript,
      [`0x${tokenId!.match(/[a-fA-F0-9]{2}/g)?.reverse().join('')}`],
      network
    )
  }

  protected ensureContract(){
    if (!this.contract) {
      throw new Error('Contract not properly initialized, make sure the ownerWallet is set')
    }
  }

  get processing(): string | undefined {
    return this._processing
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
    return (await w.getAddressUtxos())
    // return  (await w.getAddressUtxos()).filter((u:UtxoI)=> Boolean(u.token?.tokenId))// If support non-token Authchain IdentityOutput in the future remove the filter
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
