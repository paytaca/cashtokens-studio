/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract } from '@mainnet-cash/contract';
import { Utxo } from 'cashscript';
import { Wallet } from 'mainnet-js';
import { QNotifyCreateOptions, QNotifyUpdateOptions } from 'quasar';

export type QuasarNotify = (
  opts: QNotifyCreateOptions | string
) => (props?: QNotifyUpdateOptions) => void

export interface AuthChainGuardI {
  readonly contract: Contract
  readonly ownerAddress: string
  readonly ownerPubKeyHash: any
  readonly network: string
  /**
   * Borrowing quasar's notify function
   */
  readonly notify: QuasarNotify
  /**
   * Initialize an owner wallet
   */
  initWallets(): Promise<void>
  publish(bcmrRawString: string, bcmrUrl: string, tokenId?: string): Promise<string|undefined>
  transfer(newOwnerAddress: string): Promise<string|undefined>
  burn(tokenId:string): Promise<string|undefined>
  release(tokenId: string, recipient:string): Promise<string|undefined>
  script(): string
}


/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MintingCovenantI {
  readonly tokenId: string
  readonly contract: Contract
  /**
   * Borrowing quasar's notify function
   */
  readonly notify: QuasarNotify

  unlockWithNft: (
    param: {
      contractOwner:string,
      to: string,
      ftAmountToUnlock: bigint|string|number}
  )=>Promise<string|undefined>
  script(): string
}

