import { BcmrIndexer } from '../bcmr/BcmrIndexer';
import { fetchLastRegistryPublication } from 'src/core/chaingraph';
import { fetchFile as fetchFileFromIpfs } from '../ipfs/fetchFile';
import { extractCidAndPathFromUrl } from '../ipfs';
import { importMetadataRegistry, type MetadataRegistry } from 'bitauth-libauth-v3';
import type { OffChainRegistryIdentity, Registry } from 'src/core/bcmr/bcmr-v2.schema'
// import { extractCidAndPathFromUrl } from '../ipfs';

/**
 * Look for the last published registry of the provided authbase.
 *
 * @param { string } registryIdentity The OffChainRegistryIdentity or authbase
 */
export const locateRegistry = async (
  registryIdentity: OffChainRegistryIdentity | string
): Promise<Registry | undefined> => {

  if (typeof registryIdentity == 'object') return; // Not Yet Supported, use the dns resolution
  
  const r = await new BcmrIndexer().fetchRegistry(registryIdentity, true);
  
  if (r) {
    return r;
  }

  const pub = await fetchLastRegistryPublication({ authbase: registryIdentity });

  if (!pub?.httpsUrl && !pub?.uris?.length) {
    throw new Error(`Unable to locate registry for ${registryIdentity}`)
  }

  let finalUrl = pub.httpsUrl

  if (finalUrl && !/^(ipfs:\/\/)/.test(finalUrl) && !/^(https?:)?\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl
  }

  const { cid } = extractCidAndPathFromUrl(finalUrl)

  let validatedRegistry: MetadataRegistry | string = ''

  const uris = [...(pub.uris || [])]

  if (finalUrl) {
    if (cid) {
      uris.unshift(finalUrl) // Prioritize if httpUrl is an ipfs url or gateway
    } else {
      uris.push(finalUrl)
    }
  }

  for (const uri of uris) {
    let finalUrl = uri
    // Assuming default protocol is https if missing as per BCMR specs
    if (!/^(ipfs:\/\/)/.test(uri) && !/^(https?:)?\/\//i.test(uri)) {
      finalUrl = 'https://' + uri
    }
    const { cid, path } = extractCidAndPathFromUrl(finalUrl)

    if (cid) {
      const response = await fetchFileFromIpfs(cid, path)
      if (response.status == 200) {
        const json =  await response.json();
        if (json) {
          validatedRegistry = importMetadataRegistry(json)
          if (typeof(validatedRegistry) === 'string') {
            continue
          }
          break
        }
      }
    }

    if (!validatedRegistry || typeof(validatedRegistry) === 'string') {
      const response = await fetch(finalUrl);
      if (response.status == 200) {
        const rj = await response.json();
        if (rj) {
          validatedRegistry = importMetadataRegistry(rj)
          if (typeof(validatedRegistry) === 'string') {
            continue
          }
          break
        }
      }
    }
  }

  if (typeof(validatedRegistry) !== 'string') {
    return validatedRegistry as Registry
  }
  
  if (pub?.httpsUrl || uris?.length > 0) {
    throw new Error(
      `Found registry publication but unable to load from the published URL (${pub.httpsUrl}). Verify that the URL exist or try again later`
    )
  }

  throw new Error(`Unable to locate registry for ${registryIdentity}`)
};
