import { binToHex, sha256, utf8ToBin } from '@bitauth/libauth'

export const fetchBcmr = async (url: string):Promise<string|undefined> => {
  try {
    const r = await fetch(url)
    return await r.json()
  } catch (error) {
    console.log(`Error fetching BCMR from ${url}`)
  }
}

export const getHash = (bcmr:string) => {
  return binToHex(sha256.hash(utf8ToBin(bcmr)))
}

export const fetchBcmrContentHash = async (url: string): Promise<string|void> => {
  try {
    const r:string|undefined = await fetchBcmr(url)
    if(r) {
      return getHash(r)
    }
  } catch (error) {
    console.log(`Error fetching BCMR from ${url}`)
  }
}
