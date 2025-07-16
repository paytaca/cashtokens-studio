import {
    CashAddressResult,
    cashAddressToLockingBytecode,
    DecodedCashAddressLockingBytecode,
    lockingBytecodeToCashAddress
} from "bitauth-libauth-v3"

export const cashAddressToTokenAddress = (cashAddress: string) => {
    const lockingBytecode = cashAddressToLockingBytecode(cashAddress) as DecodedCashAddressLockingBytecode
    const address =  lockingBytecodeToCashAddress({
        prefix: lockingBytecode.prefix, bytecode: lockingBytecode.bytecode, tokenSupport: true
    }) as CashAddressResult
    return address.address
}