import { NftType } from 'mainnet-js';
import formatCommitment from './formatCommitment';

/**
 * Usage:
 * const arr = [{8000: <NftType>}, {8100: <NftType>}, ....]
 * arr.sort(softNftTypesASC)
 */
export default (
  a: { [key: string]: any | NftType }, // lazy typing, ignore 'any', pass { [key: string]: NftType }
  b: { [key: string]: any | NftType }
) => {
  let aa: string | number = 0;
  let bb: string | number = 0;

  const nftTypeOfA: unknown = Object.keys(a)[0];
  const nftTypeOfB: unknown = Object.keys(b)[0];

  if (nftTypeOfA != '' && (nftTypeOfA as number) != 80) {
    aa = formatCommitment(nftTypeOfA as string, 'vm-number', 'decimal');
  }
  if (nftTypeOfB != '' && (nftTypeOfB as number) != 80) {
    bb = formatCommitment(nftTypeOfB as string, 'vm-number', 'decimal');
  }

  if (nftTypeOfA == 80) {
    aa = -0;
  }

  if (nftTypeOfB == 80) {
    bb = -0;
  }

  if (BigInt(aa) > BigInt(bb)) return 1;
  if (BigInt(aa) < BigInt(bb)) return -1;

  return 0;
};
