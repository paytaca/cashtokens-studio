import { NFTCollectionType } from "src/apps/bcmr/types";
import { IdentitySnapshot, NftType, Registry } from "./bcmr-v2.schema";
import { NftCollectionType } from "./enum";
import { CompactRegistry } from "./types";
import { hexToBin } from "bitauth-libauth-v3";
import { binToBigIntUintLE } from "@bitauth/libauth";

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
    console.log('extracting nft types', identitySnapshot)
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
    const o = order === 'desc' ? -1 : 1
    return keys.sort((a, b) => { 
      if (collectionType === NftCollectionType.sequential) {
        const aBytes = a.match(/.{1,2}/g) || []
        const bBytes = b.match(/.{1,2}/g) || []
        const aRev = aBytes.reverse().join('')
        const bRev = bBytes.reverse().join('')
        const aInt = BigInt('0x' + aRev)
        const bInt = BigInt('0x' + bRev)
        if (aInt < bInt) return -1 * o
        if (aInt > bInt) return 1 * o
        return 0
      }
      return a.localeCompare(b) * o
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
    nft.name = nft.name + `#${binToBigIntUintLE(hexToBin(params.commitmentOrBottomAltStackHex))}`
  }

  if (params.collectionType === NftCollectionType.parsable) {
    nft.name = nft.name +  `<0x${params.commitmentOrBottomAltStackHex}>`
    nft.fields = []
  }

  return nft
}