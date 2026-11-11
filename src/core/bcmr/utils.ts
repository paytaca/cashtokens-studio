import { ChainSnapshot, IdentitySnapshot, NftCategory, NftType, ParsableNftCollection, Registry, RegistryTimestampKeyedValues } from "./bcmr-v2.schema";
import { NftCollectionType } from "./enum";
import { CompactRegistry } from "./types";
import { bigIntToVmNumber, flattenBinArray, binToBigIntUintLE, binToHex, isHex, vmNumberToBigInt, hexToBin, utf8ToBin } from "bitauth-libauth-v3";
import type { NftCategoryField } from './bcmr-v2.schema'

/**
 * BCMR declares `decimals` as an integer between `0` and `18`, but registries in the wild (and
 * identities edited through the registry form) can carry it as a numeric string. This parse is
 * deliberately strict: it only returns a value for a real integer or a plain integer string in
 * range, so canonicalization can never invent or corrupt a number.
 */
export function parseBcmrDecimals(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value >= 0 && value <= 18 ? value : undefined
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!/^\d+$/.test(trimmed)) return undefined
        const parsed = Number(trimmed)
        return parsed <= 18 ? parsed : undefined
    }
    return undefined
}

/** Display fallback: a missing or unparseable value is treated as an indivisible amount. */
export function normalizeTokenDecimals(value: unknown): number {
    return parseBcmrDecimals(value) ?? 0
}

/**
 * Returns the snapshot with `token.decimals` coerced to a number when it is a valid BCMR value.
 * Absent or invalid values are left untouched so publication validation can reject them.
 */
export function normalizeIdentitySnapshotDecimals(snapshot: IdentitySnapshot): IdentitySnapshot {
    if (!snapshot.token || snapshot.token.decimals === undefined) return snapshot
    const parsed = parseBcmrDecimals(snapshot.token.decimals)
    return parsed === undefined || parsed === snapshot.token.decimals
        ? snapshot
        : { ...snapshot, token: { ...snapshot.token, decimals: parsed } }
}

function normalizeChainSnapshotDecimals(snapshot: ChainSnapshot): ChainSnapshot {
    if (snapshot.token.decimals === undefined) return snapshot
    const parsed = parseBcmrDecimals(snapshot.token.decimals)
    return parsed === undefined || parsed === snapshot.token.decimals
        ? snapshot
        : { ...snapshot, token: { ...snapshot.token, decimals: parsed } }
}

const mapRecord = <T>(record: Record<string, T>, map: (value: T) => T): Record<string, T> =>
    Object.fromEntries(Object.entries(record).map(([key, value]) => [key, map(value)])) as Record<string, T>

const normalizeIdentityHistory = (history: RegistryTimestampKeyedValues<IdentitySnapshot>) =>
    mapRecord(history, normalizeIdentitySnapshotDecimals)

const normalizeChainHistory = (history: RegistryTimestampKeyedValues<ChainSnapshot>) =>
    mapRecord(history, normalizeChainSnapshotDecimals)

const normalizeIdentities = (identities: Registry['identities']) =>
    identities && mapRecord(identities, normalizeIdentityHistory)

const normalizeChains = (chains: Registry['chains']) =>
    chains && mapRecord(chains, normalizeChainHistory)

/**
 * Coerces `token.decimals` to a number across every snapshot in a registry: identity histories,
 * chain histories, and any locale overrides. Absent or invalid values are preserved as-is.
 */
export function normalizeRegistryDecimals(registry: Registry): Registry {
    const locales = registry.locales && mapRecord(registry.locales, locale => ({
        ...locale,
        identities: normalizeIdentities(locale.identities),
        chains: normalizeChains(locale.chains),
    }))

    return {
        ...registry,
        identities: normalizeIdentities(registry.identities),
        chains: normalizeChains(registry.chains),
        locales,
    }
}

export function setNftUnrevealedCtsExtension(nft: NftType) {
    nft.extensions = {
        ...nft.extensions,
        cts: { u: '1' }
    }
}

export function setAuthguardExtension(registry: Registry, authkeyNftCategory: string) {
    registry.extensions = {
        ...registry.extensions,
        tokenStandard: 'Authguard',
        authNft: authkeyNftCategory
    }
}

