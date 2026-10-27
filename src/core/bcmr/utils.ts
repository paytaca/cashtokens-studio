import { ChainSnapshot, IdentitySnapshot, NftType, ParsableNftCollection, Registry, RegistryTimestampKeyedValues } from "./bcmr-v2.schema";
import { NftCollectionType } from "./enum";
import { CompactRegistry } from "./types";
import { hexToBin } from "bitauth-libauth-v3";
import { bigIntToVmNumber, binToBigIntUintLE, binToHex, vmNumberToBigInt } from "bitauth-libauth-v3";

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

