import { describe, expect, it } from 'vitest'
import { bigIntToVmNumber, binToHex, hexToBin, utf8ToBin } from 'bitauth-libauth-v3'
import { parseNft } from './parsable-nft-helpers'
import {
    bytecode,
    getTicketFields,
    parseEventTicket,
    SeatMode,
    TicketTierType,
    tiers,
    tiersToNftTypes,
    type TicketTier,
} from '../protocols/cashpass'

/** What a user picks in the UI; the commitment stores it as a 6-byte big-endian Unix time. */
const EVENT_DATE = new Date('2024-05-28T14:56:32Z')
const EVENT_TIME = Math.floor(EVENT_DATE.getTime() / 1000)

/** Location strings as they appear in the commitment: gate, section, row, seat. */
const VIP_SEAT = 'g1-s123-r12-x10B'
const SEAT_ONLY = 'x10B'

/** A tier deliberately outside {@link TicketTierType}, to cover keys above one byte. */
const UNREGISTERED_TIER = 42
const TIER_ABOVE_BYTE_RANGE = 200

const CATEGORY_HEX = '00'.repeat(32)

type Ticket = {
    tier: TicketTierType | number
    eventTime: number
    seatMode: SeatMode
    seat?: string
}

/** Left-pads the big-endian hex form of a value to the field's fixed width. */
const hex = (value: number, bytes: number): string => value.toString(16).padStart(bytes * 2, '0')

/** What the altstack holds for a `number` field: a minimal little-endian VM number. */
const vmNumberHex = (value: number): string => binToHex(bigIntToVmNumber(BigInt(value)))

/** Builds a commitment following the event ticket template layout. */
const commitmentOf = ({ tier, eventTime, seatMode, seat = '' }: Ticket): string =>
    `${hex(tier, 1)}${hex(eventTime, 6)}${hex(seatMode, 1)}${binToHex(utf8ToBin(seat))}`

const nftOutput = (commitmentHex: string) => ({
    lockingBytecode: new Uint8Array(),
    valueSatoshis: 0n,
    token: {
        amount: 0n,
        category: hexToBin(CATEGORY_HEX),
        nft: { capability: 'none' as const, commitment: hexToBin(commitmentHex) },
    },
})

const commitmentBytes = (ticket: Ticket) => hexToBin(commitmentOf(ticket))

const tierAboveByteRange: TicketTier = {
    type: TIER_ABOVE_BYTE_RANGE,
    name: 'Tier above the one-byte signed range',
    description: 'Covers type keys that need a second VM number byte',
    fields: getTicketFields(),
}

describe('parseNft with the event ticket template', () => {
    it('leaves the tier at the bottom of the altstack followed by the field values', () => {
        const altstack = parseNft(
            nftOutput(
                commitmentOf({
                    tier: TicketTierType.VIP,
                    eventTime: EVENT_TIME,
                    seatMode: SeatMode.GateSectionRowSeat,
                    seat: VIP_SEAT,
                })
            ),
            bytecode
        )

        expect(altstack.map(binToHex)).toEqual([
            vmNumberHex(TicketTierType.VIP),
            vmNumberHex(EVENT_TIME),
            vmNumberHex(SeatMode.GateSectionRowSeat),
            binToHex(utf8ToBin(VIP_SEAT)),
        ])
    })

    it('leaves empty items for the seat fields when there is no seating arrangement', () => {
        const altstack = parseNft(
            nftOutput(
                commitmentOf({
                    tier: TicketTierType.General,
                    eventTime: EVENT_TIME,
                    seatMode: SeatMode.None,
                })
            ),
            bytecode
        )

        expect(altstack.map(binToHex)).toEqual([
            vmNumberHex(TicketTierType.General),
            vmNumberHex(EVENT_TIME),
            '',
            '',
        ])
    })
})

