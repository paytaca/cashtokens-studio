import type { NftCategoryField, ParsableNftCollection } from "./bcmr-v2.schema";

export type NftCategoryFieldEncoding = NftCategoryField[string]['encoding'];
export type NftTypesMap = NonNullable<ParsableNftCollection['types']>;

