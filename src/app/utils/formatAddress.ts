import { CashAddressNetworkPrefix, CashAddressType, decodeCashAddress, encodeCashAddress } from '@bitauth/libauth';
export default (address:string): string => {
  if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'development-build') {
    const decoded = decodeCashAddress(address);
    if (typeof decoded === "string") {
      return '';
    }
    const testAddress = encodeCashAddress(CashAddressNetworkPrefix.testnet, CashAddressType.p2pkh, decoded.payload);
    return testAddress;
  }
  return address;
} 