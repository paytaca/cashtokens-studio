import {
    binToHex,
    binToUtf8,
    decodeAuthenticationInstructions,
    hexToBin,
    type AuthenticationInstructionPush,
} from 'bitauth-libauth-v3'

/** Script prefix of a CHIP-BCMR publication OP_RETURN: `OP_RETURN 'BCMR'`. */
export const BCMR_PREFIX = '6a0442434d52'

export type DecodedBcmrOpReturn = {
    /** Hex of the payload push: the 32-byte content hash, or a bare CID's bytes. */
    contentHash: string,
    /** Raw URI chunks (or the bare CID for IPFS-only publications), unnormalised. */
    uris: string[],
    /** True when the payload itself is a bare IPFS CID rather than a content hash. */
    bareCid: boolean,
}

/**
 * Decode a CHIP-BCMR publication OP_RETURN.
 *
 * Layout: `OP_RETURN push("BCMR") push(<contentHash | bare CID>) [<uri>…]`. Returns `undefined`
 * when the script isn't a BCMR publication. Keep the raw URI chunks here; callers decide whether
 * to show them as-is, normalise them to `ipfs://…`, or resolve an HTTPS gateway.
 */
export function decodeBcmrOpReturn(lockingBytecodeHex: string): DecodedBcmrOpReturn | undefined {
    const lockingBytecode = lockingBytecodeHex.replace('\\x', '')
    if (!lockingBytecode.startsWith(BCMR_PREFIX)) return undefined

    const instructions = decodeAuthenticationInstructions(hexToBin(lockingBytecode))
    const payload = (instructions[2] as AuthenticationInstructionPush | undefined)?.data
    if (!payload) return undefined

    const contentHash = binToHex(payload)

    // `OP_RETURN "BCMR" <bare CID>`: no content hash, no URI chunks.
    if (instructions.length === 3) {
        return { contentHash, uris: [binToUtf8(payload)], bareCid: true }
    }

    const uris = instructions
        .slice(3)
        .map((instruction) => (instruction as AuthenticationInstructionPush | undefined)?.data)
        .filter((data): data is Uint8Array => !!data)
        .map((data) => binToUtf8(data))

    return { contentHash, uris, bareCid: false }
}
