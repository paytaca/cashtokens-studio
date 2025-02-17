import { NftType } from 'mainnet-js';
import formatCommitment from './formatCommitment';

// export default (
//   a: [string | number, NftType],
//   b: [string | number, NftType]
// ) => {
//   let aa: string | number = 0;
//   let bb: string | number = 0;

//   if (a[0] != '' && a[0] != 80) {
//     aa = formatCommitment(a[0] as string, 'vm-number', 'decimal');
//   }
//   if (b[0] != '' && b[0] != 80) {
//     bb = formatCommitment(b[0] as string, 'vm-number', 'decimal');
//   }
//   // if (a[0] == '') {
//   //     aa = 0
//   // }

//   if (a[0] == 80) {
//     aa = -0;
//   }

//   // if (b[0] == '') {
//   //     bb == 0
//   // }

//   if (b[0] == 80) {
//     bb = -0;
//   }

//   if (BigInt(aa) > BigInt(bb)) return 1;
//   if (BigInt(aa) < BigInt(bb)) return -1;

//   return 0;
// };

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
