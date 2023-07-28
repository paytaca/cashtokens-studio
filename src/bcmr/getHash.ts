import { binToHex, sha256, utf8ToBin } from '@bitauth/libauth'

export default (bcmr:string) => {
  return binToHex(sha256.hash(utf8ToBin(bcmr)))
}
