import { Contract } from '@mainnet-cash/contract';
export interface AuthChainGuardI {
  readonly contract: Contract
  readonly ownerAddress: string
  readonly ownerPubKey: any
  readonly network: string
  updateBcmr(bcmrRawString: string, bcmrUrl: string, tokenId?: string): Promise<string|undefined>
  transfer(): void
  burn(): void
  script(): string
}
