import { NftType, Registry } from "./bcmr-v2.schema";


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