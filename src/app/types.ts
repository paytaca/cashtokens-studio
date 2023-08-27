import { NFTCapability, TokenI } from "mainnet-js"

export type GenesisOptions = {
  useAuthGuard?: boolean,                                 // use authguard, default = true
  includeAuthKeyGenesis?: boolean,                        // also create AuthKey genesis, useAuthGuard will be ignored and assumes to be true
  issuedSupply?: { amount: string, recipient: string }, // the token amount to issue
  amount?: string | number,
  capability?: NFTCapability,
  commitment?: string
}
