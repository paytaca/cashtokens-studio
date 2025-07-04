import { IdentitySnapshot, NftType, TokenI } from 'mainnet-js';

export type ISODateString =
  `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

const literal = <L extends string>(l: L): L => l;

export const NFTCollectionType = {
  sequential: literal('SequentialNftCollection'),
  parsable: literal('ParsableNftCollection'),
};

export type NFTCollectionType =
  (typeof NFTCollectionType)[keyof typeof NFTCollectionType];

export type BcmrIndexerNftsResponse = Omit<TokenI, 'tokenId'> & {
  category: string;
} & { [key: string]: NftType } & {
  metadata: {
    nft?: NftType;
    token: {
      token: IdentitySnapshot;
      _meta: {
        registry_id: string;
        authbase: string;
        identity_history: ISODateString;
      };
    };
  };
};
