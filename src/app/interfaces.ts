import { TokenCategory, URIs } from "./bcmr/bcmr-v2.schema";

export declare interface PartialBcmr {
    tokenCategory?: TokenCategory,
    tokenUris?: URIs
    resolveTokenCategory(quite?:boolean): Promise<undefined|void>
    resolveTokenUris(quite?:boolean):  Promise<undefined|void>
}