export function extractNftTypeKeys(identitySnapshot: IdentitySnapshot) {
    return Object.keys(identitySnapshot.token?.nfts?.parse?.types || {})
}

export function extractTokenCategories(registry: Registry) {
    const tokenCategories = []
    for (const authbase of Object.keys(registry.identities || {})) {
      for (const timestamp of Object.keys(registry.identities?.[authbase] || {})) {
        const category = registry.identities?.[authbase]?.[timestamp]?.token?.category
        if (category) {
          tokenCategories.push(`${category}:${authbase}:${timestamp}`)
        }
      }
    }
    return tokenCategories
  }

export function getNftCollectionType(identitySnapshot: IdentitySnapshot): NftCollectionType {
  return (identitySnapshot.token?.nfts?.parse as ParsableNftCollection)?.bytecode ? NftCollectionType.parsable: NftCollectionType.sequential 
}

/**
 * Resolve an on-chain NFT commitment to its metadata in the registry.
 *
 * Sequential collections index types by the full commitment, so the lookup is exact. Parsable
 * collections index types by the bottom altstack item, which commonly appears as a prefix of the
 * commitment (split-byte parsing bytecode), so the longest matching prefix is used as a fallback.
 */
export function resolveNftType(
    nftCategory: NftCategory | null | undefined,
    commitment: string
): NftType | undefined {
    const types = nftCategory?.parse?.types
    if (!types) return undefined

    const normalizedCommitment = commitment.toLowerCase()
    const directMatch = Object.entries(types).find(([key]) => key.toLowerCase() === normalizedCommitment)
    if (directMatch) return directMatch[1]

    const isParsable = !!(nftCategory?.parse as ParsableNftCollection | undefined)?.bytecode
    if (!isParsable) return undefined

    let bestMatch: NftType | undefined
    let bestLength = -1
    for (const [key, nftType] of Object.entries(types)) {
        const normalizedKey = key.toLowerCase()
        if (!normalizedKey || normalizedKey.length <= bestLength) continue
        if (normalizedCommitment.startsWith(normalizedKey)) {
            bestMatch = nftType
            bestLength = normalizedKey.length
        }
    }
    return bestMatch
}

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
// export async function parseRegistry(registry: Blob, compact: boolean = true): Promise<Registry> {
//     const text = await registry.text()
//     const parsedRegistry = JSON.parse(text)
//     if (!parsedRegistry.identities) return parsedRegistry
//     if (!compact) return parsedRegistry

//     const identities = Object.keys(parsedRegistry.identities)
//     const identitiesMap = identities.reduce((acc: { [authbase: string]: string[] }, authbase: string) => {
//       acc[authbase] = Object.keys(parsedRegistry.identities[authbase] || {}).sort((a, b) => b.localeCompare(a))
//       return acc
//     }, {} as { [authbase: string]: string[] }) as { [authbase: string]: string[] }

//     return {
//       ...parsedRegistry,
//       identities: identitiesMap
//     } 
//   }

  export async function parseRegistryBlob(registry: Blob|File): Promise<Registry> {
    const text = await registry.text()
    const parsedRegistry = JSON.parse(text)
    return parsedRegistry
  }

  export function compactRegistry(registry: Registry): CompactRegistry {
    if (!registry.identities) return registry  as CompactRegistry
    const parsedRegistry = JSON.parse(JSON.stringify(registry))
    const identities = Object.keys(parsedRegistry.identities)
    const identitiesMap = identities.reduce((acc: { [authbase: string]: string[] }, authbase: string) => {
      acc[authbase] = Object.keys(parsedRegistry.identities[authbase] || {}).sort((a, b) => b.localeCompare(a))
      return acc
    }, {} as { [authbase: string]: string[] }) as { [authbase: string]: string[] }

    return {
      ...parsedRegistry,
      identities: identitiesMap
    } as CompactRegistry
  }

