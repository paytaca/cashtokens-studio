import { decodeCashAddress } from '@bitauth/libauth';

export default (address: string) => {
  const result = decodeCashAddress(address);
  if (typeof result === 'string') return false;
  const supportsTokens =
    result.type === 'p2pkhWithTokens' || result.type === 'p2shWithTokens';
  return supportsTokens;
};
