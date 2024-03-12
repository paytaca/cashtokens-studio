export type ISODateString =
  `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

const literal = <L extends string>(l: L): L => l;

export const NFTCollectionType = {
  sequential: literal('sequential'),
  parsable: literal('parsable'),
};

export type NFTCollectionType =
  (typeof NFTCollectionType)[keyof typeof NFTCollectionType];