export function sortNftTypeKeys(params: { keys: string[], order?: 'asc'|'desc', collectionType: NftCollectionType}): string[] {
    const { keys, collectionType, order = 'desc' } = params
    return [...keys].sort((a, b) => { 
      if (collectionType === NftCollectionType.sequential) {
        const valA = vmNumberToBigInt(hexToBin(a))
        const valB = vmNumberToBigInt(hexToBin(b))
        if (valA === valB) return 0
        if (order === 'asc') {
          return valA < valB ? -1 : 1
        }
        return valA > valB ? -1 : 1
      }
      return order === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
    })
}

export function createNftTypeTemplate(params: {commitmentOrBottomAltStackHex: string, tokenSymbol?: string, collectionType?: NftCollectionType }): NftType {

  const nft: NftType = {
    description: '',
    name: '',
    uris: {
      icon: '',
      asset: '',
      web: ''
    },
    extensions: {}
  }

  nft.name = `${params.tokenSymbol || 'Unknown NFT' }`

  if (!params.collectionType || (params.collectionType === NftCollectionType.sequential && params.commitmentOrBottomAltStackHex)) {
    nft.name = nft.name + ` #${binToBigIntUintLE(hexToBin(params.commitmentOrBottomAltStackHex))}`
  }

  if (params.collectionType === NftCollectionType.parsable) {
    nft.name = nft.name +  `<0x${params.commitmentOrBottomAltStackHex}>`
    nft.fields = []
  }

  return nft
}

export function commitmentToSequenceNumber(commitment: string) {
  return vmNumberToBigInt(hexToBin(commitment))
}

export function sequenceNumberToCommitment(sequenceNumber: string|bigint|number) {
  return binToHex(bigIntToVmNumber(BigInt(sequenceNumber)))
}


export type NftFieldDefinition = NftCategoryField[string]

export type NftFieldEncodeResult =
  | { success: true; data: Uint8Array }
  | { success: false; error: string }

export type NftCommitmentResult =
  | { success: true; data: { bytes: Uint8Array; fieldIds: string[] } }
  | { success: false; error: string }

const success = (data: Uint8Array): NftFieldEncodeResult => ({ success: true, data })
const failure = (error: string): NftFieldEncodeResult => ({ success: false, error })

const normalizeHex = (value: string) =>
  value.trim().replace(/^0x/i, '').replace(/\s+/g, '').toLowerCase()

const encodeNumber = (rawValue: string, decimals: number): NftFieldEncodeResult => {
  const value = rawValue.trim()
  if (!/^\d+(\.\d+)?$/.test(value)) return failure('Must be a non-negative number')

  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > decimals) {
    return failure(`Maximum of ${decimals} decimal place(s) allowed`)
  }

  const scaled = BigInt(`${whole}${fraction.padEnd(decimals, '0')}`)
  return success(bigIntToVmNumber(scaled))
}

const encodeLocktime = (rawValue: string): NftFieldEncodeResult => {
  const value = rawValue.trim()
  if (!/^\d+$/.test(value)) return failure('Must be a whole number')

  const locktime = BigInt(value)
  if (locktime > 4294967295n) return failure('Must be between 0 and 4294967295')
  return success(bigIntToVmNumber(locktime))
}

const encodeBinary = (rawValue: string): NftFieldEncodeResult => {
  const value = rawValue.trim().replace(/^0b/i, '').replace(/\s+/g, '')
  if (!/^[01]+$/.test(value)) return failure('Must contain only 0 and 1')

  const padded = value.padStart(Math.ceil(value.length / 8) * 8, '0')
  const bytes = new Uint8Array(padded.length / 8)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(padded.slice(index * 8, index * 8 + 8), 2)
  }
  return success(bytes)
}

const booleanBytes: { [value: string]: number } = { true: 1, '1': 1, false: 0, '0': 0 }

const encodeBoolean = (rawValue: string): NftFieldEncodeResult => {
  const byte = booleanBytes[rawValue.trim().toLowerCase()]
  return byte === undefined ? failure('Must be true or false') : success(Uint8Array.from([byte]))
}

