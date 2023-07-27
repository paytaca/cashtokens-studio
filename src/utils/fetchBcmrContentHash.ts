import { binToHex, sha256, utf8ToBin } from '@bitauth/libauth'
import fetchBcmr from './fetchBcmr'
export default async (url: string): Promise<string|void> => {
  try {
    const r:JSON|undefined = await fetchBcmr(url)
    if(r) {
      return binToHex(sha256.hash(utf8ToBin(JSON.stringify(r))))
    }
  } catch (error) {
    console.log(`Error fetching BCMR from ${url}`)
  }
}