describe('parseEventTicket', () => {
    it('maps the altstack onto the fields of the matching NftType', () => {
        const result = parseEventTicket(
            commitmentBytes({
                tier: TicketTierType.VIP,
                eventTime: EVENT_TIME,
                seatMode: SeatMode.GateSectionRowSeat,
                seat: VIP_SEAT,
            })
        )

        expect(result.success).toBe(true)
        if (!result.success) return

        const { typeKey, type, eventTime, seatMode, seat } = result.ticket
        expect(typeKey).toBe(vmNumberHex(TicketTierType.VIP))
        expect(type.name).toBe('VIP Pass')
        expect(type.fields).toEqual(getTicketFields())
        expect(eventTime).toBe(BigInt(EVENT_TIME))
        expect(seatMode).toBe(SeatMode.GateSectionRowSeat)
        expect(seat).toBe(VIP_SEAT)
    })

    it('parses a ticket with no seating arrangement', () => {
        const result = parseEventTicket(
            commitmentBytes({
                tier: TicketTierType.General,
                eventTime: EVENT_TIME,
                seatMode: SeatMode.None,
            })
        )

        expect(result.success && result.ticket.type.name).toBe('General admission ticket')
        expect(result.success && result.ticket.eventTime).toBe(BigInt(EVENT_TIME))
        expect(result.success && result.ticket.seatMode).toBe(SeatMode.None)
        expect(result.success && result.ticket.seat).toBe('')
    })

    it('ignores trailing bytes when seatMode is 0', () => {
        const result = parseEventTicket(
            commitmentBytes({
                tier: TicketTierType.General,
                eventTime: EVENT_TIME,
                seatMode: SeatMode.None,
                seat: 'g1-s1',
            })
        )

        expect(result.success && result.ticket.seat).toBe('')
    })

    it('parses a seat-only ticket', () => {
        const result = parseEventTicket(
            commitmentBytes({
                tier: TicketTierType.General,
                eventTime: EVENT_TIME,
                seatMode: SeatMode.SeatOnly,
                seat: SEAT_ONLY,
            })
        )

        expect(result.success && result.ticket.seatMode).toBe(SeatMode.SeatOnly)
        expect(result.success && result.ticket.seat).toBe(SEAT_ONLY)
    })

    it('resolves tiers above 127 to their canonical VM number type key', () => {
        const result = parseEventTicket(
            commitmentBytes({
                tier: TIER_ABOVE_BYTE_RANGE,
                eventTime: EVENT_TIME,
                seatMode: SeatMode.GateSection,
                seat: 'g1-s123',
            }),
            [...tiers, tierAboveByteRange]
        )

        expect(result.success && result.ticket.typeKey).toBe(vmNumberHex(TIER_ABOVE_BYTE_RANGE))
        expect(result.success && result.ticket.type.name).toBe(tierAboveByteRange.name)
        expect(result.success && result.ticket.seat).toBe('g1-s123')
    })

    it('reports tiers that are not part of the collection', () => {
        const result = parseEventTicket(
            commitmentBytes({
                tier: UNREGISTERED_TIER,
                eventTime: EVENT_TIME,
                seatMode: SeatMode.None,
            })
        )

        expect(result).toEqual({
            success: false,
            error: `Unknown event ticket tier: ${vmNumberHex(UNREGISTERED_TIER)}`,
        })
    })

    it('reports commitments shorter than the fixed header', () => {
        const truncated = commitmentBytes({
            tier: TicketTierType.General,
            eventTime: EVENT_TIME,
            seatMode: SeatMode.None,
        }).slice(0, 7)

        const result = parseEventTicket(truncated)

        expect(result.success).toBe(false)
        expect(!result.success && result.error).toMatch(/^Event ticket parse failed/)
    })

    it('parses a location string that fills the 128-byte commitment limit', () => {
        const longSeat = `g1-s1-r1-x${'A'.repeat(110)}` // 120 bytes of text + 8-byte header
        const commitment = commitmentBytes({
            tier: TicketTierType.VIP,
            eventTime: EVENT_TIME,
            seatMode: SeatMode.GateSectionRowSeat,
            seat: longSeat,
        })

        expect(commitment).toHaveLength(128)

        const result = parseEventTicket(commitment)

        expect(result.success && result.ticket.seat).toBe(longSeat)
    })

    it('registers every default tier under the altstack key the bytecode produces', () => {
        const types = tiersToNftTypes(tiers)

        for (const tier of tiers) {
            const result = parseEventTicket(
                commitmentBytes({
                    tier: tier.type,
                    eventTime: EVENT_TIME,
                    seatMode: SeatMode.None,
                })
            )
            const typeKey = vmNumberHex(tier.type)

            expect(result.success && result.ticket.typeKey).toBe(typeKey)
            expect(types[typeKey]?.name).toBe(tier.name)
            expect(tier.fields).toEqual(getTicketFields())
        }
    })
})
