import { TokenCategory, URIs } from "./bcmr/bcmr-v2.schema";

export declare interface PartialBcmr {
    tokenCategory?: TokenCategory,
    tokenUris?: URIs
    resolveTokenCategory(): Promise<undefined|void>
    resolveTokenUris():  Promise<undefined|void>
}