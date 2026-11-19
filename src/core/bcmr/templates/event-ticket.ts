import { bigIntToVmNumber, binToHex, NftType } from "bitauth-libauth-v3"
import { NftCategoryField, ParsableNftCollection } from "../bcmr-v2.schema"
import { CreateBcmrOptions, createTokenRegistry } from "../registry-helpers"
import { NftTypesMap } from "../bcmr-v2.schema-extra-types"

export const templateId = '1'
// export const bytecode = '00cf547f7c6b547f7c6b527f7c6b527f7c6b527f7c6b76825155a5696b51'
export const bytecode = '00d2517f7c766b81765884637c517f7c816b7c67765484637c527f7cbc816b7c67765284637c527f7cbc816b7c67518463bc816b5167755168'

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
    tier: {
        name: 'Tier',
        description: 'The ticket access tier or pass level (e.g. General Admission, VIP Pass)',
        encoding: { type: 'number' },
    },
    eventTime: {
        name: 'Event Time',
        description: 'The date and time of the event (Unix timestamp)',
        encoding: { type: 'number' },
    },
    price: {
        name: 'Price',
        description: 'The ticket price',
        encoding: { type: 'number' },
    },
    seatMode: {
        name: 'Seating Arrangement',
        description: 'Bitmask indicating which location fields (gate, section, row, seat) are assigned to the ticket',
        encoding: { type: 'number'}
    },
    gate: {
        name: 'Gate',
        description: 'The venue entrance gate (e.g. G2)',
        encoding: { type: 'utf8' },
    },
    section: {
        name: 'Section',
        description: 'The seating section number',
        encoding: { type: 'number' },
    },
    row: {
        name: 'Row',
        description: 'The seating row number',
        encoding: { type: 'number' },
    },
    seat: {
        name: 'Seat',
        description: 'The assigned seat label (e.g. 10B)',
        encoding: { type: 'utf8' },
    },
    
};
  
export function getTicketFields(seatMode: SeatMode): string[] {
    const activeFields = ['tier', 'eventTime', 'price', 'seatMode'];
    if (seatMode & SeatFlag.Gate)    activeFields.push('gate');
    if (seatMode & SeatFlag.Section) activeFields.push('section');
    if (seatMode & SeatFlag.Row)     activeFields.push('row');
    if (seatMode & SeatFlag.Seat)    activeFields.push('seat');
    return activeFields;
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
            type: 1,
            name: 'General admission ticket',
            description: 'General admission ticket, with designated seats or area',
            fields: getTicketFields(SeatMode.None) // Modify as needed
        },
        {
            type: 2,
            name: 'VIP Pass',
            description: 'VIP access ticket',
            fields: getTicketFields(SeatMode.None) // Modify as needed
        }
    ]
)

/**
 * Helper to avoid duplicate type
 */
export function addTier(tiers: TicketTier[], newTier: TicketTier) {
    if((new Set(tiers.map(t => t.type))).has(newTier.type)) {
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