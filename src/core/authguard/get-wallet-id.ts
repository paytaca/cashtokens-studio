import { Contract } from "cashscript";

export function getWalletId(contract: Contract): string {
    return contract.address
}