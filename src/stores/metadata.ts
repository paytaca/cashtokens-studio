import { type IdentitySnapshot } from 'bitauth-libauth-v3';
import { defineStore } from 'pinia'
import { BcmrIndexer } from 'src/apps';

type TokenId = string;

export const useMetadataStore = defineStore('metadataStore', {
  state: (): {
    identitySnapshots?: Record<TokenId, IdentitySnapshot | undefined> 
  } => ({}),
  actions: {
    async resolveIdentitySnapshot(tokenId: TokenId) {
      if (this.identitySnapshots?.[tokenId]) {
        return this.identitySnapshots[tokenId]
      }
      const identitySnapshot = await new BcmrIndexer().fetchIdentitySnapshot(tokenId)
      // Cap identity snapshots to 150, TODO: put this cap on site preference settings
      if (Object.keys(this.identitySnapshots || {}).length > 150) {
        return identitySnapshot
      }
      if (!this.identitySnapshots) {
        this.identitySnapshots = {}
      }
      this.identitySnapshots[tokenId] = identitySnapshot
      return this.identitySnapshots[tokenId]
    }
  }
});


