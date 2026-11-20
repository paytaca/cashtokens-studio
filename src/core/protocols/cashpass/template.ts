import { bigIntToVmNumber, binToHex } from "bitauth-libauth-v3"
import { NftCategoryField, ParsableNftCollection } from "../../bcmr/bcmr-v2.schema"
import { CreateBcmrOptions, createTokenRegistry } from "../../bcmr/registry-helpers"
import { NftTypesMap } from "../../bcmr/bcmr-v2.schema-extra-types"

export const templateId = '1'

/**
 * Commitment layout (maximum 128 bytes since the 2026 upgrade, 120 of them for `seat`):
 * - byte 0: `tier`, 1-byte unsigned integer (1-255). It becomes the NFT type, i.e. the
 *   bottom item on the altstack, so `tiersToNftTypes` keys it as a canonical VM number.
 * - bytes 1-6: `eventTime`, 6-byte big-endian Unix timestamp.
 * - byte 7: `seatMode`, 1-byte bitmask (see {@link SeatMode}).
 * - bytes 8-127: `seat`, UTF-8 location text built from gate-section-row-seat segments with
 *   the prefixes `g`, `s`, `r` and `x`, e.g. `g1-s123-r12-x10B`. A segment is omitted when the
 *   ticket doesn't carry that part, and any trailing bytes after `seatMode = 0` are ignored.
 *
 * Parsing leaves the altstack as `[tier, eventTime, seatMode, seat]`; the price is carried by
 * the fungible token amount of each ticket UTXO rather than by the commitment.
 */
export const bytecode = '00cf517f7c0051807e816b567f7cbc816b517f7c76816b81636b6775006b68'

export enum SeatFlag {
    None    = 0b0000, // 0
    Seat    = 0b0001, // 1
    Row     = 0b0010, // 2
    Section = 0b0100, // 4
    Gate    = 0b1000, // 8
}

export enum SeatMode {
    None                 = 0b0000, // 0
    SeatOnly             = 0b0001, // 1
    RowOnly              = 0b0010, // 2
    RowSeat              = 0b0011, // 3
    SectionOnly          = 0b0100, // 4
    SectionSeat          = 0b0101, // 5
    SectionRow           = 0b0110, // 6
    SectionRowSeat       = 0b0111, // 7
    GateOnly             = 0b1000, // 8
    GateSeat             = 0b1001, // 9
    GateRow              = 0b1010, // 10
    GateRowSeat          = 0b1011, // 11
    GateSection          = 0b1100, // 12
    GateSectionSeat      = 0b1101, // 13
    GateSectionRow       = 0b1110, // 14
    GateSectionRowSeat   = 0b1111, // 15
}

export const fields: NftCategoryField = {
    eventTime: {
        name: 'Event Time',
        description: 'The date and time of the event (Unix timestamp)',
        encoding: { type: 'number' },
    },
    seatMode: {
        name: 'Seating Mode',
        description: 'Bitmask indicating which location segments (gate, section, row, seat) the ticket carries',
        encoding: { type: 'number' },
    },
    seat: {
        name: 'Seat',
        description: 'Ticket location as gate-section-row-seat segments with the prefixes g, s, r and x, e.g. "g1-s123-r12-x10B". A segment is omitted when the ticket does not carry that part; trailing bytes are ignored when seatMode is 0.',
        encoding: { type: 'utf8' },
    },
};

/**
 * Altstack field order shared by every tier. The tier is the bottom altstack item (the NFT
 * type), so fields start after it and always keep the same positions.
 */
export function getTicketFields(): string[] {
    return ['eventTime', 'seatMode', 'seat'];
}

export enum TicketTierType {
    General = 1,
    VIP = 2
}

export type TicketTier = {
    /** 1-byte integer (0–255) that maps to the hex key on the bottom of the altstack */
    type: number;
    name: string;
    description: string;
    fields: string[];
}

/**
 * Default tiers helper.
 * Tier type should be 1 byte and becomes the nft type, i.e. the bottomAltStackHex
 */
export const tiers: TicketTier[] = structuredClone(
    [
        {
            type: TicketTierType.General,
            name: 'General admission ticket',
            description: 'General admission ticket, with designated seats or area',
            fields: getTicketFields()
        },
        {
            type: TicketTierType.VIP,
            name: 'VIP Pass',
            description: 'VIP access ticket',
            fields: getTicketFields()
        }
    ]
)

/**
 * Helper to avoid duplicate type
 */
export function addTier(tiers: TicketTier[], newTier: TicketTier) {
    if ((new Set(tiers.map(t => t.type))).has(newTier.type)) {
        throw new Error('Duplicate type')
    }
    tiers.push(newTier)
    return tiers
}

export function tiersToNftTypes(tiers: TicketTier[]): ParsableNftCollection['types'] {
    const types: NftTypesMap = {}
    tiers.forEach((tier: TicketTier) => {
        const { type, ...rest } = tier
        types[binToHex(bigIntToVmNumber(BigInt(type)))] = rest
    })
    return types
}

export function createEventTicketRegistryTemplate(options: CreateBcmrOptions & { tiers: TicketTier[] }) {
    const template = createTokenRegistry(options)
    const timestamp = Object.keys(template.registry.identities![options.authbase]!)[0]!
    if (!template.registry.identities![options.authbase]![timestamp]!.token!.nfts) {
        throw new Error('NftCategory required')
    }
    template.registry.identities![options.authbase]![timestamp]!.token!.nfts!.fields = fields
    const collection = template.registry.identities![options.authbase]![timestamp]!.token!.nfts!.parse as ParsableNftCollection
    collection.bytecode = bytecode
    collection.types = tiersToNftTypes(options.tiers)
    const cashtokensStudio = template.registry.extensions!.cashtokensStudio! as { [key: string]: string; }
    cashtokensStudio.t = templateId
    return template
}