const encodeHttpsUrl = (rawValue: string): NftFieldEncodeResult => {
  const value = rawValue.trim().replace(/^https:\/\//i, '')
  if (!value) return failure('Must be an https URL')
  return success(utf8ToBin(encodeURI(value)))
}

const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const base32Alphabet = 'abcdefghijklmnopqrstuvwxyz234567'

const decodeBase58 = (encoded: string): NftFieldEncodeResult => {
  let value = 0n
  for (const character of encoded) {
    const index = base58Alphabet.indexOf(character)
    if (index === -1) return failure('Invalid base58 CID')
    value = value * 58n + BigInt(index)
  }

  const leadingZeros = encoded.match(/^1*/)?.[0].length ?? 0
  const rawHex = value === 0n ? '' : value.toString(16)
  const hex = rawHex.length % 2 === 0 ? rawHex : `0${rawHex}`
  const bytes = new Uint8Array([...new Uint8Array(leadingZeros), ...hexToBin(hex)])
  return success(bytes)
}

const decodeBase32 = (encoded: string): NftFieldEncodeResult => {
  const cleaned = encoded.replace(/=+$/, '').toLowerCase()
  let buffer = 0
  let bitCount = 0
  const bytes: number[] = []

  for (const character of cleaned) {
    const index = base32Alphabet.indexOf(character)
    if (index === -1) return failure('Invalid base32 CID')
    buffer = (buffer << 5) | index
    bitCount += 5
    if (bitCount >= 8) {
      bitCount -= 8
      bytes.push((buffer >>> bitCount) & 0xff)
    }
  }

  return success(Uint8Array.from(bytes))
}

const decodeIpfsCid = (rawValue: string): NftFieldEncodeResult => {
  const value = rawValue.trim()
  if (value.startsWith('Qm')) return decodeBase58(value)
  if (value.startsWith('b')) return decodeBase32(value.slice(1))
  if (value.startsWith('B')) return decodeBase32(value.slice(1))
  if (value.startsWith('z')) return decodeBase58(value.slice(1))
  if (value.startsWith('f') || value.startsWith('F')) {
    const hex = normalizeHex(value.slice(1))
    return isHex(hex) ? success(hexToBin(hex)) : failure('Invalid hex CID')
  }
  return failure('Only base58 (Qm…) and base32 (b…) CIDs are supported')
}

/**
 * Encode a human-readable field value into the bytes expected on the NFT parsing altstack,
 * following the `encoding` definition of the field in the BCMR identity snapshot.
 */
export const encodeNftFieldValue = (
  definition: NftFieldDefinition,
  rawValue: string
): NftFieldEncodeResult => {
  switch (definition.encoding.type) {
    case 'number':
      return encodeNumber(rawValue, definition.encoding.decimals ?? 0)
    case 'locktime':
      return encodeLocktime(rawValue)
    case 'utf8':
      return success(utf8ToBin(rawValue))
    case 'hex': {
      const value = normalizeHex(rawValue)
      return isHex(value) ? success(hexToBin(value)) : failure('Must be an even-length hex string')
    }
    case 'binary':
      return encodeBinary(rawValue)
    case 'boolean':
      return encodeBoolean(rawValue)
    case 'https-url':
      return encodeHttpsUrl(rawValue)
    case 'ipfs-cid':
      return decodeIpfsCid(rawValue)
    default:
      return failure(`Unsupported encoding type: ${(definition.encoding as { type: string }).type}`)
  }
}

/**
 * Build an NFT commitment by concatenating the encoded values of the collection's fields, in
 * declaration order. Blank values are omitted from the commitment.
 */
export const encodeNftCommitmentFromFields = (params: {
  fields: [string, NftFieldDefinition][]
  values: { [identifier: string]: string }
}): NftCommitmentResult => {
  const chunks: Uint8Array[] = []
  const fieldIds: string[] = []

  for (const [identifier, definition] of params.fields) {
    const value = params.values[identifier] ?? ''
    if (value.trim() === '') continue

    const encoded = encodeNftFieldValue(definition, value)
    if (!encoded.success) {
      return { success: false, error: `${definition.name || identifier}: ${encoded.error}` }
    }

    chunks.push(encoded.data)
    fieldIds.push(identifier)
  }

  return { success: true, data: { bytes: flattenBinArray(chunks), fieldIds } }
}
