import { binToHex } from "bitauth-libauth-v3"
import { NftType } from "../../bcmr/bcmr-v2.schema"
import { decodeField, parseNftState } from "../../bcmr/parsable-nft-helpers"
import { bytecode, fields, SeatMode, tiers, tiersToNftTypes, type TicketTier } from "./template"

/** An event ticket decoded from an NFT commitment. */
export type EventTicket = {
    /** Hex of the bottom altstack item: the tier's key in the collection's `types` map. */
    typeKey: string
    /** Metadata of the matched tier. */
    type: NftType
    /** Event start time, in seconds since the Unix epoch. */
    eventTime: bigint
    /** Bitmask describing which location segments the ticket carries. */
    seatMode: SeatMode
    /** Location string, e.g. `g1-s123-r12-x10B`; empty when the ticket has no assigned place. */
    seat: string
}

export type EventTicketParseResult =
    | { success: true; ticket: EventTicket }
    | { success: false; error: string }

/**
 * Decodes an event ticket commitment by running the template's {@link bytecode} and mapping
 * the resulting altstack onto the tier's `fields`, in the same order a BCMR client would.
 *
 * @param commitment - the NFT commitment bytes
 * @param ticketTypes - tiers to resolve the commitment against, defaults to {@link tiers}
 */
export function parseEventTicket(
    commitment: Uint8Array,
    ticketTypes: TicketTier[] = tiers
): EventTicketParseResult {
    const { alternateStack, error } = parseNftState(
        {
            lockingBytecode: new Uint8Array(),
            valueSatoshis: BigInt(0),
            token: {
                amount: BigInt(0),
                category: new Uint8Array(32),
                nft: { capability: 'none', commitment },
            },
        },
        bytecode
    )

    if (error !== undefined) {
        return { success: false, error: `Event ticket parse failed: ${error}` }
    }

    const [bottom, ...values] = alternateStack
    if (!bottom) {
        return { success: false, error: 'Parse bytecode left no type on the altstack' }
    }

    const typeKey = binToHex(bottom)
    const type = tiersToNftTypes(ticketTypes)[typeKey]
    if (!type) {
        return { success: false, error: `Unknown event ticket tier: ${typeKey}` }
    }

    const decoded: { [identifier: string]: unknown } = {}
    for (const [index, identifier] of (type.fields ?? []).entries()) {
        const encoding = fields[identifier]?.encoding
        const value = values[index]
        if (!encoding || !value) {
            return { success: false, error: `Malformed commitment: missing ${identifier}` }
        }
        decoded[identifier] = decodeField({ value, nftCategoryFieldEncoding: encoding })
    }

    return {
        success: true,
        ticket: {
            typeKey,
            type,
            eventTime: decoded.eventTime as bigint,
            seatMode: Number(decoded.seatMode) as SeatMode,
            seat: decoded.seat as string,
        },
    }
}
