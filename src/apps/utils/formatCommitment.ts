import { bigIntToVmNumber, binToHex, hexToBin, vmNumberToBigInt } from "@bitauth/libauth"

export default (value: string, inFormat: 'decimal' | 'hex' | 'vm-number', outFormat: 'decimal' | 'hex' | 'vm-number',): string => {
  if (inFormat === outFormat) { return value }
  if (outFormat === 'decimal') {
    return inFormat === 'hex' ? BigInt(parseInt(value, 16)).toString() : vmNumberToBigInt(hexToBin(value)).toString()
  }
  if (outFormat === 'hex') {
    if (inFormat === 'decimal') {
      return BigInt(value).toString(16)
    } else {
      return BigInt(vmNumberToBigInt(hexToBin(value))).toString(16)
    }
  }
  if (outFormat === 'vm-number') {
    return inFormat === 'decimal' ? binToHex(bigIntToVmNumber(BigInt(value))) : binToHex(bigIntToVmNumber(BigInt(parseInt(value, 16))))
  }
  return value
}