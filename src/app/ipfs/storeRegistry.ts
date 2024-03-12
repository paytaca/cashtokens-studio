import { Bcmr } from "../bcmr"
import { BcmrStorageArtifact } from "./interfaces"

/**
 * Stores this registry to the ipfs server. 
 */
export const storeRegistry = async (bcmr: Bcmr): Promise<BcmrStorageArtifact|undefined> => {
  try {
    const resp = await fetch('/api/tokens/registry/storage', {
      method: 'POST', body: bcmr.getContent(),
      headers: { 'Content-Type': 'application/json' }
    })
    if (resp.status >= 400) {
      throw new Error('Error, storing registry in IPFS, please try again later.')
    }
    const respJson = await resp.json()
    return respJson.artifact
  } catch (error: any) {
    console.log(error)
    throw new Error(error?.message || error.toString()) 
  } 
}