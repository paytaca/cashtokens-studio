# CashPass

CashPass is an event-ticketing protocol built on Bitcoin Cash CashTokens. Every ticket is an
NFT whose commitment encodes the ticket tier, the event time and the ticket's location in the
venue. Nothing about the ticket is stored off-chain except the usual BCMR metadata registry,
so a ticket can be verified and rendered from the UTXO alone.

This directory implements the CashPass event-ticket template: the commitment layout, the
parsing bytecode, the BCMR registry wiring, and a decoder for reading tickets back.

## Ticket model

- **Tier** — the NFT type. It is the bottom item on the altstack, not a declared field.
- **Price** — carried by the **fungible token amount** of the ticket UTXO, which makes every
  ticket a Mixed CashToken (NFT + amount). The commitment has no price bytes.
- **Identity / metadata** — published through a BCMR registry (`createEventTicketRegistryTemplate`).

## Commitment layout

Since the 2026 network upgrade the NFT commitment limit is **128 bytes** (previously 40), which
leaves up to **120 bytes** of location text.

| Bytes | Field | Encoding |
| --- | --- | --- |
| `0` | `tier` | 1-byte unsigned integer, `1`–`255`. Becomes the NFT type. |
| `1`–`6` | `eventTime` | 6-byte **big-endian** Unix timestamp (seconds). |
| `7` | `seatMode` | 1-byte bitmask of the location segments the ticket carries. |
| `8`–`127` | `seat` | UTF-8 location text. Omitted (or ignored) when the ticket has no assigned place. |

Example — a VIP ticket for 2024-05-28T14:56:32Z, seat `g1-s123-r12-x10B`:

```
02 00006655f0a0 0f 67312d733132332d7231322d78313042
│  │             │  └ "g1-s123-r12-x10B"
│  │             └ seatMode 0b1111 (gate, section, row, seat)
│  └ eventTime 0x6655f0a0 = 1716908192
└ tier 2 = VIP
```

### `seatMode` flags

| Flag | Value | Meaning |
| --- | --- | --- |
| `Gate` | `0b1000` | ticket carries a gate |
| `Section` | `0b0100` | ticket carries a section |
| `Row` | `0b0010` | ticket carries a row |
| `Seat` | `0b0001` | ticket carries a seat |

The `SeatMode` enum enumerates the 16 combinations (`None`, `SeatOnly`, … `GateSectionRowSeat`).
The flags are informational: the parser does not cross-check them against the location text.

## Seat text

```
g<gate>-s<section>-r<row>-x<seat>
```

- Fixed order: gate, section, row, seat.
- A segment is omitted when the ticket does not carry that part: `g1-s123`, `x10B`, or empty.
- Segment values are `[A-Za-z0-9]+`. `-` is the separator and must not appear in a value.
- Case is preserved (`x10B` is not `x10b`).
- The whole text is **ignored when `seatMode` is `0`**, so producers may leave stale or padding
  bytes there; the parser discards them and reports an empty seat.

## Parsing bytecode

```
00cf517f7c0051807e816b567f7cbc816b517f7c76816b81636b6775006b68
```

Evaluated by the standard BCMR parsing transaction (`parseNft` / `parseNftState`), it:

1. `OP_0 OP_UTXOTOKENCOMMITMENT` — reads the commitment of input 0, the NFT being parsed.
2. Splits the tier byte, appends `0x00`, and runs `OP_BIN2NUM` so tiers `1`–`255` become
   canonical VM numbers (`128` → `8000`, `200` → `c800`).
3. Splits the 6-byte event time, reverses it and runs `OP_BIN2NUM`, producing the minimal
   little-endian VM number a BCMR client expects for a `number` field.
4. Splits `seatMode` and pushes it as a VM number.
5. If `seatMode != 0`, pushes the remaining bytes as the seat text; if `seatMode == 0`, drops
   them and pushes an empty item.
6. Leaves exactly one truthy item on the main stack.

Resulting altstack, bottom first:

```
[tier, eventTime, seatMode, seat]
```

`tier` is the NFT type key; the rest map positionally onto the type's `fields`.

## BCMR registry

`createEventTicketRegistryTemplate()` fills a registry identity's NFT category with:

- `fields`: `eventTime` (number), `seatMode` (number), `seat` (utf8).
- `parse.bytecode`: the bytecode above.
- `parse.types`: one entry per tier, keyed by the tier's canonical VM number hex.
- `extensions.cashtokensStudio.t`: the template id, `1`.

Default tiers are `TicketTierType.General = 1` and `TicketTierType.VIP = 2`; use `addTier()` to
add more (types are unique and 1-byte). `tiersToNftTypes()` converts them to the `types` map.

## API

