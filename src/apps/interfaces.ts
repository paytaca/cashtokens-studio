import { TokenCategory, URIs } from "mainnet-js";

export declare interface PartialBcmr {
    tokenCategory?: TokenCategory,
    tokenUris?: URIs
    resolveTokenCategory(quite?:boolean): Promise<undefined|void>
    resolveTokenUris(quite?:boolean):  Promise<undefined|void>
}