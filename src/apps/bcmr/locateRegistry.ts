import { ChainGraph } from '../ChainGraph';
import { BcmrIndexer } from '../bcmr/BcmrIndexer';
import { OffChainRegistryIdentity, Registry } from 'mainnet-js';

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
  const pubInfo = await new ChainGraph().retrieveLastRegistryPublication(
    registryIdentity
  );
  if (pubInfo && pubInfo[0]) {
    if (pubInfo[0].httpsUrl) {
      try {
        const r = await fetch(pubInfo[0].httpsUrl);
        if (r.status == 200) {
          const rj = await r.json();
          if (rj) {
            return rj;
          }
        }
      } catch (error) {
        throw new Error(
          `Found registry publication but unable to load from the published URL (${pubInfo[0].httpsUrl}). Verify that the URL exist or try again later`
        );
      }
    }
  }
};
