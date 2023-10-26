import { bigIntToBinUintLE, binToHex } from "@bitauth/libauth"

/**
 * Converts a intber to hex little endian. 
 */
export default (int: bigint):string => {
  return binToHex(bigIntToBinUintLE(int)) 
}