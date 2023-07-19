/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract } from '@mainnet-cash/contract';

export interface AuthChainGuardI {
  readonly contract: Contract
  readonly ownerAddress: string
  readonly ownerPubKeyHash: any
  readonly network: string
  /**
   * Initialize an owner wallet
   */
  initWallets(): Promise<void>
  publish(bcmrRawString: string, bcmrUrl: string, tokenId?: string): Promise<string|undefined>
  transfer(newOwnerAddress: string): Promise<string|undefined>
  burn(): void
  script(): string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MintingCovenantI {
  readonly tokenId: string|Uint8Array;
  readonly contract: Contract
  unlockWithNft: ()=>Promise<string|undefined>
  script(): string
}

