import { Contract } from '@mainnet-cash/contract';
export interface AuthChainGuardI {
  ownerPubKey: any
  network: string
  createContract(): Contract
  updateBcmr(): void
  transfer(): void
  burn(): void
  script(): string
}