```ts
import { parseEventTicket, SeatMode, TicketTierType } from 'src/core/protocols/cashpass'

const result = parseEventTicket(commitmentBytes)

if (result.success) {
    const { typeKey, type, eventTime, seatMode, seat } = result.ticket
    // typeKey: '02', type.name: 'VIP Pass', eventTime: 1716908192n, seatMode: 15, seat: 'g1-s123-r12-x10B'
} else {
    // result.error: parse failure, unknown tier, or malformed commitment
}
```

`parseEventTicket(commitment, ticketTypes = tiers)` accepts a custom tier list when the
collection does not use the defaults. Failures are returned as
`{ success: false, error: string }` rather than thrown.

## Constraints and gotchas

- **128-byte commitment cap** (2026 upgrade) → 120 bytes of location text. Anything longer
  cannot be broadcast.
- **`eventTime` must be positive.** It is stored as raw bytes in the commitment, but the
  altstack value is a signed VM number; a hand-built commitment with the top bit set decodes as
  negative.
- **`seatMode` is informational.** The bytecode does not validate the text against the flags.
- **Trailing bytes are ignored when `seatMode == 0`**, not rejected.
- **Commitments shorter than 8 bytes fail to parse** (the NFT falls back to showing the raw
  commitment).
- **Altstack numbers must be minimal.** The bytecode normalises with `OP_BIN2NUM`, so callers
  should not pre-pad values; `vmNumberToBigInt` rejects non-minimal encodings.
- **`OP_CAT` requires BCH 2025+ rules.** The app evaluates with `createVirtualMachineBch2026`
  (`src/core/bcmr/parsable-nft-helpers.ts`).
- **Tiers `1`–`255`** are supported; keys above `127` use two VM-number bytes (`c800`).

## Contracts

The on-chain side is three CashScript contracts under `contracts/`, all compiled manually
(`pragma cashscript ^0.14.0`). No compiled artifacts are committed.

| Contract | Holds | Purpose |
| --- | --- | --- |
| `CashpassTicketMinter` | Minting NFT + remaining fungible supply | Mints ticket batches to the seller; burns the token at teardown. |
| `CashpassTicketSeller` | Unsold ticket UTXOs | Sells one ticket per purchase, paying the cashier; returns leftovers to the minter. |
| `CashpassCashier` | Sale proceeds | Releases the proceeds to the issuer once the event has ended. |

### Minting

`mint(ownerSig, ownerPubKey, ticketPrice, newMinterCommitment, lastSeatCommitment)` requires:

- the issuer's signature, the minter at input 0, and the minting NFT (`category + 0x02`);
- the mode byte to stay the same, and in assigned-seating mode `newCursor == sha256(lastSeatCommitment)`
  with that seat present in the batch;
- output 0 to keep the minting NFT and the remaining supply at the contract;
- every other output to be a ticket for the seller: plain `ticketCategory`, `tokenAmount == ticketPrice`,
  commitment at least 8 bytes.

There is no batch cap: the contract loops over `tx.outputs`. An optional final tokenless output is
allowed for the issuer's BCH change, so the UI may fund exactly or take change.

### Selling and proceeds

`buy(buyerSig, buyerPubKey)` sends the ticket's fungible amount in satoshis to the cashier
(output 0) and the ticket, unchanged, to the buyer's P2PKH (output 1). The price therefore travels
with the ticket, which lets tiers be priced independently. Any further outputs are the buyer's change.

`CashpassCashier.withdraw(ownerSig, ownerPubKey)` is issuer-only and time-locked to `eventEndTime`;
many cashier UTXOs can be swept into a single owner output.

### Teardown

`teardown()` is callable by anyone 10 days after the event and produces exactly two outputs:
the token (category, commitment and amount) to `burnLockingBytecode`, and the satoshis to the issuer.
It accepts the minting UTXO or a ticket reclaimed from the seller, one input per transaction.

`CashpassTicketSeller.reclaim(ownerSig, ownerPubKey)` is issuer-only: the ticket goes back to the
minter (output 0) and the seller's satoshis to the issuer (output 1). Reclaimed tickets are destroyed
by the same `teardown()` sweep.

## Files

| File | Purpose |
| --- | --- |
| `template.ts` | Commitment layout, bytecode, enums, fields, tiers, registry template. |
| `parser.ts` | `parseEventTicket()` — commitment → `EventTicket` (or a typed error). |
| `index.ts` | Barrel export. |
| `contracts/CashpassTicketMinter.cash` | Minting, cursor tracking, teardown/burn. |
| `contracts/CashpassTicketSeller.cash` | Ticket sales and unsold-ticket reclaim. |
| `contracts/CashpassCashier.cash` | Time-locked withdrawal of sale proceeds. |
| `src/core/bcmr/parsable-nft-helpers-spec.ts` | Vitest coverage of the parsing contract. |
