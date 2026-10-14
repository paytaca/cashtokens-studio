export const MAX_VM_NUMBER=9223372036854775807n
export const DEFAULT_TOKEN_VALUE = 1000n
export const DEFAULT_FEE_RATE_SATS_PER_KB = 1000n
/** Worst-case scriptSig size of a P2PKH input (1+73 signature push, 1+33 public key push).
 *  cashscript builds transactions with placeholder unlockers that contribute no bytes, so the
 *  size it reports omits every scriptSig — add this per input when estimating fees, otherwise
 *  the transaction lands under the node's minimum relay rate (1 sat/byte). */
export const P2PKH_UNLOCKING_BYTECODE_BYTESIZE = 108
export const P2PKH_SATOSHI_CHANGE_OUTPUT_BYTESIZE = 34// Assumed bytesize of a p2pkh change output
export const SEQUENCE_NUMBER_DISABLE_VALUE = 4294967295
