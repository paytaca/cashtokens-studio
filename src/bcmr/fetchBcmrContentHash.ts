import fetchBcmr from './fetchBcmr'
import getHash from './getHash'
export default async (url: string): Promise<string|void> => {
  try {
    const r:string|undefined = await fetchBcmr(url)
    if(r) {
      return getHash(r)
    }
  } catch (error) {
    console.log(`Error fetching BCMR from ${url}`)
  }
}
