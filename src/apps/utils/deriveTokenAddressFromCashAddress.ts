import {
    CashAddressResult,
    cashAddressToLockingBytecode,
    decodeCashAddress,
    DecodedCashAddress,
    DecodedCashAddressLockingBytecode,
    lockingBytecodeToCashAddress
} from "bitauth-libauth-v3"

export const deriveTokenAddressFromCashAddress = (cashAddress: string) => {
    const decoded = decodeCashAddress(cashAddress) as DecodedCashAddress
    const lockingBytecode = cashAddressToLockingBytecode(cashAddress) as DecodedCashAddressLockingBytecode
    const address =  lockingBytecodeToCashAddress({
        prefix: decoded.prefix, bytecode: lockingBytecode.bytecode, tokenSupport: true
    }) as CashAddressResult
    return address.address
}