import { binToBigIntUintLE, hexToBin } from "@bitauth/libauth"

export default (hex:string):bigint => {
  return binToBigIntUintLE(hexToBin(hex))
}