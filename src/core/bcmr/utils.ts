import { NFTCollectionType } from "src/apps/bcmr/types";
import { IdentitySnapshot, NftType, Registry } from "./bcmr-v2.schema";
import { NftCollectionType } from "./enum";
import { CompactRegistry } from "./types";
import { hexToBin } from "bitauth-libauth-v3";
import { binToBigIntUintLE, vmNumberToBigInt } from "@bitauth/libauth";

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
    nft.name = nft.name + `#${binToBigIntUintLE(hexToBin(params.commitmentOrBottomAltStackHex))}`
  }

  if (params.collectionType === NftCollectionType.parsable) {
    nft.name = nft.name +  `<0x${params.commitmentOrBottomAltStackHex}>`
    nft.fields = []
  }

  return nft
}